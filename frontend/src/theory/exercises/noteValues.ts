import type { ExerciseDef, Item, Level, Mode, NoteValue, Question, StaffItem } from '../types'

/** Note and rest symbols, and how long each lasts in 4/4 (a quarter note is one beat). */
const BASE: Record<NoteValue, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25 }
interface Sym { id: string; value: NoteValue; dot?: boolean; rest?: boolean; name: string; short: string }
const SYMBOLS: readonly Sym[] = [
  { id: 'whole', value: 'whole', name: 'Whole note', short: 'Whole' },
  { id: 'half', value: 'half', name: 'Half note', short: 'Half' },
  { id: 'quarter', value: 'quarter', name: 'Quarter note', short: 'Quarter' },
  { id: 'eighth', value: 'eighth', name: 'Eighth note', short: 'Eighth' },
  { id: 'sixteenth', value: 'sixteenth', name: 'Sixteenth note', short: '16th' },
  { id: 'dotted-half', value: 'half', dot: true, name: 'Dotted half note', short: 'Dotted half' },
  { id: 'dotted-quarter', value: 'quarter', dot: true, name: 'Dotted quarter note', short: 'Dotted quarter' },
  { id: 'dotted-eighth', value: 'eighth', dot: true, name: 'Dotted eighth note', short: 'Dotted 8th' },
  { id: 'whole-rest', value: 'whole', rest: true, name: 'Whole rest', short: 'Whole rest' },
  { id: 'half-rest', value: 'half', rest: true, name: 'Half rest', short: 'Half rest' },
  { id: 'quarter-rest', value: 'quarter', rest: true, name: 'Quarter rest', short: 'Quarter rest' },
  { id: 'eighth-rest', value: 'eighth', rest: true, name: 'Eighth rest', short: '8th rest' },
]
const SYM = new Map(SYMBOLS.map((s) => [s.id, s]))
export const beatsOf = (s: { value: NoteValue; dot?: boolean }) => BASE[s.value] * (s.dot ? 1.5 : 1)

const BEATS = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25]
const FRACTION: Record<number, string> = { 1.5: '1½', 0.75: '¾', 0.5: '½', 0.25: '¼' }
const beatId = (b: number) => `b${b}`
const BAR = [
  { id: 'full', short: 'Exactly 4', name: 'Exactly four beats', hint: 'The bar is full' },
  { id: 'short', short: 'Fewer than 4', name: 'Fewer than four beats', hint: 'Something is missing' },
  { id: 'over', short: 'More than 4', name: 'More than four beats', hint: 'Too much for one bar' },
]
const items: readonly Item[] = [
  ...SYMBOLS.map((s) => ({ id: s.id, short: s.short, name: s.name, hint: `${FRACTION[beatsOf(s)] ?? beatsOf(s)} beat${beatsOf(s) === 1 ? '' : 's'} in 4/4` })),
  ...BEATS.map((b) => ({ id: beatId(b), short: FRACTION[b] ?? String(b), name: `${FRACTION[b] ?? b} beat${b === 1 ? '' : 's'}`, hint: 'A quarter note is one beat' })),
  ...BAR,
]

const NOTES = ['whole', 'half', 'quarter', 'eighth', 'sixteenth']
const RESTS = ['whole-rest', 'half-rest', 'quarter-rest', 'eighth-rest']
const DOTS = ['half', 'dotted-half', 'quarter', 'dotted-quarter', 'eighth', 'dotted-eighth']
const ALL_NAMES = [...NOTES, 'dotted-half', 'dotted-quarter', 'dotted-eighth', ...RESTS]
const SETUP: Record<number, { answers: readonly string[]; ties?: boolean }> = {
  1: { answers: ['whole', 'half', 'quarter'] },
  2: { answers: NOTES },
  3: { answers: RESTS },
  4: { answers: DOTS },
  5: { answers: [4, 2, 1, 0.5, 0.25].map(beatId) },
  6: { answers: BEATS.map(beatId) },
  7: { answers: [4, 3, 2, 1.5, 1].map(beatId), ties: true },
  8: { answers: ['full', 'short', 'over'] },
  9: { answers: ALL_NAMES },
  10: { answers: [...ALL_NAMES, ...BEATS.map(beatId), 'full', 'short', 'over'] },
}

const NAME = ['name'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string][] = [
  ['Whole, half, quarter', 'Name the note. Whole: an open head and no stem. Half: open head with a stem. Quarter: a filled head with a stem.'],
  ['Eighths and sixteenths', 'One flag is an eighth note, two flags a sixteenth.'],
  ['Rests', 'Silences: the whole rest hangs below a line, the half rest sits on one.'],
  ['Dots', 'A dot adds half the note\'s length again: a dotted half is 2 + 1 = 3 beats.'],
  ['How many beats?', 'In 4/4 a quarter note is one beat. How long does this note last?'],
  ['Beats with dots and rests', 'Notes and rests, dotted too.'],
  ['Ties', 'A tie joins two notes into one longer note: add them up.'],
  ['Full bar?', 'A bar of 4/4 holds exactly four beats. Does this one?'],
  ['All the symbols', 'Every note and rest by name.'],
  ['Everything', 'Names, beats and bars.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: SETUP[i + 1].answers, modes: NAME, lowRange: [60, 72] as const }))

const MIDDLE = 34 // B4, the middle line of the treble staff
const draw = (s: Sym, tieToNext = false): StaffItem => (s.rest ? { kind: 'rest', value: s.value, dot: s.dot } : { kind: 'note', step: MIDDLE, value: s.value, dot: s.dot, tieToNext })
const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const groupOf = (id: string) => (SYM.has(id) ? 'name' : id.startsWith('b') ? 'beats' : 'bar')

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const group = groupOf(item.id)
  // Offer only answers of the same kind (names, beat counts or bar verdicts), at most six.
  const same = level.items.filter((id) => groupOf(id) === group && id !== item.id).map((id) => ({ id, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.id)
  const choices = [item.id, ...same.slice(0, 5)]
  const base = { root: 71, item: item.id, mode: 'name' as const, notes: [71], choices }
  if (group === 'name') {
    const s = SYM.get(item.id)!
    return { ...base, prompt: { text: 'What is this?', staff: { clef: 'none', items: [draw(s)] } }, explain: `${s.name}: ${beatsOf(s)} beat${beatsOf(s) === 1 ? '' : 's'} in 4/4. Try it: clap it while counting "1 2 3 4".` }
  }
  if (group === 'beats') {
    const want = Number(item.id.slice(1))
    if (setup.ties) {
      const notes = SYMBOLS.filter((s) => !s.rest && !s.dot)
      const pairs = notes.flatMap((a) => notes.map((b) => [a, b] as const)).filter(([a, b]) => beatsOf(a) + beatsOf(b) === want && beatsOf(a) >= beatsOf(b))
      const [a, b] = pick(pairs, rand)
      return { ...base, prompt: { text: 'Tied together, how many beats?', staff: { clef: 'none', items: [draw(a, true), draw(b)] } }, explain: `${a.name} (${beatsOf(a)}) tied to a ${b.name.toLowerCase()} (${beatsOf(b)}): one note of ${want} beats. Try it: play it and hold it for the whole count.` }
    }
    const pool = SYMBOLS.filter((s) => beatsOf(s) === want && (level.id >= 6 || (!s.rest && !s.dot)))
    const s = pick(pool, rand)
    return { ...base, prompt: { text: 'How many beats does it last in 4/4?', staff: { clef: 'none', items: [draw(s)] } }, explain: `${s.name}: ${want} beat${want === 1 ? '' : 's'}${s.dot ? ` (${beatsOf({ value: s.value })} plus half of it again for the dot)` : ''}.` }
  }
  // A bar of two to four symbols whose total is exactly four, under or over.
  for (;;) {
    const n = 2 + Math.floor(rand() * 3)
    const syms = Array.from({ length: n }, () => pick(SYMBOLS.filter((s) => s.value !== 'sixteenth' && s.id !== 'dotted-eighth'), rand))
    const total = syms.reduce((t, s) => t + beatsOf(s), 0)
    const verdict = total === 4 ? 'full' : total < 4 ? 'short' : 'over'
    if (verdict !== item.id) continue
    return { ...base, prompt: { text: 'Does this bar of 4/4 add up to four beats?', staff: { clef: 'none', items: syms.map((s) => draw(s)), barEnd: true } }, explain: `${syms.map((s) => beatsOf(s)).join(' + ')} = ${total} beats: ${verdict === 'full' ? 'exactly a bar of 4/4' : verdict === 'short' ? 'fewer than four' : 'more than four'}.` }
  }
}

export const noteValuesExercise: ExerciseDef = {
  id: 'note-values',
  name: 'Note values and rests',
  kind: 'quiz',
  noYourTurn: true,
  blurb: 'Name notes and rests from whole to sixteenth, dotted and tied, and count how many beats they last in 4/4. Then check whether a bar adds up.',
  hintLabel: 'Length:',
  question: 'What is this?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { name: 'symbol' },
  phrase: (item) => item.name.toLowerCase(),
  tip: 'Each value is half the one before: whole 4, half 2, quarter 1, eighth ½, sixteenth ¼ (in 4/4). A dot adds half again; a tie adds the next note on.',
}
