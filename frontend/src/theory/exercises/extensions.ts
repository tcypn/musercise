import { HIGHEST_MIDI, LOWEST_MIDI, noteName } from '../notes'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'
import { chordById } from './chords'

/** A chord with notes beyond the triad. Ninths, elevenths and thirteenths sit an octave up, as a pianist plays them. */
export interface ExtendedChord {
  id: string
  short: string
  name: string
  hint: string
  /** Semitones above the root. */
  stack: readonly number[]
  /** What the notes are, in words. */
  parts: string
}

export const EXTENDED: readonly ExtendedChord[] = [
  { id: '6', short: '6', name: 'Major 6th', hint: 'Warm and sweet, a settled major sound with a little lift on top', stack: [0, 4, 7, 9], parts: 'a major triad plus the 6th (9 semitones above the root)' },
  { id: 'm6', short: 'm6', name: 'Minor 6th', hint: 'Minor, but the raised 6th gives it a bittersweet lift', stack: [0, 3, 7, 9], parts: 'a minor triad plus the major 6th' },
  { id: 'add9', short: 'add9', name: 'Major add 9', hint: 'Bright and open, a major chord with shimmer and no 7th', stack: [0, 4, 7, 14], parts: 'a major triad plus the 9th (a step above the root, an octave up)' },
  { id: 'maj9', short: 'maj9', name: 'Major 9th', hint: 'Lush and dreamy: a major 7th with the 9th on top', stack: [0, 4, 7, 11, 14], parts: 'a major 7th chord plus the 9th' },
  { id: 'dom9', short: '9', name: 'Dominant 9th', hint: 'Smooth and funky: a dominant 7th with the 9th on top', stack: [0, 4, 7, 10, 14], parts: 'a dominant 7th chord plus the 9th' },
  { id: 'm9', short: 'm9', name: 'Minor 9th', hint: 'Smooth and soulful, a favourite in R&B', stack: [0, 3, 7, 10, 14], parts: 'a minor 7th chord plus the 9th' },
  { id: 'm11', short: 'm11', name: 'Minor 11th', hint: 'Deep and spacious: a minor 9th with the 11th on top', stack: [0, 3, 7, 10, 14, 17], parts: 'a minor 9th chord plus the 11th (a 4th above the root, an octave up)' },
  { id: 'dom13', short: '13', name: 'Dominant 13th', hint: 'Big and bluesy: a dominant 9th with the 13th on top', stack: [0, 4, 7, 10, 14, 21], parts: 'a dominant 9th chord plus the 13th (a 6th above the root, an octave up)' },
]

/** Chords from the Chord quality lesson, kept here as points of comparison. */
const REFERENCE = ['maj', 'min', 'maj7', 'dom7', 'min7']

const stackOf = (id: string): readonly number[] => EXTENDED.find((c) => c.id === id)?.stack ?? chordById(id).stack

const items: readonly Item[] = [
  ...REFERENCE.map((id) => {
    const { short, name, hint } = chordById(id)
    return { id, short, name, hint }
  }),
  ...EXTENDED.map(({ id, short, name, hint }) => ({ id, short, name, hint })),
]

const MID: readonly [number, number] = [48, 65]
const WIDE: readonly [number, number] = [36, 72]
const FULL: readonly [number, number] = [LOWEST_MIDI, HIGHEST_MIDI]
const ALL_NEW = EXTENDED.map((c) => c.id)
const BLOCK = ['block'] as const satisfies readonly Mode[]
const BOTH = ['block', 'arpeggio'] as const satisfies readonly Mode[]

const levels: readonly Level[] = [
  { id: 1, name: 'A sweet addition', blurb: 'A plain major chord, then the same chord with a 6th or a 9th added. Every chord is in root position.', items: ['maj', '6', 'add9'], modes: BLOCK, lowRange: MID },
  { id: 2, name: 'Minor joins in', blurb: 'Major and minor chords, each with and without a 6th.', items: ['maj', '6', 'min', 'm6'], modes: BLOCK, lowRange: MID },
  { id: 3, name: 'Seventh or ninth', blurb: 'A major 7th chord next to the major 9th, the add9 and the 6th.', items: ['maj7', 'maj9', 'add9', '6'], modes: BLOCK, lowRange: MID },
  { id: 4, name: 'Minor colours', blurb: 'Minor, minor 6th, minor 7th and minor 9th: four shades of the same sound.', items: ['min', 'm6', 'min7', 'm9'], modes: BLOCK, lowRange: MID },
  { id: 5, name: 'Dominant ninth', blurb: 'The dominant 7th next to its 9th, with the major 7th and 9th for contrast.', items: ['dom7', 'dom9', 'maj7', 'maj9'], modes: BLOCK, lowRange: MID },
  { id: 6, name: 'Three ninths', blurb: 'Major 9th, dominant 9th and minor 9th: the difference is the third and the seventh.', items: ['maj9', 'dom9', 'm9'], modes: BLOCK, lowRange: MID },
  { id: 7, name: 'Six added notes', blurb: 'The 6ths and the three ninths, plus add9.', items: ['6', 'm6', 'add9', 'maj9', 'dom9', 'm9'], modes: BLOCK, lowRange: WIDE },
  { id: 8, name: 'Elevenths and thirteenths', blurb: 'The minor 11th and dominant 13th join the ninths. These are big, full sounds.', items: ['m9', 'm11', 'dom9', 'dom13'], modes: BLOCK, lowRange: WIDE },
  { id: 9, name: 'Everything new, mixed', blurb: 'All eight added-note chords, block and broken.', items: ALL_NEW, modes: BOTH, lowRange: WIDE },
  { id: 10, name: 'All 88 keys', blurb: 'The eight added-note chords and five plain ones for comparison, every way of playing, the whole keyboard.', items: items.map((i) => i.id), modes: BOTH, lowRange: FULL },
]

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const stack = stackOf(item.id)
  const min = Math.max(level.lowRange[0], LOWEST_MIDI)
  const max = Math.max(min, Math.min(level.lowRange[1], HIGHEST_MIDI - stack[stack.length - 1]))
  const root = min + Math.floor(rand() * (max - min + 1))
  return { root, item: item.id, mode, notes: stack.map((s) => root + s) }
}

export const extensionsExercise: ExerciseDef = {
  id: 'extensions',
  name: '9ths, 6ths and added notes',
  blurb:
    'Hear a chord with extra notes on top of the triad and name it. Chords like maj9, m9 and add9 give modern pop and R&B their rich sound.',
  hintLabel: 'Sounds:',
  question: 'What chord did you hear?',
  items,
  levels,
  makeQuestion,
  playStyle: (mode) => (mode === 'arpeggio' ? { gap: 0.35, hold: 2.6 } : { gap: 0, hold: 2.6 }),
  describe: (q) => {
    const extended = EXTENDED.find((c) => c.id === q.item)
    const notes = q.notes.map(noteName).join(' ')
    if (extended) return `${notes}: ${extended.parts}.`
    const plain = chordById(q.item)
    return `${notes}: ${plain.name.toLowerCase()}.`
  },
  modeLabel: { block: 'together', arpeggio: 'one at a time' },
  phrase: (item) => {
    const name = item.name.toLowerCase()
    return /^[aeiou]/.test(name) ? `an ${name} chord` : `a ${name} chord`
  },
}
