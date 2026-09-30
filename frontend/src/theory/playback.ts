import type { TimedEvent } from './practice'
import type { ExerciseDef, Question } from './types'

/** Slow replays stretch time and let each note ring longer. */
const SLOW_TIME = 1.8
const SLOW_HOLD = 1.6

/** Which of the two parts of a question to play: everything, just the key, or just the part you answer about. */
export type Part = 'all' | 'key' | 'question'

/** The events of one part. The question part starts at time 0, so it plays at once when heard alone. */
export function partOf(events: TimedEvent[], answerFrom: number | undefined, part: Part): TimedEvent[] {
  if (part === 'all' || answerFrom === undefined) return events
  if (part === 'key') return events.slice(0, answerFrom)
  const start = events[answerFrom].time
  return events.slice(answerFrom).map((e) => ({ ...e, time: e.time - start }))
}

/**
 * What to play for a question. Lessons that set up a key first or play several chords carry their own `events`;
 * the others (intervals, chords) are one run of notes, played by the exercise's `playStyle`.
 */
export function eventsFor(exercise: ExerciseDef, question: Question, slow = false, part: Part = 'all'): TimedEvent[] {
  if (question.events) {
    const events = partOf(question.events, question.answerFrom, part)
    return slow ? events.map((e) => ({ ...e, time: e.time * SLOW_TIME, hold: e.hold * SLOW_HOLD })) : events
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
