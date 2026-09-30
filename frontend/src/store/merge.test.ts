import { describe, expect, it } from 'vitest'
import type { SessionPayload } from '../api/types'
import type { ExerciseId } from '../theory/types'
import { emptyProgress, mergeProgress } from './merge'

function session(level: number, total: number, wrong: number, endedAt: string, opts: { exercise?: ExerciseId; item?: string; wrongAnswer?: string } = {}): SessionPayload {
  const { exercise = 'intervals', item = '7', wrongAnswer = '5' } = opts
  return {
    client_id: crypto.randomUUID(),
    exercise,
    level,
    started_at: new Date(Date.parse(endedAt) - 300_000).toISOString(),
    ended_at: endedAt,
    attempts: Array.from({ length: total }, (_, i) => ({
      root_midi: 60,
      item,
      mode: exercise === 'chords' ? ('block' as const) : ('ascending' as const),
      answered: i < wrong ? wrongAnswer : item,
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
    expect(merged.exercises.intervals.levels).toEqual([{ level: 1, sessions: 1, best_accuracy: 0.9, passed: true }])
    expect(merged.exercises.intervals.items).toEqual([{ item: '7', asked: 20, correct: 18 }])
    expect(merged.exercises.intervals.confusions).toEqual([{ asked: '7', answered: '5', count: 2 }])
    expect(merged.exercises.chords.levels).toEqual([])
  })

  it('keeps each exercise separate but shares totals and the streak', () => {
    const merged = mergeProgress(
      null,
      [
        session(1, 20, 1, '2026-09-30T09:00:00Z'),
        session(2, 20, 0, '2026-09-30T10:00:00Z', { exercise: 'chords', item: 'maj', wrongAnswer: 'min' }),
      ],
      NOW,
    )
    expect(merged.totals).toMatchObject({ sessions: 2, questions: 40, correct: 39, streak_days: 1 })
    expect(merged.exercises.intervals.levels.map((l) => l.level)).toEqual([1])
    expect(merged.exercises.chords.levels.map((l) => l.level)).toEqual([2])
    expect(merged.exercises.chords.items).toEqual([{ item: 'maj', asked: 20, correct: 20 }])
    expect(merged.history.map((h) => h.exercise)).toEqual(['chords', 'intervals'])
  })

  it('does not count short sessions toward passing', () => {
    const merged = mergeProgress(null, [session(1, 10, 0, '2026-09-30T10:00:00Z')], NOW)
    expect(merged.exercises.intervals.levels[0]).toMatchObject({ sessions: 1, best_accuracy: null, passed: false })
  })

  it('adds pending sessions on top of server totals and keeps the streak going', () => {
    const server = {
      ...emptyProgress(),
      totals: { sessions: 3, questions: 60, correct: 45, practice_seconds: 900, streak_days: 2, last_practiced: '2026-09-29T09:00:00Z' },
    }
    server.exercises.intervals.levels = [{ level: 1, sessions: 3, best_accuracy: 0.75, passed: false }]
    const merged = mergeProgress(server, [session(1, 20, 1, '2026-09-30T08:00:00Z')], NOW)
    expect(merged.totals.sessions).toBe(4)
    expect(merged.totals.streak_days).toBe(3)
    expect(merged.exercises.intervals.levels[0]).toMatchObject({ sessions: 4, best_accuracy: 0.95, passed: true })
  })

  it('resets the streak to 1 after a gap', () => {
    const server = {
      ...emptyProgress(),
      totals: { sessions: 1, questions: 20, correct: 20, practice_seconds: 60, streak_days: 5, last_practiced: '2026-09-20T09:00:00Z' },
    }
    expect(mergeProgress(server, [session(1, 20, 0, '2026-09-30T08:00:00Z')], NOW).totals.streak_days).toBe(1)
  })
})
