import type { TimedEvent } from './practice'
import type { ExerciseDef, Question } from './types'

/** Slow replays stretch time and let each note ring longer. */
const SLOW_TIME = 1.8
const SLOW_HOLD = 1.6

/**
 * What to play for a question. Lessons that set up a key first or play several chords carry their own `events`;
 * the others (intervals, chords) are one run of notes, played by the exercise's `playStyle`.
 */
export function eventsFor(exercise: ExerciseDef, question: Question, slow = false): TimedEvent[] {
  if (question.events) {
    return slow ? question.events.map((e) => ({ ...e, time: e.time * SLOW_TIME, hold: e.hold * SLOW_HOLD })) : question.events
  }
  const style = exercise.playStyle(question.mode)
  const gap = slow && style.gap > 0 ? style.gap * 2 : style.gap
  const hold = slow && style.gap > 0 ? style.hold * SLOW_HOLD : style.hold
  return question.notes.map((midi, i) => ({ time: i * gap, hold, notes: [midi] }))
}

/** Slow only helps when notes come one after another. */
export function canSlow(exercise: ExerciseDef, question: Question): boolean {
  return question.events ? question.events.some((e) => e.time > 0) : exercise.playStyle(question.mode).gap > 0
}
