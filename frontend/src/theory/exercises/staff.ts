import type { ExerciseDef, Item, Level, Mode, Question, StaffSpec } from '../types'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const WHITE = [0, 2, 4, 5, 7, 9, 11]
/** The MIDI number of a diatonic step (C4 = step 28 = MIDI 60) with an accidental. */
export const stepMidi = (step: number, acc = 0) => 12 * (Math.floor(step / 7) + 1) + WHITE[step % 7] + acc

const SHARPS = ['C', 'D', 'F', 'G', 'A'].map((l) => `${l}#`)
const FLATS = ['D', 'E', 'G', 'A', 'B'].map((l) => `${l}b`)
const OCTAVE_CS = ['C2', 'C3', 'C4', 'C5', 'C6']
const label = (id: string) => id.replace('#', '♯').replace(/(?<=[A-G])b/, '♭')
const items: readonly Item[] = [
  ...LETTERS.map((l) => ({ id: l, short: l, name: `the note ${l}`, hint: '' })),
  ...SHARPS.map((id) => ({ id, short: label(id), name: `${label(id)} (sharp)`, hint: 'A ♯ raises the note a half step' })),
  ...FLATS.map((id) => ({ id, short: label(id), name: `${label(id)} (flat)`, hint: 'A ♭ lowers the note a half step' })),
  ...OCTAVE_CS.map((id) => ({ id, short: id, name: id === 'C4' ? 'C4, middle C' : id, hint: id === 'C4' ? 'Between the two staves, one ledger line' : 'Count the octaves from middle C (C4)' })),
].map((i) => ({ ...i, hint: i.hint || 'Count lines and spaces from one you know' }))

type Clef = 'treble' | 'bass'
interface Setup {
  /** Where notes may sit, by clef: diatonic steps. */
  places: Partial<Record<Clef, readonly number[]>>
  answers: readonly string[]
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const TREBLE = range(30, 38) // E4 to F5
const BASS = range(18, 26) // G2 to A3
const TREBLE_LEDGER = [26, 27, 28, 29, 39, 40, 41, 42]
const BASS_LEDGER = [14, 15, 16, 17, 27, 28, 29]
const ALL_LETTERS = LETTERS
const SETUP: Record<number, Setup> = {
  1: { places: { treble: [30, 32, 34, 36, 38] }, answers: ['E', 'G', 'B', 'D', 'F'] },
  2: { places: { treble: [31, 33, 35, 37] }, answers: ['F', 'A', 'C', 'E'] },
  3: { places: { treble: TREBLE }, answers: ALL_LETTERS },
  4: { places: { bass: BASS }, answers: ALL_LETTERS },
  5: { places: { treble: TREBLE_LEDGER, bass: BASS_LEDGER }, answers: ALL_LETTERS },
  6: { places: { treble: TREBLE, bass: BASS }, answers: ALL_LETTERS },
  7: { places: { treble: TREBLE }, answers: [...ALL_LETTERS, ...SHARPS] },
  8: { places: { treble: TREBLE, bass: BASS }, answers: [...ALL_LETTERS, ...FLATS] },
  9: { places: { treble: [28, 35, 42], bass: [14, 21, 28] }, answers: OCTAVE_CS },
  10: { places: { treble: [...TREBLE, ...TREBLE_LEDGER], bass: [...BASS, ...BASS_LEDGER] }, answers: [...ALL_LETTERS, ...SHARPS, ...FLATS] },
}

const NAME = ['name'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string][] = [
  ['Treble lines', 'Notes on the five lines of the treble staff, bottom to top: E G B D F ("Every Good Boy Does Fine").'],
  ['Treble spaces', 'The four spaces spell F A C E, bottom to top.'],
  ['The treble staff', 'Lines and spaces together.'],
  ['The bass staff', 'Bass lines G B D F A ("Good Boys Do Fine Always"), spaces A C E G ("All Cows Eat Grass").'],
  ['Ledger lines', 'Notes above and below the staff, on short extra lines. Count on from the nearest line you know.'],
  ['Both clefs', 'Treble or bass: check the clef first.'],
  ['Sharps', 'A ♯ before a note raises it a half step: name the note with its sharp.'],
  ['Flats', 'A ♭ lowers it a half step. Both clefs.'],
  ['Which C?', 'Middle C is C4, one ledger line between the staves. Name each C by its octave.'],
  ['Everything', 'Both clefs, ledger lines, sharps and flats.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: SETUP[i + 1].answers, modes: NAME, lowRange: [21, 108] as const }))

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

/** Where a step sits on its staff, in words. */
function where(step: number, clef: Clef): string {
  const bottom = clef === 'treble' ? 30 : 18
  const off = step - bottom
  const staff = `${clef} staff`
  if (off >= 0 && off <= 8) return off % 2 === 0 ? `line ${off / 2 + 1} of the ${staff} (counting from the bottom)` : `space ${(off + 1) / 2} of the ${staff}`
  return off < 0 ? `below the ${staff}` : `above the ${staff}`
}

function build(level: Level, answer: string, clef: Clef, step: number, acc: -1 | 0 | 1, rand: () => number): Question {
  const midi = stepMidi(step, acc)
  const spec: StaffSpec = { clef, items: [{ kind: 'note', step, accidental: acc === 0 ? undefined : acc, value: 'whole' }] }
  const octaveName = `${LETTERS[step % 7]}${acc > 0 ? '♯' : acc < 0 ? '♭' : ''}${Math.floor(step / 7)}`
  // A few other answers of the level, so a long list does not fill the screen.
  const others = level.items.filter((i) => i !== answer).map((id) => ({ id, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.id)
  const choices = level.items.length > 7 ? [answer, ...others.slice(0, 5)] : undefined
  return {
    root: midi, item: answer, mode: 'name', notes: [midi],
    prompt: { text: answer.length === 2 && /\d/.test(answer) ? 'Which C is this?' : 'Name this note.', staff: spec },
    choices,
    explain: `${octaveName}: ${where(step, clef)}.${step === 28 ? ' Middle C, between the two staves.' : ''} Try it: find ${octaveName} on the piano (middle C is C4).`,
  }
}

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const acc: -1 | 0 | 1 = item.id.endsWith('#') ? 1 : /^[A-G]b$/.test(item.id) ? -1 : 0
  const letter = item.id[0]
  const octave = /\d/.test(item.id) ? Number(item.id[1]) : null
  const options = (Object.entries(setup.places) as [Clef, number[]][]).flatMap(([clef, steps]) =>
    steps.filter((s) => LETTERS[s % 7] === letter && (octave === null || Math.floor(s / 7) === octave)).map((s) => ({ clef, s })))
  const { clef, s } = pick(options, rand)
  return build(level, item.id, clef, s, acc, rand)
}

export const staffExercise: ExerciseDef = {
  id: 'staff',
  name: 'Reading the staff and clefs',
  kind: 'quiz',
  noYourTurn: true,
  blurb: 'See a note on the treble or bass staff and name it: lines and spaces, ledger lines above and below, sharps and flats, and which octave a C is in.',
  rangeWord: 'note',
  hintLabel: 'Tip:',
  question: 'Name this note.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { name: 'note' },
  phrase: (item) => (item.name.startsWith('the ') ? item.name : `the note ${item.name}`),
  tip: 'Learn a few landmarks and count from them: middle C (one ledger line between the staves), treble G (the line the treble clef curls round) and bass F (the line between the bass clef\'s dots).',
}
