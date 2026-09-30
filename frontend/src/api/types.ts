import type { Mode } from '../theory/roadmap'

export interface AttemptPayload {
  root_midi: number
  interval_semitones: number
  mode: Mode
  answered_semitones: number
  correct: boolean
  response_ms: number
}

export interface SessionPayload {
  client_id: string
  exercise: 'intervals'
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

export interface Progress {
  totals: {
    sessions: number
    questions: number
    correct: number
    practice_seconds: number
    streak_days: number
    last_practiced: string | null
  }
  levels: LevelStat[]
  intervals: { semitones: number; asked: number; correct: number }[]
  confusions: { asked: number; answered: number; count: number }[]
  history: { id: number | string; level: number; ended_at: string; question_count: number; accuracy: number }[]
}
