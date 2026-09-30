import { DEGREE_SEMITONES, keyContext, keyLabel, type Help, type KeyMode } from '../harmony'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../notes'
import { noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Display order is pitch order, so neighbouring tiles are neighbouring notes. */
const DEGREES: readonly { id: string; short: string; name: string; hint: string; letters: number; ordinal: string }[] = [
  { id: '1', short: '1', name: 'Home (tonic)', hint: 'Home: everything rests here', letters: 0, ordinal: 'home note' },
  { id: '2', short: '2', name: 'Second', hint: 'Lifts gently and wants to fall back home', letters: 1, ordinal: '2nd' },
  { id: 'b3', short: '♭3', name: 'Flat third', hint: 'Darker and sadder: the note that makes a chord minor', letters: 2, ordinal: 'flat 3rd' },
  { id: '3', short: '3', name: 'Third', hint: 'Bright and sweet: the note that makes a chord major', letters: 2, ordinal: '3rd' },
  { id: '4', short: '4', name: 'Fourth', hint: 'A little restless, leaning down toward the 3rd', letters: 3, ordinal: '4th' },
  { id: '#4', short: '♯4', name: 'Sharp fourth', hint: 'Tense and edgy: the tritone above home', letters: 3, ordinal: 'sharp 4th' },
  { id: '5', short: '5', name: 'Fifth', hint: 'Open and strong: the steadiest note after home', letters: 4, ordinal: '5th' },
  { id: 'b6', short: '♭6', name: 'Flat sixth', hint: 'Yearning and dark, pulling down toward the 5th', letters: 5, ordinal: 'flat 6th' },
  { id: '6', short: '6', name: 'Sixth', hint: 'Warm and wistful: home of the relative minor', letters: 5, ordinal: '6th' },
  { id: 'b7', short: '♭7', name: 'Flat seventh', hint: 'Bluesy and relaxed, not pulling up to home', letters: 6, ordinal: 'flat 7th' },
  { id: '7', short: '7', name: 'Seventh (leading note)', hint: 'Tense: leans up into home', letters: 6, ordinal: '7th' },
]

const items: readonly Item[] = DEGREES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const SIX = ['1', '2', '3', '4', '5', '6', '7']
const MAJOR = ['major'] as const satisfies readonly Mode[]
const NEAR: readonly [number, number] = [60, 76]
const WIDE: readonly [number, number] = [43, 84]
const FULL: readonly [number, number] = [36, 96]

const levels: readonly Level[] = [
  { id: 1, name: 'Home and its fifth', blurb: 'The two steadiest notes of a key: the home note (1) and the fifth (5).', items: ['1', '5'], modes: MAJOR, lowRange: NEAR },
  { id: 2, name: 'The third', blurb: 'Add the third, the sweet note that makes the home chord major.', items: ['1', '3', '5'], modes: MAJOR, lowRange: NEAR },
  { id: 3, name: 'Steps', blurb: 'Add the second, a step above home.', items: ['1', '2', '3', '5'], modes: MAJOR, lowRange: NEAR },
  { id: 4, name: 'The fourth', blurb: 'Add the fourth, which leans down toward the third.', items: ['1', '2', '3', '4', '5'], modes: MAJOR, lowRange: NEAR },
  { id: 5, name: 'The whole scale', blurb: 'All seven notes of the major scale.', items: SIX, modes: MAJOR, lowRange: NEAR },
  { id: 6, name: 'Anywhere on the keyboard', blurb: 'The same seven notes, high and low, so you cannot lean on the nearest note.', items: SIX, modes: MAJOR, lowRange: WIDE },
  { id: 7, name: 'Just the home chord', blurb: 'Less help: only the home chord plays before the note, not the whole cadence.', items: SIX, modes: MAJOR, lowRange: WIDE, help: 'light' },
  { id: 8, name: 'A minor key', blurb: 'The notes of a natural minor key: 1, 2, ♭3, 4, 5, ♭6, ♭7.', items: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], modes: ['minor'], lowRange: WIDE },
  { id: 9, name: 'Colour notes', blurb: 'Notes from outside the major scale, the ones that give pop and R&B their flavour: ♭3, ♯4, ♭6, ♭7.', items: ['1', '3', '5', 'b3', '#4', 'b6', 'b7'], modes: MAJOR, lowRange: WIDE, help: 'light' },
  { id: 10, name: 'Everything', blurb: 'All eleven notes, major and minor keys, every key, the whole keyboard.', items: DEGREES.map((d) => d.id), modes: ['major', 'minor'], lowRange: FULL, help: 'light' },
]

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const keyMode = mode as KeyMode
  const help: Help = level.help ?? 'full'
  const semitones = DEGREE_SEMITONES[item.id]
  // The key: any of the twelve, with its home chord sitting between C3 and B3.
  const tonicPc = Math.floor(rand() * 12)
  const tonic = 48 + tonicPc
  // The note: the right pitch class, in an octave chosen from the level's register.
  const [lo, hi] = [Math.max(level.lowRange[0], LOWEST_MIDI), Math.min(level.lowRange[1], HIGHEST_MIDI)]
  const candidates: number[] = []
  for (let midi = lo; midi <= hi; midi++) if ((midi - tonicPc - semitones + 120) % 12 === 0) candidates.push(midi)
  const target = candidates[Math.floor(rand() * candidates.length)]
  const { events: context, end } = keyContext(tonic, keyMode, help)
  return {
    root: target,
    item: item.id,
    mode,
    notes: [target],
    events: [...context, { time: end + 0.45, hold: 2.4, notes: [target] }],
    // After the answer: the note that was asked (first) and the home note it is measured from.
    lit: [target, target - semitones],
  }
}

export const scaleDegreesExercise: ExerciseDef = {
  id: 'scale-degrees',
  name: 'Scale degrees',
  blurb:
    'Hear a key, then one note, and name the note by its number in the scale. Hearing 1, 3, 5 and 7 as numbers is how you play a melody in any key.',
  rangeWord: 'note',
  hintLabel: 'Feels:',
  question: 'Which note of the key was that?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => {
    const keyMode = q.mode as KeyMode
    const degree = DEGREES.find((d) => d.id === q.item)!
    const semitones = DEGREE_SEMITONES[q.item]
    const tonicPc = (q.root - semitones + 120) % 12
    const { tonic, label } = keyLabel(tonicPc, keyMode)
    const note = noteLabel(spellFrom(tonic, [[degree.letters, semitones]])[0])
    return `In ${label}: the note was ${note}, the ${degree.ordinal}.`
  },
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => `the ${DEGREES.find((d) => d.id === item.id)!.ordinal}`,
}
