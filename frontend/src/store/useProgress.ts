import { useEffect, useMemo, useState } from 'react'
import { fetchProgress, isConfigured } from '../api/client'
import type { Progress } from '../api/types'
import { INTERVAL_LEVELS, isUnlocked } from '../theory/roadmap'
import { mergeProgress } from './merge'
import { flushPending, getCachedProgress, getPending, setCachedProgress } from './pending'

export type SyncState = 'local' | 'syncing' | 'synced' | 'offline'

export function useProgress() {
  const [server, setServer] = useState<Progress | null>(getCachedProgress)
  const [pending, setPending] = useState(getPending)
  const [sync, setSync] = useState<SyncState>(() => (isConfigured() ? 'syncing' : 'local'))
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    if (!isConfigured()) return
    let cancelled = false
    ;(async () => {
      setSync('syncing')
      const flushed = await flushPending() // upload first so the fetch below includes it
      if (cancelled) return
      setPending(getPending())
      try {
        const fresh = await fetchProgress()
        if (cancelled) return
        setCachedProgress(fresh)
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

  const progress = useMemo(() => mergeProgress(server, pending), [server, pending])
  const passed = useMemo(() => new Set(progress.levels.filter((l) => l.passed).map((l) => l.level)), [progress])
  const nextLevel = useMemo(
    () => INTERVAL_LEVELS.find((l) => isUnlocked(l.id, passed) && !passed.has(l.id)) ?? INTERVAL_LEVELS[INTERVAL_LEVELS.length - 1],
    [passed],
  )

  return { progress, passed, nextLevel, sync, message, pendingCount: pending.length }
}
