import { ApiError, isConfigured, postSession } from '../api/client'
import type { Progress, SessionPayload } from '../api/types'
import { mergeProgress } from './merge'
import { readJson, writeJson } from './storage'

const PENDING_KEY = 'musercise.pending'
const CACHE_KEY = 'musercise.progress-cache'

/** Sessions finished on this device that the server has not confirmed yet. */
export const getPending = (): SessionPayload[] => readJson<SessionPayload[]>(PENDING_KEY, [])

export function addPending(session: SessionPayload): void {
  writeJson(PENDING_KEY, [...getPending(), session])
}

export const getCachedProgress = (): Progress | null => readJson<Progress | null>(CACHE_KEY, null)
export const setCachedProgress = (progress: Progress): void => writeJson(CACHE_KEY, progress)

export interface FlushResult {
  remaining: number
  error?: string
}

/** Uploads queued sessions in order. Stops at the first failure so nothing is lost. */
export async function flushPending(): Promise<FlushResult> {
  let queue = getPending()
  if (!isConfigured()) return { remaining: queue.length }
  while (queue.length > 0) {
    try {
      await postSession(queue[0])
    } catch (error) {
      // 400 = the server will never accept this payload; drop it instead of blocking the queue.
      if (error instanceof ApiError && error.status === 400) {
        queue = queue.slice(1)
        writeJson(PENDING_KEY, queue)
        continue
      }
      return { remaining: queue.length, error: error instanceof Error ? error.message : 'Upload failed.' }
    }
    queue = queue.slice(1)
    writeJson(PENDING_KEY, queue)
  }
  return { remaining: 0 }
}

/** Levels passed according to the last known server data plus anything still queued here. */
export function passedLevels(): Set<number> {
  const progress = mergeProgress(getCachedProgress(), getPending())
  return new Set(progress.levels.filter((l) => l.passed).map((l) => l.level))
}
