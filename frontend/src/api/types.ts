import type { ExerciseId, Mode } from '../theory/types'

export interface AttemptPayload {
  root_midi: number
  /** Id of the correct answer (see the exercise's items). */
  item: string
  mode: Mode
  /** Id of the answer that was chosen. */
  answered: string
  correct: boolean
  response_ms: number
}

export interface SessionPayload {
  client_id: string
  exercise: ExerciseId
  level: number
  started_at: string
  ended_at: string
  attempts: AttemptPayload[]
}

export interface LevelStat {
  level: number
  sessions: number
  best_accuracy: number | null
  passed: boolean
}

export interface ExerciseProgress {
  levels: LevelStat[]
  items: { item: string; asked: number; correct: number }[]
  confusions: { asked: string; answered: string; count: number }[]
}

export interface HistoryRow {
  id: number | string
  exercise: ExerciseId
  level: number
  ended_at: string
  question_count: number
  accuracy: number
}

export interface Progress {
  totals: {
    sessions: number
    questions: number
    correct: number
    practice_seconds: number
    streak_days: number
    last_practiced: string | null
  }
  exercises: Record<ExerciseId, ExerciseProgress>
  history: HistoryRow[]
}
