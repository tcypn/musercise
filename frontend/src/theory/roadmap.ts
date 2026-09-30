import type { Interval } from './intervals'
import { intervalBySemitones } from './intervals'

export type Mode = 'ascending' | 'descending' | 'harmonic'

export interface Level {
  id: number
  name: string
  blurb: string
  semitones: readonly number[]
  modes: readonly Mode[]
  /** Range of the LOWER note of each interval (MIDI numbers). */
  lowRange: readonly [number, number]
}

/** Keep in sync with backend/progress/rules.py. */
export const PASS_ACCURACY = 0.8
export const QUESTIONS_PER_SESSION = 20

const PERFECT = [5, 7, 12]
const WITH_THIRDS = [...PERFECT, 3, 4]
const WITH_SIXTHS = [...WITH_THIRDS, 8, 9]
const NO_TRITONE = [...WITH_SIXTHS, 1, 2, 10, 11]
const ALL = [...NO_TRITONE, 6]
const COMMON_HARMONIC = [...WITH_SIXTHS]

const MID: readonly [number, number] = [48, 67] // C3–G4: the comfortable middle
const WIDE: readonly [number, number] = [36, 79]
const FULL: readonly [number, number] = [21, 108]

export const INTERVAL_LEVELS: readonly Level[] = [
  { id: 1, name: 'Perfect ground', blurb: 'The most stable sounds: fourth, fifth and octave.', semitones: PERFECT, modes: ['ascending'], lowRange: MID },
  { id: 2, name: 'Thirds', blurb: 'Add the bright major third and the darker minor third.', semitones: WITH_THIRDS, modes: ['ascending'], lowRange: MID },
  { id: 3, name: 'Sixths', blurb: 'Wide and singing: major and minor sixths join the set.', semitones: WITH_SIXTHS, modes: ['ascending'], lowRange: MID },
  { id: 4, name: 'Seconds and sevenths', blurb: 'The tight, dissonant intervals. Everything except the tritone.', semitones: NO_TRITONE, modes: ['ascending'], lowRange: MID },
  { id: 5, name: 'The tritone', blurb: 'All twelve intervals, going up, across a wider register.', semitones: ALL, modes: ['ascending'], lowRange: [43, 72] },
  { id: 6, name: 'Coming down', blurb: 'The same twelve intervals, now falling.', semitones: ALL, modes: ['descending'], lowRange: [43, 72] },
  { id: 7, name: 'Both directions', blurb: 'Rising and falling mixed together, from bass to treble.', semitones: ALL, modes: ['ascending', 'descending'], lowRange: WIDE },
  { id: 8, name: 'Played together', blurb: 'Both notes at once. Start with the consonant intervals.', semitones: COMMON_HARMONIC, modes: ['harmonic'], lowRange: [43, 72] },
  { id: 9, name: 'Tight harmony', blurb: 'All twelve intervals sounded together.', semitones: ALL, modes: ['harmonic'], lowRange: WIDE },
  { id: 10, name: 'All 88 keys', blurb: 'Every interval, every direction, the whole keyboard.', semitones: ALL, modes: ['ascending', 'descending', 'harmonic'], lowRange: FULL },
]

export function levelById(id: number): Level | undefined {
  return INTERVAL_LEVELS.find((l) => l.id === id)
}

export function levelIntervals(level: Level): Interval[] {
  return [...level.semitones].sort((a, b) => a - b).map(intervalBySemitones)
}

export function isPassing(questionCount: number, correctCount: number): boolean {
  return questionCount >= QUESTIONS_PER_SESSION && correctCount / questionCount >= PASS_ACCURACY
}

/** Level N is open once level N-1 has been passed (level 1 is always open). */
export function isUnlocked(levelId: number, passed: ReadonlySet<number>): boolean {
  return levelId === 1 || passed.has(levelId - 1)
}
