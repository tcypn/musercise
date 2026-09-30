import { ApiError, isConfigured, postSession } from '../api/client'
import type { Progress, SessionPayload } from '../api/types'
import type { ExerciseId } from '../theory/types'
import { mergeProgress } from './merge'
import { normaliseProgress, upgradeSession } from './normalise'
import { readJson, writeJson } from './storage'

const PENDING_KEY = 'musercise.pending'
/** Sessions the server refused. Kept (never deleted) so a version mismatch cannot lose practice. */
const REJECTED_KEY = 'musercise.rejected'
const CACHE_KEY = 'musercise.progress-cache.v2'

/** Sessions finished on this device that the server has not confirmed yet. */
export const getPending = (): SessionPayload[] => readJson<unknown[]>(PENDING_KEY, []).map(upgradeSession)
export const getRejected = (): SessionPayload[] => readJson<unknown[]>(REJECTED_KEY, []).map(upgradeSession)

export function addPending(session: SessionPayload): void {
  writeJson(PENDING_KEY, [...getPending(), session])
}

/** The cache may have been written by an older version of the app, so bring it up to the current shape. */
export function getCachedProgress(): Progress | null {
  const raw = readJson<unknown>(CACHE_KEY, null)
  if (!raw || typeof raw !== 'object') return null
  try {
    return normaliseProgress(raw)
  } catch {
    return null
  }
}
export const setCachedProgress = (progress: Progress): void => writeJson(CACHE_KEY, progress)

/** Puts refused sessions back in the queue, for another try after the server has been fixed. */
export function requeueRejected(): number {
  const rejected = getRejected()
  if (rejected.length === 0) return 0
  writeJson(PENDING_KEY, [...getPending(), ...rejected])
  writeJson(REJECTED_KEY, [])
  return rejected.length
}

export interface FlushResult {
  remaining: number
  error?: string
}

/** Uploads queued sessions in order. Stops at the first network failure so nothing is lost. */
export async function flushPending(): Promise<FlushResult> {
  let queue = getPending()
  if (!isConfigured()) return { remaining: queue.length }
  while (queue.length > 0) {
    try {
      await postSession(queue[0])
    } catch (error) {
      // 400 = the server will not accept this payload. Park it rather than blocking the queue or deleting it.
      if (error instanceof ApiError && error.status === 400) {
        writeJson(REJECTED_KEY, [...getRejected(), queue[0]])
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

/** Levels passed in an exercise, according to the last known server data plus anything still queued here. */
export function passedLevels(exercise: ExerciseId): Set<number> {
  const progress = mergeProgress(getCachedProgress(), getPending())
  return new Set(progress.exercises[exercise].levels.filter((l) => l.passed).map((l) => l.level))
}
