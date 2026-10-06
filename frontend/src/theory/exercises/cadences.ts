import { chordEvent, chordName, keyContext, keyLabel, STACK, voiceProgression, type Help, type KeyMode } from '../harmony'
import { spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'
import { MAJOR, MINOR } from './progressions'

interface Cadence extends Item {
  /** The last two chords in a major and a minor key; `null` before the V of a half cadence means "any chord that leads to it". */
  major: [string | null, string]
  minor: [string | null, string]
  feel: string
}

const CADENCES: readonly Cadence[] = [
  { id: 'perfect', short: 'Perfect', name: 'Perfect cadence (V–I)', hint: 'A full stop: home, settled', major: ['V', 'I'], minor: ['V', 'i'], feel: 'A full stop: the tension of V resolves home.' },
  { id: 'plagal', short: 'Plagal', name: 'Plagal cadence (IV–I)', hint: 'The soft "amen" ending', major: ['IV', 'I'], minor: ['iv', 'i'], feel: 'The soft "amen" ending: home, but without the pull of V.' },
  { id: 'half', short: 'Half', name: 'Half cadence (ends on V)', hint: 'A comma: it stops, but waits to go on', major: [null, 'V'], minor: [null, 'V'], feel: 'A comma: the phrase rests on V and waits to go on.' },
  { id: 'deceptive', short: 'Deceptive', name: 'Deceptive cadence (V–vi)', hint: 'A surprise: you expect home, it swerves', major: ['V', 'vi'], minor: ['V', 'VI'], feel: 'A surprise: V promises home, then swerves to vi (VI in minor).' },
]
const BY_ID = new Map(CADENCES.map((c) => [c.id, c]))
const items: readonly Item[] = CADENCES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Chords that can come before the cadence (lead-in), and before the V of a half cadence. */
const LEAD = { major: ['I', 'vi', 'ii', 'IV', 'iii'], minor: ['i', 'VI', 'iv', 'III'] }
const BEFORE_V = { major: ['ii', 'IV'], minor: ['iv', 'VI'] }

interface Setup {
  inC: boolean
  /** V as a dominant 7th in the perfect and deceptive cadences. */
  v7: boolean
  /** One or two lead-in chords from the key, instead of just the home chord. */
  varied: boolean
}
const SETUP: Record<number, Setup> = {
  1: { inC: true, v7: false, varied: false },
  2: { inC: true, v7: false, varied: false },
  3: { inC: true, v7: false, varied: false },
  4: { inC: true, v7: true, varied: false },
  5: { inC: false, v7: true, varied: false },
  6: { inC: false, v7: true, varied: true },
  7: { inC: false, v7: true, varied: true },
  8: { inC: false, v7: true, varied: true },
  9: { inC: false, v7: true, varied: true },
  10: { inC: false, v7: true, varied: true },
}

const ALL = CADENCES.map((c) => c.id)
const MAJ = ['major'] as const satisfies readonly Mode[]
const MIN = ['minor'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 77]
const levels: readonly Level[] = [
  { id: 1, name: 'Full stop or comma', blurb: 'Hear a key, then a short phrase. Does it end at home (perfect cadence, V–I) or stop on V and wait (half cadence)?', items: ['perfect', 'half'], modes: MAJ, lowRange: RANGE },
  { id: 2, name: 'Amen', blurb: 'Add the plagal cadence, IV–I: home again, but softer, the "amen" at the end of a hymn.', items: ['perfect', 'plagal', 'half'], modes: MAJ, lowRange: RANGE },
  { id: 3, name: 'The surprise', blurb: 'Add the deceptive cadence: V leads you to expect home, then goes to vi instead.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 4, name: 'With the 7th', blurb: 'V becomes V7 in the perfect and deceptive cadences, so the pull home is stronger.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 5, name: 'Any key', blurb: 'The same four endings in every major key.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 6, name: 'Longer phrases', blurb: 'Different chords lead into the ending, so listen only to the last two.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 7, name: 'Less help', blurb: 'Only the home chord plays before the phrase.', items: ALL, modes: MAJ, lowRange: RANGE, help: 'light' },
  { id: 8, name: 'Minor keys', blurb: 'In minor: V–i, iv–i, a half cadence on V, and the deceptive V–VI.', items: ALL, modes: MIN, lowRange: RANGE },
  { id: 9, name: 'Minor, less help', blurb: 'Minor keys after only the home chord.', items: ALL, modes: MIN, lowRange: RANGE, help: 'light' },
  { id: 10, name: 'Everything', blurb: 'Major and minor, every key, varied phrases, the least help.', items: ALL, modes: ['major', 'minor'], lowRange: RANGE, help: 'light' },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const STEP = 1.2

function makeQuestion(level: Level, item: Item, asked: Mode, rand: () => number): Question {
  const cadence = BY_ID.get(item.id)!
  const keyMode = asked as KeyMode
  const setup = SETUP[level.id]
  const table = keyMode === 'major' ? MAJOR : MINOR
  const home = keyMode === 'major' ? 'I' : 'i'

  // The phrase: the home chord, maybe one or two more, then the cadence; never the same chord twice in a row.
  const [pre, last] = cadence[keyMode]
  const ending = [pre ?? pick(BEFORE_V[keyMode], rand), last]
  const lead = [home]
  if (setup.varied) for (let i = Math.floor(rand() * 2); i >= 0; i--) lead.push(pick(LEAD[keyMode], rand))
  const numerals = [...lead, ...ending].filter((n, i, all) => n !== all[i - 1])

  const tonicPc = setup.inC ? 0 : Math.floor(rand() * 12)
  const sevenths = (n: string, i: number) => setup.v7 && n === 'V' && cadence.id !== 'half' && i === numerals.length - 2
  const types = numerals.map((n, i) => (sevenths(n, i) ? '7' : table[n].triad))
  const voiced = voiceProgression(numerals.map((n, i) => ({ rootPc: (tonicPc + table[n].semis) % 12, stack: STACK[types[i]] })))

  const help: Help = level.help ?? 'full'
  const { events: context, end } = keyContext(48 + tonicPc, keyMode, help)
  const start = end + 0.9
  const chords = voiced.map((v, i) => chordEvent(start + i * STEP, i === voiced.length - 1 ? 2.8 : STEP + 0.3, [v.bass, ...v.upper]))
  const first = chords[0].notes

  const { tonic, label } = keyLabel(tonicPc, keyMode)
  const names = numerals.map((n, i) => chordName(spellFrom(tonic, [[table[n].letters, table[n].semis]])[0], types[i]))
  const numeral = (n: string, i: number) => (types[i] === '7' ? `${n}7` : n)
  return {
    root: first[0], item: item.id, mode: keyMode, notes: first,
    events: [...context, ...chords],
    answerFrom: context.length,
    lit: first,
    steps: chords.map((c, i) => ({ label: `${numeral(numerals[i], i)} · ${names[i]}`, notes: c.notes })),
    explain: `${cadence.name} in ${label}: ${names.join(' ')}. ${cadence.feel}`,
  }
}

export const cadencesExercise: ExerciseDef = {
  id: 'cadences',
  name: 'Cadences',
  blurb: 'Hear a key, then a short phrase, and name how it ends: a full stop (perfect), an amen (plagal), a comma (half) or a surprise (deceptive). Cadences are the punctuation of music.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the key, then the phrase. How does it end?',
  partLabels: { key: 'The key', question: 'How does it end?' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => `a ${BY_ID.get(item.id)!.name.charAt(0).toLowerCase()}${BY_ID.get(item.id)!.name.slice(1)}`,
}
