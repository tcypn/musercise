import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchPractice, isConfigured, postPractice } from '../api/client'
import type { PracticeEntry } from '../api/types'
import { PRACTICE_ITEMS, type PracticeItem } from '../theory/practice'
import { readJson, writeJson } from './storage'

const KEY = 'musercise.practice.v1'
const KEEP_DAYS = 90

export interface RowLog {
  seconds: number
  done: boolean
}
export type DayLog = Partial<Record<PracticeItem, RowLog>>

interface Store {
  days: Record<string, DayLog>
  /** "YYYY-MM-DD|item" for rows changed here that the server has not confirmed. */
  dirty: string[]
}

const load = (): Store => {
  const stored = readJson<Partial<Store>>(KEY, {})
  return { days: stored.days ?? {}, dirty: stored.dirty ?? [] }
}

const save = (store: Store): void => {
  // Old days are dropped locally; the server keeps them.
  const cutoff = Object.keys(store.days).sort().slice(-KEEP_DAYS)[0]
  const days = Object.fromEntries(Object.entries(store.days).filter(([date]) => !cutoff || date >= cutoff))
  writeJson(KEY, { days, dirty: store.dirty })
}

const isItem = (item: string): item is PracticeItem => (PRACTICE_ITEMS as readonly string[]).includes(item)
const dirtyKey = (date: string, item: string) => `${date}|${item}`
const touched = (log: RowLog | undefined): boolean => !!log && (log.seconds > 0 || log.done)

export const getDay = (date: string): DayLog => load().days[date] ?? {}

/** Sets a row's values (absolute, not added) and queues it for upload. Returns the day. */
export function setEntry(date: string, item: PracticeItem, patch: Partial<RowLog>): DayLog {
  const store = load()
  const day = { ...(store.days[date] ?? {}) }
  day[item] = { seconds: 0, done: false, ...day[item], ...patch }
  store.days[date] = day
  if (!store.dirty.includes(dirtyKey(date, item))) store.dirty.push(dirtyKey(date, item))
  save(store)
  return day
}

/** Folds what the server has into the local copy: most time wins, and done stays done. */
export function absorbServerLogs(logs: readonly PracticeEntry[]): void {
  const store = load()
  for (const row of logs) {
    if (!isItem(row.item)) continue
    const day = { ...(store.days[row.date] ?? {}) }
    const mine = day[row.item] ?? { seconds: 0, done: false }
    const merged = { seconds: Math.max(mine.seconds, row.seconds), done: mine.done || row.done }
    day[row.item] = merged
    store.days[row.date] = day
    // If this device knows more than the server does, send it up.
    if ((merged.seconds !== row.seconds || merged.done !== row.done) && !store.dirty.includes(dirtyKey(row.date, row.item))) {
      store.dirty.push(dirtyKey(row.date, row.item))
    }
  }
  save(store)
}

/** Days with any routine practice on this device, including ones not uploaded yet. */
export function practiceDays(): string[] {
  const { days } = load()
  return Object.keys(days).filter((date) => Object.values(days[date] ?? {}).some(touched)).sort()
}

/** Days changed here that the server has not confirmed: they still count toward the streak. */
export function unsyncedPracticeDays(): string[] {
  const { days, dirty } = load()
  return [...new Set(dirty.map((k) => k.split('|')[0]))].filter((d) => Object.values(days[d] ?? {}).some(touched)).sort()
}

export interface PracticeFlush {
  remaining: number
  error?: string
}

/** Uploads changed rows. Keeps them (and retries later) on any failure, including an older server without this feature. */
async function flushOnce(): Promise<PracticeFlush> {
  const store = load()
  if (store.dirty.length === 0) return { remaining: 0 }
  if (!isConfigured()) return { remaining: store.dirty.length }
  const sending = [...store.dirty]
  const entries: PracticeEntry[] = sending.flatMap((k) => {
    const [date, item] = k.split('|')
    const log = store.days[date]?.[item as PracticeItem]
    return log && isItem(item) ? [{ date, item, seconds: Math.round(log.seconds), done: log.done }] : []
  })
  try {
    if (entries.length > 0) await postPractice(entries)
  } catch (error) {
    // 404/405: the server has not been updated yet. Network errors: offline. Either way, keep everything.
    const message = error instanceof ApiError && (error.status === 404 || error.status === 405)
      ? 'The server has not been updated for the daily routine yet.'
      : error instanceof Error ? error.message : 'Upload failed.'
    return { remaining: store.dirty.length, error: message }
  }
  // Rows edited while the upload was in flight stay queued (their values differ from what was sent).
  const fresh = load()
  const sent = new Map(entries.map((e) => [dirtyKey(e.date, e.item), e]))
  fresh.dirty = fresh.dirty.filter((k) => {
    const e = sent.get(k)
    if (!sending.includes(k)) return true
    if (!e) return false
    const now = fresh.days[e.date]?.[e.item]
    return !!now && (Math.round(now.seconds) !== e.seconds || now.done !== e.done)
  })
  save(fresh)
  return { remaining: fresh.dirty.length }
}

let queue: Promise<unknown> = Promise.resolve()

/** Uploads changed rows, one upload at a time: a second call waits for the first, then sends what is left. */
export function flushPractice(): Promise<PracticeFlush> {
  const next = queue.then(flushOnce, flushOnce)
  queue = next.catch(() => undefined)
  return next
}

/** Pulls the last 60 days from the server into the local copy. Quietly does nothing if there is no server. */
export async function pullPractice(sinceDate: string): Promise<boolean> {
  if (!isConfigured()) return false
  try {
    absorbServerLogs(await fetchPractice(sinceDate))
    return true
  } catch {
    return false // offline, or a server without the daily routine yet
  }
}

/** Today's rows, kept in step with this device's storage and (when connected) the server. */
export function usePracticeDay(date: string) {
  const [day, setDay] = useState<DayLog>(() => getDay(date))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const queueUpload = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flushPractice(), 1500)
  }, [])

  const update = useCallback(
    (item: PracticeItem, patch: Partial<RowLog>) => {
      setDay(setEntry(date, item, patch))
      queueUpload()
    },
    [date, queueUpload],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await flushPractice() // send anything left from earlier, then read what is on the server
      const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10)
      if ((await pullPractice(since)) && !cancelled) setDay(getDay(date))
      await flushPractice()
    })()
    return () => {
      cancelled = true
      clearTimeout(timer.current)
      void flushPractice()
    }
  }, [date])

  return { day, update }
}

/** Total practised seconds on one day, across all rows. */
export function daySeconds(date: string): number {
  return Object.values(getDay(date)).reduce((sum, log) => sum + (log?.seconds ?? 0), 0)
}
