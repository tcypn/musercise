import { HIGHEST_MIDI, LOWEST_MIDI } from './notes'
import type { Level, Mode } from './roadmap'

export interface Question {
  /** The note played first (the top note for descending intervals). */
  root: number
  semitones: number
  mode: Mode
  /** Notes in the order they sound. */
  notes: [number, number]
}

export function makeQuestion(level: Level, semitones: number, mode: Mode, rand: () => number): Question {
  const min = Math.max(level.lowRange[0], LOWEST_MIDI)
  const max = Math.min(level.lowRange[1], HIGHEST_MIDI - semitones)
  const low = min + Math.floor(rand() * (max - min + 1))
  const high = low + semitones
  return mode === 'descending'
    ? { root: high, semitones, mode, notes: [high, low] }
    : { root: low, semitones, mode, notes: [low, high] }
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Builds a session's questions. Intervals are drawn from shuffled bags so every
 * interval in the level shows up about equally often, never twice in a row.
 */
export function buildQuestions(level: Level, count: number, rand: () => number = Math.random): Question[] {
  const questions: Question[] = []
  let bag: number[] = []
  let previous = -1
  while (questions.length < count) {
    if (bag.length === 0) {
      bag = shuffle([...level.semitones], rand)
      if (bag.length > 1 && bag[bag.length - 1] === previous) bag.reverse() // pop() takes the end
    }
    const semitones = bag.pop() as number
    previous = semitones
    const mode = level.modes[Math.floor(rand() * level.modes.length)]
    questions.push(makeQuestion(level, semitones, mode, rand))
  }
  return questions
}
