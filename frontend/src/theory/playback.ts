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

/**
 * Which step of the answer view an event belongs to, so the keyboard can follow the sound. `index` counts the events
 * as played (after `part` slicing). Without a `stepOf` map, each event after the key is one step.
 */
export function stepFor(question: Question, part: Part, index: number): number | null {
  if (!question.steps) return null
  const full = part === 'question' && question.answerFrom !== undefined ? index + question.answerFrom : index
  if (question.stepOf) return question.stepOf[full] ?? null
  if (question.answerFrom === undefined || full < question.answerFrom) return null
  return Math.min(full - question.answerFrom, question.steps.length - 1)
}

/**
 * The keys sounding when event `index` starts: the notes struck right then ('first') and the notes still ringing
 * from earlier ('second'), so the keyboard shows exactly what is heard, a moving left hand under a held chord too.
 */
export function soundingAt(events: readonly TimedEvent[], index: number): { midi: number; role: 'first' | 'second' }[] {
  const t = events[index].time
  const struck = new Set(events.filter((e) => Math.abs(e.time - t) < 1e-6).flatMap((e) => e.notes))
  const ringing = new Set(events.filter((e) => e.time < t - 1e-6 && e.time + e.hold > t + 1e-6).flatMap((e) => e.notes))
  return [...[...struck].map((midi) => ({ midi, role: 'first' as const })), ...[...ringing].filter((m) => !struck.has(m)).map((midi) => ({ midi, role: 'second' as const }))]
}

/** Slow only helps when notes come one after another. */
export function canSlow(exercise: ExerciseDef, question: Question): boolean {
  return question.events ? question.events.some((e) => e.time > 0) : exercise.playStyle(question.mode).gap > 0
}

/** Playback starts about this long after it is asked for (the audio clock looks ahead a little). */
const LEAD_MS = 150

/**
 * How long after a question starts playing the part you answer about begins. Answer times are counted from there,
 * so a key played first does not count as slowness. Zero for questions that are only the sound to answer about.
 */
export function questionOffsetMs(question: Question): number {
  if (question.answerFrom === undefined || !question.events) return 0
  return Math.round(question.events[question.answerFrom].time * 1000) + LEAD_MS
}
