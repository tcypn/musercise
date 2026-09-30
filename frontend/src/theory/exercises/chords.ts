import { intervalBySemitones } from '../intervals'
import { article, HIGHEST_MIDI, LOWEST_MIDI, noteName } from '../notes'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

export interface ChordType {
  id: string
  short: string
  name: string
  hint: string
  /** Semitones above the root, in root position. */
  stack: readonly number[]
  /**
   * False when turning the chord upside down would spell a different chord:
   * Csus2 upside down is the same notes as Gsus4, and Am7 as C6.
   */
  invertible: boolean
}

export const CHORDS: readonly ChordType[] = [
  { id: 'maj', short: 'maj', name: 'Major', hint: 'Bright, happy, settled', stack: [0, 4, 7], invertible: true },
  { id: 'min', short: 'min', name: 'Minor', hint: 'Darker, sadder, more serious', stack: [0, 3, 7], invertible: true },
  { id: 'dim', short: 'dim', name: 'Diminished', hint: 'Tense and unstable, wants to move', stack: [0, 3, 6], invertible: true },
  { id: 'aug', short: 'aug', name: 'Augmented', hint: 'Dreamy and restless, hovering', stack: [0, 4, 8], invertible: true },
  { id: 'sus2', short: 'sus2', name: 'Suspended 2nd', hint: 'Open and airy, no third to say happy or sad', stack: [0, 2, 7], invertible: false },
  { id: 'sus4', short: 'sus4', name: 'Suspended 4th', hint: 'Hanging in the air, wants to settle down', stack: [0, 5, 7], invertible: false },
  { id: 'maj7', short: 'maj7', name: 'Major 7th', hint: 'Smooth, lush, dreamy', stack: [0, 4, 7, 11], invertible: false },
  { id: 'dom7', short: '7', name: 'Dominant 7th', hint: 'Bluesy and tense, pulls toward the next chord', stack: [0, 4, 7, 10], invertible: false },
  { id: 'min7', short: 'm7', name: 'Minor 7th', hint: 'Mellow and soulful, a favourite in R&B', stack: [0, 3, 7, 10], invertible: false },
  { id: 'hdim7', short: 'm7♭5', name: 'Half-diminished 7th', hint: 'Dark and yearning', stack: [0, 3, 6, 10], invertible: false },
  { id: 'dim7', short: 'dim7', name: 'Diminished 7th', hint: 'Very tense and dramatic, perfectly symmetrical', stack: [0, 3, 6, 9], invertible: false },
]

const BY_ID = new Map(CHORDS.map((c) => [c.id, c]))

export function chordById(id: string): ChordType {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`No chord with id ${id}`)
  return found
}

/** Offsets above the root, ascending, after moving the lowest `inversion` notes up an octave. */
export function voicing(chord: ChordType, inversion: number): number[] {
  return chord.stack.map((s, i) => (i < inversion ? s + 12 : s)).sort((a, b) => a - b)
}

const TRIADS = ['maj', 'min', 'dim', 'aug']
const SUS = ['sus2', 'sus4']
const SEVENTHS = ['maj7', 'dom7', 'min7']
const ALL_SEVENTHS = [...SEVENTHS, 'hdim7', 'dim7']

const MID: readonly [number, number] = [48, 65]
const WIDE: readonly [number, number] = [36, 79]
const FULL: readonly [number, number] = [LOWEST_MIDI, HIGHEST_MIDI]

const levels: readonly Level[] = [
  { id: 1, name: 'Bright or dark', blurb: 'The two chords behind most songs: major and minor.', items: ['maj', 'min'], modes: ['block'], lowRange: MID },
  { id: 2, name: 'Tension', blurb: 'Add the diminished chord: two minor thirds stacked.', items: ['maj', 'min', 'dim'], modes: ['block'], lowRange: MID },
  { id: 3, name: 'Restless', blurb: 'Add the augmented chord. That completes the four triads.', items: TRIADS, modes: ['block'], lowRange: MID },
  { id: 4, name: 'Broken chords', blurb: 'The same four triads, played one note at a time from the bottom.', items: TRIADS, modes: ['arpeggio'], lowRange: MID },
  { id: 5, name: 'Turned upside down', blurb: 'Triads with a different note on the bottom (inversions). Listen to the notes, not the bass.', items: TRIADS, modes: ['block'], lowRange: MID, inversions: true },
  { id: 6, name: 'Suspended', blurb: 'Sus2 and sus4 join the four triads. The bottom note is always the root.', items: [...TRIADS, ...SUS], modes: ['block'], lowRange: [43, 72] },
  { id: 7, name: 'Sevenths', blurb: 'Major 7th, dominant 7th and minor 7th: the sound of pop and R&B.', items: SEVENTHS, modes: ['block'], lowRange: MID },
  { id: 8, name: 'More sevenths', blurb: 'Add the half-diminished and diminished sevenths.', items: ALL_SEVENTHS, modes: ['block'], lowRange: MID },
  { id: 9, name: 'Everything mixed', blurb: 'Triads, suspended chords and sevenths, block and broken, triads inverted.', items: [...TRIADS, ...SUS, ...ALL_SEVENTHS], modes: ['block', 'arpeggio'], lowRange: WIDE, inversions: true },
  { id: 10, name: 'All 88 keys', blurb: 'Every chord, every way of playing it, the whole keyboard.', items: [...TRIADS, ...SUS, ...ALL_SEVENTHS], modes: ['block', 'arpeggio'], lowRange: FULL, inversions: true },
]

const items: readonly Item[] = CHORDS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const chord = chordById(item.id)
  const inversion = level.inversions && chord.invertible ? Math.floor(rand() * chord.stack.length) : 0
  const offsets = voicing(chord, inversion)
  const min = Math.max(level.lowRange[0], LOWEST_MIDI)
  const max = Math.max(min, Math.min(level.lowRange[1], HIGHEST_MIDI - offsets[offsets.length - 1]))
  const root = min + Math.floor(rand() * (max - min + 1))
  return {
    root: inversion === 0 ? root : root + 12,
    item: item.id,
    mode,
    notes: offsets.map((o) => root + o),
    inversion,
  }
}

const INVERSION_WORD = ['', 'first inversion', 'second inversion', 'third inversion']

/** "major 3rd + minor 3rd": the stacked intervals that make the chord. */
export function stackDescription(chord: ChordType): string {
  const steps = chord.stack.slice(1).map((s, i) => intervalBySemitones(s - chord.stack[i]).name.toLowerCase())
  return steps.join(' + ')
}

export const chordsExercise: ExerciseDef = {
  id: 'chords',
  name: 'Chord quality',
  blurb:
    'Hear a chord and name its quality: major, minor, diminished and beyond. A chord is intervals stacked, so your interval training already helps.',
  hintLabel: 'Sounds:',
  question: 'What chord did you hear?',
  items,
  levels,
  makeQuestion,
  playStyle: (mode) => (mode === 'arpeggio' ? { gap: 0.35, hold: 2.4 } : { gap: 0, hold: 2.4 }),
  describe: (q) => {
    const chord = chordById(q.item)
    const notes = q.notes.map(noteName).join(' ')
    const inversion = q.inversion ? `, ${INVERSION_WORD[q.inversion]}` : ''
    return `${notes}${inversion}. Built from ${stackDescription(chord)}.`
  },
  phrase: (item) => {
    const word = item.name.toLowerCase()
    return `${article(word)} ${word} chord`
  },
  modeLabel: { ascending: 'up', descending: 'down', harmonic: 'together', block: 'together', arpeggio: 'broken' },
}
