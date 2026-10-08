import type { Progress } from '../api/types'
import { readJson, writeJson } from '../store/storage'
import { getConcept } from './curriculum'
import { EXERCISES } from './exercises'

/** Something the learner wants to be able to do, and the map lessons that lead there, in order. */
export interface Goal {
  id: string
  name: string
  /** Under the goal's tile in the goal picker. */
  short: string
  /** One line: what you will be able to do. */
  why: string
  lessons: readonly string[]
}

export const GOALS: readonly Goal[] = [
  {
    id: 'chord-sheet',
    short: 'Chord sheet',
    name: 'Play from a chord sheet',
    why: 'Open a chord chart and play the song, chords and accompaniment, in any key. (You already read the melody.)',
    lessons: ['chord-spelling', 'diatonic-chords', 'nashville', 'lead-sheets', 'slash-chords', 'transposition', 'voice-leading', 'comping', 'left-hand', 'bass-lines'],
  },
  {
    id: 'by-ear',
    short: 'By ear',
    name: 'Work out a song by ear',
    why: 'Hear a song and find its chords: what they are, where they go, and when the key changes.',
    lessons: ['intervals', 'chord-quality', 'scale-degrees', 'chord-function', 'progressions', 'cadences', 'slash-chords', 'borrowed-chords', 'modulation', 'by-ear'],
  },
  {
    id: 'accompany',
    short: 'Accompany',
    name: 'Accompany a singer',
    why: 'Play behind someone singing: smooth chords, a groove, a bass line, in their key, following where the song goes.',
    lessons: ['chord-spelling', 'diatonic-chords', 'voice-leading', 'comping', 'left-hand', 'bass-lines', 'transposition', 'cadences', 'modulation', 'by-ear'],
  },
  {
    id: 'improvise',
    short: 'Improvise',
    name: 'Improvise',
    why: 'Make up lines that fit the chords: know where you are in the scale and which notes land well.',
    lessons: ['scale-degrees', 'pentatonic', 'chord-tones', 'minor-scales', 'modes', 'two-five-one', 'scale-choice', 'approach-notes', 'phrasing'],
  },
]

export const getGoalById = (id: string | null | undefined): Goal | undefined => GOALS.find((g) => g.id === id)

// ---- The chosen goal, kept on this device -----------------------------------------------------------

const GOAL_KEY = 'musercise.goal'
const listeners = new Set<() => void>()

export const activeGoal = (): Goal | undefined => getGoalById(readJson<string | null>(GOAL_KEY, null))
/** Choose a goal, or `null` to show every lesson. Everything showing the goal updates at once. */
export function setActiveGoal(id: string | null): void {
  writeJson(GOAL_KEY, id)
  listeners.forEach((l) => l())
}
/** For `useSyncExternalStore`: tell me when the goal changes. */
export function subscribeGoal(listener: () => void): () => void {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
export const activeGoalId = (): string | null => activeGoal()?.id ?? null

// ---- Progress towards a goal ------------------------------------------------------------------------

export type LessonState = 'done' | 'started' | 'new' | 'soon'

export interface GoalLesson {
  conceptId: string
  name: string
  state: LessonState
  /** Levels passed, out of `levels` (0 for lessons not built yet). */
  passed: number
  levels: number
  /** Where the lesson lives: its page, or the coming-soon page. */
  to: string
}

export interface GoalProgress {
  lessons: GoalLesson[]
  /** Lessons with every level passed. */
  done: number
  /** Lessons that can be practised now. */
  ready: number
  total: number
  /** The first lesson not done yet that can be practised. */
  next?: GoalLesson
}

export function goalProgress(goal: Goal, progress: Progress): GoalProgress {
  const lessons = goal.lessons.map((conceptId): GoalLesson => {
    const concept = getConcept(conceptId)!
    const exercise = concept.exerciseId ? EXERCISES[concept.exerciseId] : undefined
    if (!exercise) return { conceptId, name: concept.name, state: 'soon', passed: 0, levels: 0, to: `/soon/${conceptId}` }
    const passed = new Set(progress.exercises[exercise.id].levels.filter((l) => l.passed).map((l) => l.level)).size
    const levels = exercise.levels.length
    return { conceptId, name: concept.name, state: passed >= levels ? 'done' : passed > 0 ? 'started' : 'new', passed, levels, to: `/learn/${exercise.id}` }
  })
  return {
    lessons,
    done: lessons.filter((l) => l.state === 'done').length,
    ready: lessons.filter((l) => l.state !== 'soon').length,
    total: lessons.length,
    next: lessons.find((l) => l.state === 'started' || l.state === 'new'),
  }
}
