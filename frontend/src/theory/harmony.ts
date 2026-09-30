import type { TimedEvent } from './practice'
import { KEYS_BY_FIFTHS, noteLabel, pitchClass, relativeMinorTonic, type Note } from './spelling'

/** Whether a question sets up a major or a minor key. */
export type KeyMode = 'major' | 'minor'

/** How much of the key is sounded before a question: the full I-IV-V-I, or just the home chord. */
export type Help = 'full' | 'light'

/** Semitones above the tonic of each scale degree. Spelled with b and # so the same ids work in major and minor. */
export const DEGREE_SEMITONES: Readonly<Record<string, number>> = {
  '1': 0,
  '2': 2,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  b6: 8,
  '6': 9,
  b7: 10,
  '7': 11,
}

const chord = (time: number, hold: number, notes: number[]): TimedEvent => ({ time, hold, notes })

/**
 * The home key, played as chords a pianist would use: I - IV - V - I, each chord turned over so the
 * hands barely move (C E G, C F A, B D G, C E G in C). In minor the third is lowered and IV is minor
 * (C E♭ G, C F A♭, B D G, C E♭ G). `light` plays only the home chord.
 * `tonic` is the MIDI note of the lowest tonic in the chords. Returns the events and when they end.
 */
export function keyContext(tonic: number, mode: KeyMode, help: Help): { events: TimedEvent[]; end: number } {
  const third = mode === 'major' ? 4 : 3
  const sixth = mode === 'major' ? 9 : 8
  if (help === 'light') return { events: [chord(0, 1.6, [tonic, tonic + third, tonic + 7])], end: 1.6 }
  const step = 0.75
  const events = [
    chord(0, 0.9, [tonic, tonic + third, tonic + 7]),
    chord(step, 0.9, [tonic, tonic + 5, tonic + sixth]),
    chord(step * 2, 0.9, [tonic - 1, tonic + 2, tonic + 7]),
    chord(step * 3, 1.6, [tonic, tonic + third, tonic + 7]),
  ]
  return { events, end: step * 3 + 1.6 }
}

// ---- Chords built on the degrees of a key -----------------------------------------------------

export type Function3 = 'tonic' | 'sub' | 'dom'

export interface KeyDegree {
  /** Semitones above the tonic of the chord's root. */
  semis: number
  /** Letters above the tonic's letter (0 = same letter). */
  letters: number
  triad: 'maj' | 'min' | 'dim'
  seventh: 'maj7' | 'm7' | '7' | 'm7b5'
  numeral: string
  /** What the chord does: settles (tonic), moves away (sub) or pulls home (dom). */
  fn: Function3
}

/** The seven chords of a major key. */
export const MAJOR_KEY: readonly KeyDegree[] = [
  { semis: 0, letters: 0, triad: 'maj', seventh: 'maj7', numeral: 'I', fn: 'tonic' },
  { semis: 2, letters: 1, triad: 'min', seventh: 'm7', numeral: 'ii', fn: 'sub' },
  { semis: 4, letters: 2, triad: 'min', seventh: 'm7', numeral: 'iii', fn: 'tonic' },
  { semis: 5, letters: 3, triad: 'maj', seventh: 'maj7', numeral: 'IV', fn: 'sub' },
  { semis: 7, letters: 4, triad: 'maj', seventh: '7', numeral: 'V', fn: 'dom' },
  { semis: 9, letters: 5, triad: 'min', seventh: 'm7', numeral: 'vi', fn: 'tonic' },
  { semis: 11, letters: 6, triad: 'dim', seventh: 'm7b5', numeral: 'vii°', fn: 'dom' },
]

/** The chords a minor key uses most: i, iv, V (with the raised 7th, so it is major) and VI. */
export const MINOR_KEY: readonly KeyDegree[] = [
  { semis: 0, letters: 0, triad: 'min', seventh: 'm7', numeral: 'i', fn: 'tonic' },
  { semis: 5, letters: 3, triad: 'min', seventh: 'm7', numeral: 'iv', fn: 'sub' },
  { semis: 7, letters: 4, triad: 'maj', seventh: '7', numeral: 'V', fn: 'dom' },
  { semis: 8, letters: 5, triad: 'maj', seventh: 'maj7', numeral: 'VI', fn: 'tonic' },
]

/** Semitones above the root of each chord type. */
export const STACK: Readonly<Record<string, readonly number[]>> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
}

/** Chord type as written after the root: C, Cm, Cdim, Cmaj7, Cm7, C7, Cm7♭5. */
export const SUFFIX: Readonly<Record<string, string>> = { maj: '', min: 'm', dim: 'dim', maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7♭5' }

export const chordName = (root: Note, type: string): string => `${noteLabel(root)}${SUFFIX[type]}`

/** A key's name as it is usually written (A minor, F♯ major), with its tonic spelled. */
export function keyLabel(tonicPc: number, mode: KeyMode): { tonic: Note; label: string } {
  const major = KEYS_BY_FIFTHS.find((k) => pitchClass(k.tonic) === tonicPc)
  if (mode === 'major' && major) return { tonic: major.tonic, label: `${noteLabel(major.tonic)} major` }
  const relativeOf = KEYS_BY_FIFTHS.find((k) => pitchClass(relativeMinorTonic(k)) === tonicPc)!
  const tonic = relativeMinorTonic(relativeOf)
  return { tonic, label: `${noteLabel(tonic)} minor` }
}

export const chordEvent = (time: number, hold: number, notes: number[]): TimedEvent => ({ time, hold, notes })
