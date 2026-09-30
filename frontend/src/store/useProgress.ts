import { useEffect, useMemo, useState } from 'react'
import { fetchProgress, isConfigured } from '../api/client'
import { mergeProgress } from './merge'
import { absorbServerLogs, flushPractice, unsyncedPracticeDays } from './practice'
import { flushPending, getCachedProgress, getPending, getRejected, setCachedProgress } from './pending'
import type { Progress } from '../api/types'

export type SyncState = 'local' | 'syncing' | 'synced' | 'offline'

export function useProgress() {
  const [server, setServer] = useState<Progress | null>(getCachedProgress)
  const [pending, setPending] = useState(getPending)
  const [rejectedCount, setRejectedCount] = useState(() => getRejected().length)
  const [sync, setSync] = useState<SyncState>(() => (isConfigured() ? 'syncing' : 'local'))
  const [message, setMessage] = useState<string>()
  const [days, setDays] = useState(unsyncedPracticeDays)

  useEffect(() => {
    if (!isConfigured()) return
    let cancelled = false
    ;(async () => {
      setSync('syncing')
      const flushed = await flushPending() // upload first so the fetch below includes it
      if (cancelled) return
      setPending(getPending())
      setRejectedCount(getRejected().length)
      try {
        const fresh = await fetchProgress()
        if (cancelled) return
        setCachedProgress(fresh)
        absorbServerLogs(fresh.practice.logs)
        await flushPractice()
        setDays(unsyncedPracticeDays())
        setServer(fresh)
        setMessage(flushed.error)
        setSync(flushed.remaining === 0 ? 'synced' : 'offline')
      } catch (error) {
        if (cancelled) return
        setMessage(error instanceof Error ? error.message : 'Could not load progress.')
        setSync('offline')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const progress = useMemo(() => mergeProgress(server, pending, undefined, days), [server, pending, days])
  return { progress, sync, message, pendingCount: pending.length, rejectedCount }
}
