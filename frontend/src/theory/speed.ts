import type { AttemptPayload } from '../api/types'

/** "3.2 s" */
export const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface SessionSpeed {
  /** Mean time per answer over the whole session, in ms. */
  average: number
  /** The slowest answers of the session (by mean time), slowest first. */
  slowest: { item: string; ms: number; count: number }[]
}

/** How fast a finished session was. Answers left open for a long time are capped, so one pause does not decide it. */
export function sessionSpeed(attempts: readonly AttemptPayload[], cap = 30_000, top = 3): SessionSpeed | null {
  if (attempts.length === 0) return null
  const times = new Map<string, number[]>()
  for (const a of attempts) {
    const list = times.get(a.item) ?? []
    list.push(Math.min(a.response_ms, cap))
    times.set(a.item, list)
  }
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const all = attempts.map((a) => Math.min(a.response_ms, cap))
  const slowest = [...times.entries()]
    .map(([item, xs]) => ({ item, ms: mean(xs), count: xs.length }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, top)
  return { average: mean(all), slowest }
}

export interface SpeedRow {
  item: string
  asked: number
  median_ms?: number | null
}

export interface SpeedView {
  /** The learner's own typical time for this lesson: the median of the answers' medians. */
  typical: number | null
  /** Answers clearly slower than the learner's own typical time, slowest first. */
  slow: string[]
}

/** Answers needed before a time means anything. */
export const MIN_ASKED = 5

/**
 * "Slow" is relative to the learner: more than one and a half times their own typical time, and at least two
 * seconds slower, on an answer asked often enough to trust.
 */
export function speedView(rows: readonly SpeedRow[]): SpeedView {
  const known = rows.filter((r) => r.asked >= MIN_ASKED && typeof r.median_ms === 'number') as (SpeedRow & { median_ms: number })[]
  if (known.length < 3) return { typical: null, slow: [] }
  const typical = median(known.map((r) => r.median_ms))
  const slow = known
    .filter((r) => r.median_ms > typical * 1.5 && r.median_ms - typical >= 2000)
    .sort((a, b) => b.median_ms - a.median_ms)
    .map((r) => r.item)
  return { typical, slow }
}
