import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeEntry, Progress } from '../api/types'
import { absorbServerLogs, flushPractice, getDay, practiceDays, setEntry, unsyncedPracticeDays } from './practice'
import { emptyProgress, mergeProgress } from './merge'

function fakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const CONNECTED = { 'musercise.settings': JSON.stringify({ apiUrl: 'https://api.test', token: 't' }) }

function respond(...statuses: number[]) {
  const fetchMock = vi.fn()
  statuses.forEach((status) => fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => ({}) }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body).entries as PracticeEntry[]

beforeEach(() => vi.stubGlobal('localStorage', fakeStorage(CONNECTED)))
afterEach(() => vi.unstubAllGlobals())

describe('local practice log', () => {
  it('stores values per day and row, and updates one row without touching the others', () => {
    setEntry('2026-10-01', 'scale', { seconds: 120 })
    setEntry('2026-10-01', 'scale', { done: true })
    setEntry('2026-10-01', 'warmup', { seconds: 30 })
    expect(getDay('2026-10-01')).toEqual({ scale: { seconds: 120, done: true }, warmup: { seconds: 30, done: false } })
    expect(getDay('2026-10-02')).toEqual({})
  })

  it('counts a day only when something was timed or ticked', () => {
    setEntry('2026-10-01', 'scale', { seconds: 0 })
    setEntry('2026-10-02', 'scale', { seconds: 5 })
    setEntry('2026-10-03', 'ear', { done: true })
    expect(practiceDays()).toEqual(['2026-10-02', '2026-10-03'])
    expect(unsyncedPracticeDays()).toEqual(['2026-10-02', '2026-10-03'])
  })

  it('keeps working when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(() => setEntry('2026-10-01', 'scale', { seconds: 1 })).not.toThrow()
    expect(getDay('2026-10-01')).toEqual({})
  })
})

describe('merging with the server', () => {
  it('keeps the most time and never un-ticks a row', () => {
    setEntry('2026-10-01', 'scale', { seconds: 300, done: false })
    absorbServerLogs([{ date: '2026-10-01', item: 'scale', seconds: 120, done: true }])
    expect(getDay('2026-10-01').scale).toEqual({ seconds: 300, done: true })
  })

  it('queues an upload only when this device knows more than the server', () => {
    absorbServerLogs([{ date: '2026-10-01', item: 'scale', seconds: 120, done: true }])
    expect(getDay('2026-10-01').scale).toEqual({ seconds: 120, done: true })
    expect(unsyncedPracticeDays()).toEqual([]) // identical to the server: nothing to send
    setEntry('2026-10-02', 'ear', { seconds: 600 })
    absorbServerLogs([{ date: '2026-10-02', item: 'ear', seconds: 100, done: false }])
    expect(unsyncedPracticeDays()).toEqual(['2026-10-02'])
  })

  it('ignores rows it does not know', () => {
    absorbServerLogs([{ date: '2026-10-01', item: 'juggling' as never, seconds: 5, done: true }])
    expect(getDay('2026-10-01')).toEqual({})
  })
})

describe('uploading', () => {
  it('sends changed rows once and then has nothing left to send', async () => {
    setEntry('2026-10-01', 'scale', { seconds: 90.4, done: true })
    const fetchMock = respond(200)
    expect(await flushPractice()).toEqual({ remaining: 0 })
    expect(bodyOf(fetchMock)).toEqual([{ date: '2026-10-01', item: 'scale', seconds: 90, done: true }])
    expect(unsyncedPracticeDays()).toEqual([])
    const again = respond()
    expect(await flushPractice()).toEqual({ remaining: 0 })
    expect(again).not.toHaveBeenCalled()
  })

  it('keeps everything when the server has no daily routine yet (404) or cannot be reached', async () => {
    setEntry('2026-10-01', 'scale', { seconds: 60 })
    respond(404)
    const notUpdated = await flushPractice()
    expect(notUpdated.remaining).toBe(1)
    expect(notUpdated.error).toMatch(/not been updated/i)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect((await flushPractice()).remaining).toBe(1)
    expect(getDay('2026-10-01').scale?.seconds).toBe(60)
    respond(200)
    expect(await flushPractice()).toEqual({ remaining: 0 }) // and it goes through once the server is ready
  })

  it('keeps a row queued if it changed while the upload was in flight', async () => {
    setEntry('2026-10-01', 'scale', { seconds: 60 })
    const fetchMock = vi.fn().mockImplementation(async () => {
      setEntry('2026-10-01', 'scale', { seconds: 75 }) // the timer ticked during the request
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await flushPractice()).toEqual({ remaining: 1 })
    const next = respond(200)
    expect(await flushPractice()).toEqual({ remaining: 0 })
    expect(bodyOf(next)[0].seconds).toBe(75)
  })

  it('never runs two uploads at once: a second call waits for the first', async () => {
    setEntry('2026-10-01', 'scale', { seconds: 60 })
    let inFlight = 0
    let peak = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 20))
      inFlight--
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    const results = await Promise.all([flushPractice(), flushPractice(), flushPractice()])
    expect(peak).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // the later calls found nothing left to send
    expect(results.map((r) => r.remaining)).toEqual([0, 0, 0])
  })

  it('does not try to upload with no server set up', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    setEntry('2026-10-01', 'scale', { seconds: 60 })
    const fetchMock = respond()
    expect(await flushPractice()).toEqual({ remaining: 1 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('streak with routine practice', () => {
  const NOW = new Date('2026-10-03T12:00:00Z')
  const server = (): Progress => ({
    ...emptyProgress(),
    totals: { sessions: 1, questions: 20, correct: 18, practice_seconds: 300, streak_days: 2, last_practiced: '2026-10-01T09:00:00Z', last_practice_day: '2026-10-02' },
  })

  it('continues a streak the server counted, using its last practice day (not the last session)', () => {
    const merged = mergeProgress(server(), [], NOW, ['2026-10-03'])
    expect(merged.totals.streak_days).toBe(3) // 10-01, 10-02 from the server, 10-03 from this device
    expect(merged.totals.last_practice_day).toBe('2026-10-03')
  })

  it('starts a new streak of 1 after a gap', () => {
    // Practised on the 5th, but nothing on the 3rd or 4th: the streak starts again.
    expect(mergeProgress(server(), [], new Date('2026-10-05T12:00:00Z'), ['2026-10-05']).totals.streak_days).toBe(1)
  })

  it('does nothing when there is nothing extra', () => {
    const s = server()
    expect(mergeProgress(s, [], NOW, [])).toBe(s)
  })

  it('works with an older server that only reports the last session', () => {
    const old = server()
    delete old.totals.last_practice_day
    old.totals.last_practiced = '2026-10-02T20:00:00Z'
    expect(mergeProgress(old, [], NOW, ['2026-10-03']).totals.streak_days).toBe(3)
  })
})
