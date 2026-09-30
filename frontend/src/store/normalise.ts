import type { ExerciseProgress, Progress, SessionPayload } from '../api/types'

export const emptyExercise = (): ExerciseProgress => ({ levels: [], items: [], confusions: [] })

export function emptyProgress(): Progress {
  return {
    totals: { sessions: 0, questions: 0, correct: 0, practice_seconds: 0, streak_days: 0, last_practiced: null, last_practice_day: null },
    exercises: { intervals: emptyExercise(), chords: emptyExercise() },
    history: [],
    practice: { logs: [] },
  }
}

interface V1Progress {
  totals: Progress['totals']
  levels: ExerciseProgress['levels']
  intervals: { semitones: number; asked: number; correct: number }[]
  confusions: { asked: number; answered: number; count: number }[]
  history: { id: number; level: number; ended_at: string; question_count: number; accuracy: number }[]
}

/**
 * The server answers in the current shape once it is upgraded. An older server (the frontend
 * can be published a few minutes before the server is updated) still answers in the v1 shape,
 * so translate it rather than showing an empty screen.
 */
export function normaliseProgress(raw: unknown): Progress {
  const data = raw as Partial<Progress> & Partial<V1Progress>
  if (data.exercises) {
    const base = emptyProgress()
    return {
      totals: data.totals ?? base.totals,
      exercises: { ...base.exercises, ...data.exercises },
      history: data.history ?? [],
      practice: data.practice ?? base.practice,
    }
  }
  const base = emptyProgress()
  return {
    totals: data.totals ?? base.totals,
    exercises: {
      ...base.exercises,
      intervals: {
        levels: data.levels ?? [],
        items: (data.intervals ?? []).map((i) => ({ item: String(i.semitones), asked: i.asked, correct: i.correct })),
        confusions: (data.confusions ?? []).map((c) => ({ asked: String(c.asked), answered: String(c.answered), count: c.count })),
      },
    },
    history: (data.history ?? []).map((h) => ({ ...h, exercise: 'intervals' as const })),
    practice: base.practice,
  }
}

interface LegacyAttempt {
  root_midi: number
  interval_semitones?: number
  answered_semitones?: number
  item?: string
  answered?: string
  mode: string
  correct: boolean
  response_ms: number
}

/** Sessions queued by the first version of the app used interval_semitones; turn them into today's shape. */
export function upgradeSession(raw: unknown): SessionPayload {
  const session = raw as Omit<SessionPayload, 'attempts' | 'exercise'> & {
    exercise?: SessionPayload['exercise']
    attempts: LegacyAttempt[]
  }
  return {
    ...session,
    exercise: session.exercise ?? 'intervals',
    attempts: session.attempts.map((a) => {
      if (a.item !== undefined) return a as SessionPayload['attempts'][number]
      const { interval_semitones, answered_semitones, ...rest } = a
      return {
        ...rest,
        item: String(interval_semitones),
        answered: String(answered_semitones),
      } as SessionPayload['attempts'][number]
    }),
  }
}
