import type { PracticeItem } from '../theory/practice'
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
  /** The user's own calendar date when the session ended (YYYY-MM-DD). Missing on sessions queued by older versions. */
  local_date?: string
  attempts: AttemptPayload[]
}

export interface LevelStat {
  level: number
  sessions: number
  best_accuracy: number | null
  passed: boolean
  /** Day the level was first passed (YYYY-MM-DD). Missing on servers older than v4. */
  first_passed?: string | null
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
  /** The calendar day the session counts for. Missing on servers older than v4. */
  day?: string
  question_count: number
  accuracy: number
}

/** One day of exercise sessions. */
export interface DailyRow {
  date: string
  sessions: number
  questions: number
  correct: number
  seconds: number
}

export interface Progress {
  totals: {
    sessions: number
    questions: number
    correct: number
    practice_seconds: number
    streak_days: number
    last_practiced: string | null
    /** Latest day with a session or a routine row (YYYY-MM-DD). Missing on servers older than v3. */
    last_practice_day?: string | null
  }
  exercises: Record<ExerciseId, ExerciseProgress>
  practice: { logs: PracticeEntry[] }
  /** Every day with practice (a session or a routine row), oldest first. */
  days: string[]
  /** Exercise sessions added up per day, oldest first. */
  daily: DailyRow[]
  history: HistoryRow[]
}

/** One row of the daily routine on one day. `date` is the user's local calendar date. */
export interface PracticeEntry {
  date: string
  item: PracticeItem
  seconds: number
  done: boolean
}
