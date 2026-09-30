import { describe, expect, it } from 'vitest'
import type { SessionPayload } from '../api/types'
import { emptyProgress, mergeProgress } from './merge'

function session(level: number, total: number, wrong: number, endedAt: string, semitones = 7): SessionPayload {
  return {
    client_id: crypto.randomUUID(),
    exercise: 'intervals',
    level,
    started_at: new Date(Date.parse(endedAt) - 300_000).toISOString(),
    ended_at: endedAt,
    attempts: Array.from({ length: total }, (_, i) => ({
      root_midi: 60,
      interval_semitones: semitones,
      mode: 'ascending' as const,
      answered_semitones: i < wrong ? 5 : semitones,
      correct: i >= wrong,
      response_ms: 1000,
    })),
  }
}

const NOW = new Date('2026-09-30T12:00:00Z')

describe('mergeProgress', () => {
  it('returns the server data untouched when nothing is pending', () => {
    const server = emptyProgress()
    expect(mergeProgress(server, [], NOW)).toBe(server)
  })

  it('works with no server at all (local-only mode)', () => {
    const merged = mergeProgress(null, [session(1, 20, 2, '2026-09-30T10:00:00Z')], NOW)
    expect(merged.totals).toMatchObject({ sessions: 1, questions: 20, correct: 18, practice_seconds: 300, streak_days: 1 })
    expect(merged.levels).toEqual([{ level: 1, sessions: 1, best_accuracy: 0.9, passed: true }])
    expect(merged.intervals).toEqual([{ semitones: 7, asked: 20, correct: 18 }])
    expect(merged.confusions).toEqual([{ asked: 7, answered: 5, count: 2 }])
  })

  it('does not count short sessions toward passing', () => {
    const merged = mergeProgress(null, [session(1, 10, 0, '2026-09-30T10:00:00Z')], NOW)
    expect(merged.levels[0]).toMatchObject({ sessions: 1, best_accuracy: null, passed: false })
  })

  it('adds pending sessions on top of server totals and keeps the streak going', () => {
    const server = {
      ...emptyProgress(),
      totals: { sessions: 3, questions: 60, correct: 45, practice_seconds: 900, streak_days: 2, last_practiced: '2026-09-29T09:00:00Z' },
      levels: [{ level: 1, sessions: 3, best_accuracy: 0.75, passed: false }],
    }
    const merged = mergeProgress(server, [session(1, 20, 1, '2026-09-30T08:00:00Z')], NOW)
    expect(merged.totals.sessions).toBe(4)
    expect(merged.totals.streak_days).toBe(3)
    expect(merged.levels[0]).toMatchObject({ sessions: 4, best_accuracy: 0.95, passed: true })
  })

  it('resets the streak to 1 after a gap', () => {
    const server = {
      ...emptyProgress(),
      totals: { sessions: 1, questions: 20, correct: 20, practice_seconds: 60, streak_days: 5, last_practiced: '2026-09-20T09:00:00Z' },
    }
    const merged = mergeProgress(server, [session(1, 20, 0, '2026-09-30T08:00:00Z')], NOW)
    expect(merged.totals.streak_days).toBe(1)
  })
})
