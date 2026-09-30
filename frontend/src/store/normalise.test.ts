import { describe, expect, it } from 'vitest'
import { normaliseProgress, upgradeSession } from './normalise'

describe('normaliseProgress', () => {
  it('translates an old-format (v1) server answer instead of showing an empty screen', () => {
    const v1 = {
      totals: { sessions: 2, questions: 40, correct: 30, practice_seconds: 600, streak_days: 1, last_practiced: '2026-09-30T10:00:00Z' },
      levels: [{ level: 1, sessions: 2, best_accuracy: 0.85, passed: true }],
      intervals: [{ semitones: 7, asked: 10, correct: 8 }],
      confusions: [{ asked: 7, answered: 5, count: 2 }],
      history: [{ id: 1, level: 1, ended_at: '2026-09-30T10:00:00Z', question_count: 20, accuracy: 0.85 }],
    }
    const out = normaliseProgress(v1)
    expect(out.exercises.intervals.levels[0].passed).toBe(true)
    expect(out.exercises.intervals.items).toEqual([{ item: '7', asked: 10, correct: 8 }])
    expect(out.exercises.intervals.confusions).toEqual([{ asked: '7', answered: '5', count: 2 }])
    expect(out.exercises.chords.levels).toEqual([])
    expect(out.history[0].exercise).toBe('intervals')
  })

  it('fills in an exercise the server does not know about', () => {
    const out = normaliseProgress({ totals: { sessions: 0 }, exercises: { intervals: { levels: [], items: [], confusions: [] } }, history: [] })
    expect(out.exercises.chords).toEqual({ levels: [], items: [], confusions: [] })
  })
})

describe('upgradeSession', () => {
  it('turns a session queued by the first version into the current shape', () => {
    const old = {
      client_id: 'abc', level: 2, started_at: 'a', ended_at: 'b',
      attempts: [{ root_midi: 60, interval_semitones: 7, mode: 'ascending', answered_semitones: 5, correct: false, response_ms: 800 }],
    }
    const out = upgradeSession(old)
    expect(out.exercise).toBe('intervals')
    expect(out.attempts[0]).toEqual({ root_midi: 60, item: '7', mode: 'ascending', answered: '5', correct: false, response_ms: 800 })
  })

  it('leaves current sessions alone', () => {
    const current = {
      client_id: 'abc', exercise: 'chords', level: 1, started_at: 'a', ended_at: 'b',
      attempts: [{ root_midi: 60, item: 'maj', mode: 'block', answered: 'min', correct: false, response_ms: 800 }],
    }
    expect(upgradeSession(current)).toEqual(current)
  })
})
