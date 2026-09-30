import { HIGHEST_MIDI, LOWEST_MIDI, isBlackKey } from '../notes'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The twelve keys in an octave. Every black key has two names, so both are on its tile. */
const PITCHES = [
  { id: 'C', short: 'C', name: 'C', hint: 'the white key just left of a pair of black keys' },
  { id: 'C#', short: 'C♯ / D♭', name: 'C sharp or D flat', hint: 'the first black key of a pair' },
  { id: 'D', short: 'D', name: 'D', hint: 'the white key between a pair of black keys' },
  { id: 'D#', short: 'D♯ / E♭', name: 'D sharp or E flat', hint: 'the second black key of a pair' },
  { id: 'E', short: 'E', name: 'E', hint: 'the white key just right of a pair of black keys' },
  { id: 'F', short: 'F', name: 'F', hint: 'the white key just left of a trio of black keys' },
  { id: 'F#', short: 'F♯ / G♭', name: 'F sharp or G flat', hint: 'the first black key of a trio' },
  { id: 'G', short: 'G', name: 'G', hint: 'the white key between the first two black keys of a trio' },
  { id: 'G#', short: 'G♯ / A♭', name: 'G sharp or A flat', hint: 'the middle black key of a trio' },
  { id: 'A', short: 'A', name: 'A', hint: 'the white key between the last two black keys of a trio' },
  { id: 'A#', short: 'A♯ / B♭', name: 'A sharp or B flat', hint: 'the last black key of a trio' },
  { id: 'B', short: 'B', name: 'B', hint: 'the white key just right of a trio of black keys' },
] as const

const pcOf = (id: string): number => PITCHES.findIndex((p) => p.id === id)
const pitch = (pc: number) => PITCHES[((pc % 12) + 12) % 12]

/** Middle C is C4, MIDI 60; C1 is 24 and C8 is 108. */
const octaves = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: `C${n}`,
  short: `C${n}`,
  name: n === 4 ? 'Middle C' : `C, octave ${n}`,
  hint: n === 4 ? 'near the middle of the keyboard' : n > 4 ? `${n - 4} ${n - 4 === 1 ? 'octave' : 'octaves'} above middle C` : `${4 - n} ${4 - n === 1 ? 'octave' : 'octaves'} below middle C`,
  midi: 12 * (n + 1),
}))

const items: readonly Item[] = [
  ...PITCHES.map(({ id, short, name, hint }) => ({ id, short, name, hint })),
  ...octaves.map(({ id, short, name, hint }) => ({ id, short, name, hint })),
]

const ids = (...list: string[]) => list
const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK = ['C#', 'D#', 'F#', 'G#', 'A#']
const ALL = PITCHES.map((p) => p.id)
const OCT = octaves.map((o) => o.id)
const NEAR: readonly [number, number] = [60, 71]
const ANY: readonly [number, number] = [36, 83]

/** Starts the question can use for "a half/whole step above/below X": natural notes only, so the names stay plain. */
function starts(answerPc: number, semitones: 1 | 2): { pc: number; dir: 'above' | 'below' }[] {
  const out: { pc: number; dir: 'above' | 'below' }[] = []
  for (const [pc, dir] of [[answerPc - semitones, 'above'], [answerPc + semitones, 'below']] as const) {
    const wrapped = ((pc % 12) + 12) % 12
    if (!isBlackKey(60 + wrapped)) out.push({ pc: wrapped, dir })
  }
  return out
}

/** Answers for which a half-step (or whole-step) question from a natural note exists. */
const reachable = (semitones: 1 | 2) => ALL.filter((id) => starts(pcOf(id), semitones).length > 0)

const levels: readonly Level[] = [
  { id: 1, name: 'Three white keys', blurb: 'C, D and E. Look at the black keys around each white key: they are how you find your place.', items: ids('C', 'D', 'E'), modes: ['name'], lowRange: NEAR },
  { id: 2, name: 'C to G', blurb: 'Add F and G.', items: ids('C', 'D', 'E', 'F', 'G'), modes: ['name'], lowRange: NEAR },
  { id: 3, name: 'All the white keys', blurb: 'The seven white notes, C to B, then the pattern starts again.', items: WHITE, modes: ['name'], lowRange: NEAR },
  { id: 4, name: 'The black keys', blurb: 'Every black key has two names: a sharp (♯, the note above the white key on its left) and a flat (♭, the note below the white key on its right).', items: BLACK, modes: ['name'], lowRange: NEAR },
  { id: 5, name: 'All twelve', blurb: 'Every key in one octave: seven white, five black.', items: ALL, modes: ['name'], lowRange: NEAR },
  { id: 6, name: 'Any octave', blurb: 'The same twelve names in other parts of the keyboard.', items: ALL, modes: ['name'], lowRange: ANY },
  { id: 7, name: 'A half step', blurb: 'A half step is to the very next key, black or white. Which note is a half step above or below a white key?', items: reachable(1), modes: ['half'], lowRange: NEAR },
  { id: 8, name: 'A whole step', blurb: 'A whole step skips one key: two half steps.', items: reachable(2), modes: ['whole'], lowRange: NEAR },
  { id: 9, name: 'The Cs of the piano', blurb: 'Every C has a number. Middle C is C4; each octave up adds one.', items: OCT, modes: ['octave'], lowRange: [LOWEST_MIDI, HIGHEST_MIDI] },
  { id: 10, name: 'Everything', blurb: 'Names, half steps, whole steps and the numbered Cs, all over the keyboard.', items: [...ALL, ...OCT], modes: ['name', 'half', 'whole', 'octave'], lowRange: [LOWEST_MIDI, HIGHEST_MIDI] },
]

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]
}

/** A key with this pitch class inside the level's register. */
function keyIn(pc: number, [lo, hi]: readonly [number, number], rand: () => number): number {
  const options: number[] = []
  for (let midi = Math.max(lo, LOWEST_MIDI); midi <= Math.min(hi, HIGHEST_MIDI); midi++) if (midi % 12 === ((pc % 12) + 12) % 12) options.push(midi)
  return pick(options, rand)
}

function makeQuestion(level: Level, item: Item, asked: Mode, rand: () => number): Question {
  const isOctave = item.id.length === 2 && item.id.startsWith('C') && /\d/.test(item.id[1])
  // An answer that does not suit the requested kind of question falls back to one that does.
  let mode: Mode = isOctave ? 'octave' : asked === 'octave' ? 'name' : asked
  if (!isOctave && (mode === 'half' || mode === 'whole') && starts(pcOf(item.id), mode === 'half' ? 1 : 2).length === 0) mode = 'name'

  if (mode === 'octave') {
    const octave = octaves.find((o) => o.id === item.id)!
    return {
      root: octave.midi, item: item.id, mode, notes: [octave.midi],
      prompt: { text: 'Which C is lit?', lit: [octave.midi] },
      explain: `That is ${octave.short}${octave.id === 'C4' ? ', middle C' : ''}: ${octave.hint}.`,
    }
  }
  const answerPc = pcOf(item.id)
  if (mode === 'name') {
    const midi = keyIn(answerPc, level.lowRange, rand)
    const p = pitch(answerPc)
    return {
      root: midi, item: item.id, mode, notes: [midi],
      prompt: { text: 'Which note is lit?', lit: [midi] },
      explain: `That key is ${p.short}: ${p.hint}.`,
    }
  }
  const semitones = mode === 'half' ? 1 : 2
  const from = pick(starts(answerPc, semitones), rand)
  const start = keyIn(from.pc, level.lowRange, rand)
  const startName = pitch(from.pc).short
  const answerName = pitch(answerPc).short
  return {
    root: start, item: item.id, mode, notes: [start],
    prompt: { text: `What is a ${mode} step ${from.dir} ${startName}?`, lit: [start] },
    explain: `A ${mode} step ${from.dir} ${startName} is ${answerName}${semitones === 1 ? ': the very next key' : ': skipping one key'}.`,
  }
}

export const noteNamesExercise: ExerciseDef = {
  id: 'note-names',
  name: 'Keyboard map and note names',
  kind: 'quiz',
  blurb: 'Find your way around the keyboard: name the lit key, using the pattern of black keys, then half steps, whole steps and the numbered Cs.',
  rangeWord: 'notes',
  hintLabel: 'Clue:',
  question: 'Which note is lit?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { name: 'name the key', half: 'half steps', whole: 'whole steps', octave: 'octaves' },
  phrase: (item) => `the key ${item.short}`,
}
