import { SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, spellFrom, type KeyDef, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/**
 * Nashville numbers: chords written as numbers of the key. A plain number is a major chord, "-" makes it minor,
 * "⁷" adds a dominant 7th, "maj7" a major 7th, "/3" puts the 3rd in the bass, "♭7" is the chord a whole step below home.
 */
interface NumberChord {
  text: string // as written: 6-, 5⁷, 1/3, ♭7
  id: string // server-safe
  step: Step // root above the key
  type: string // chord type for SUFFIX
  bass?: Step // slash bass above the root
}
const N = (text: string, id: string, step: Step, type: string, bass?: Step): NumberChord => ({ text, id, step, type, bass })
const NUMBERS: Record<string, NumberChord> = {
  '1': N('1', 'n-1', [0, 0], 'maj'), '4': N('4', 'n-4', [3, 5], 'maj'), '5': N('5', 'n-5', [4, 7], 'maj'),
  '2-': N('2-', 'n-2m', [1, 2], 'min'), '3-': N('3-', 'n-3m', [2, 4], 'min'), '6-': N('6-', 'n-6m', [5, 9], 'min'),
  '1/3': N('1/3', 'n-1/3', [0, 0], 'maj', [2, 4]), '5/7': N('5/7', 'n-5/7', [4, 7], 'maj', [2, 4]), '4/1': N('4/1', 'n-4/1', [3, 5], 'maj', [4, 7]),
  '5⁷': N('5⁷', 'n-5-7', [4, 7], '7'), '1maj7': N('1maj7', 'n-1-maj7', [0, 0], 'maj7'), '2-7': N('2-7', 'n-2m-7', [1, 2], 'm7'), '6-7': N('6-7', 'n-6m-7', [5, 9], 'm7'),
  '♭7': N('♭7', 'n-b7', [6, 10], 'maj'), '♭3': N('♭3', 'n-b3', [2, 3], 'maj'), '♭6': N('♭6', 'n-b6', [5, 8], 'maj'), '4-': N('4-', 'n-4m', [3, 5], 'min'),
}
const MAJORS = ['1', '4', '5']
const MINORS = ['2-', '3-', '6-']
const SLASHES = ['1/3', '5/7', '4/1']
const SEVENTHS = ['5⁷', '1maj7', '2-7', '6-7']
const BORROWED = ['♭7', '♭3', '♭6', '4-']

const ascii = (s: string) => s.replaceAll('♯', '#').replaceAll('♭', 'b')
const keyNamed = (label: string) => KEYS_BY_FIFTHS.find((k) => noteLabel(k.tonic) === label)!
const keyName = (k: KeyDef) => `${noteLabel(k.tonic)} major`
/** The chord a number stands for in a key, written as on a chord chart. */
function chordOf(key: KeyDef, n: NumberChord): string {
  const root = spellFrom(key.tonic, [n.step])[0]
  const symbol = `${noteLabel(root)}${SUFFIX[n.type]}`
  return n.bass ? `${symbol}/${noteLabel(spellFrom(root, [n.bass])[0])}` : symbol
}
const chordId = (symbol: string) => `c-${ascii(symbol)}`

// ---- Questions --------------------------------------------------------------------------------------

interface Asked {
  text: string
  chart?: string
  answer: string // item id
  shortOf: Record<string, string> // every id used, with its label
  near: string[] // likely wrong answers (ids)
  explain: string
}
const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

function toChord(key: KeyDef, pool: string[], rand: () => number, withRow: boolean): Asked {
  const nums = pool.map((p) => NUMBERS[p])
  const n = pick(nums, rand)
  const row = withRow ? [pick(nums, rand), n, pick(nums, rand), NUMBERS['1']].map((x) => x.text) : [n.text]
  const symbol = chordOf(key, n)
  const others = Object.values(NUMBERS).filter((x) => x !== n).map((x) => chordOf(key, x))
  const shortOf: Record<string, string> = { [chordId(symbol)]: symbol }
  others.forEach((o) => (shortOf[chordId(o)] = o))
  return {
    text: withRow ? `In ${keyName(key)}, the chart says ${row.join(' ')}. What chord is ${n.text}?` : `In ${keyName(key)}, what chord is ${n.text}?`,
    answer: chordId(symbol),
    shortOf,
    near: others.map(chordId),
    explain: `In ${keyName(key)}, ${n.text} is ${symbol}: count ${n.step[0] + 1} notes up the scale from ${noteLabel(key.tonic)}${n.type === 'min' || n.type === 'm7' ? ', and "-" makes it minor' : ''}${n.bass ? ', and the number after the slash is the bass note, counted in the key' : ''}. Try it: play ${row.map((t) => chordOf(key, Object.values(NUMBERS).find((x) => x.text === t)!)).join(' ')}.`,
  }
}

function toNumber(key: KeyDef, pool: string[], rand: () => number): Asked {
  const n = NUMBERS[pick(pool, rand)]
  const symbol = chordOf(key, n)
  const shortOf: Record<string, string> = {}
  Object.values(NUMBERS).forEach((x) => (shortOf[x.id] = x.text))
  return {
    text: `In ${keyName(key)}, which number is ${symbol}?`,
    answer: n.id,
    shortOf,
    near: pool.map((p) => NUMBERS[p].id),
    explain: `${symbol} is ${n.text} in ${keyName(key)}: ${noteLabel(spellFrom(key.tonic, [n.step])[0])} is note ${n.step[0] + 1} of the scale${['min', 'm7'].includes(n.type) ? ', minor, so "-"' : ''}.`,
  }
}

function chartQuestion(key: KeyDef, rand: () => number): Asked {
  const pool = [...MAJORS, ...MINORS, '1/3', '5⁷']
  const bars = ['1', pick(pool, rand), pick(pool, rand), pick(pool, rand), '4', '5', '1', pick(pool, rand)]
  const at = Math.floor(rand() * bars.length)
  const n = NUMBERS[bars[at]]
  const symbol = chordOf(key, n)
  const shortOf: Record<string, string> = { [chordId(symbol)]: symbol }
  bars.forEach((b) => (shortOf[chordId(chordOf(key, NUMBERS[b]))] = chordOf(key, NUMBERS[b])))
  const chart = `Key: ${noteLabel(key.tonic)}\n| ${bars.slice(0, 4).join(' | ')} |\n| ${bars.slice(4).join(' | ')} |`
  return {
    text: `Which chord do you play in bar ${at + 1}?`,
    chart,
    answer: chordId(symbol),
    shortOf,
    near: bars.map((b) => chordId(chordOf(key, NUMBERS[b]))),
    explain: `Bar ${at + 1} is ${n.text}, which in ${keyName(key)} is ${symbol}. The whole chart: ${bars.map((b) => chordOf(key, NUMBERS[b])).join(' ')}.`,
  }
}

const C = keyNamed('C')
const GF = ['G', 'F'].map(keyNamed)
const keysAll = KEYS_BY_FIFTHS
/** Keys where ♭3, ♭6 and ♭7 are spelled the way charts write them (in E♭, ♭6 would be C♭). */
const BORROW_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'B♭'].map(keyNamed)

function questionFor(level: number, rand: () => number): Asked {
  switch (level) {
    case 1: return toChord(C, MAJORS, rand, false)
    case 2: return toChord(pick(GF, rand), MAJORS, rand, true)
    case 3: return toChord(pick(keysAll, rand), MAJORS, rand, true)
    case 4: return toNumber(pick(keysAll, rand), MAJORS, rand)
    case 5: return rand() < 0.5 ? toChord(pick(keysAll, rand), [...MAJORS, ...MINORS], rand, true) : toNumber(pick(keysAll, rand), [...MAJORS, ...MINORS], rand)
    case 6: return rand() < 0.5 ? toChord(pick(keysAll, rand), SLASHES, rand, false) : toNumber(pick(keysAll, rand), SLASHES, rand)
    case 7: return rand() < 0.5 ? toChord(pick(keysAll, rand), SEVENTHS, rand, false) : toNumber(pick(keysAll, rand), SEVENTHS, rand)
    case 8: return rand() < 0.5 ? toChord(pick(BORROW_KEYS, rand), BORROWED, rand, false) : toNumber(pick(BORROW_KEYS, rand), BORROWED, rand)
    case 9: return chartQuestion(pick(keysAll, rand), rand)
    default: return questionFor(1 + Math.floor(rand() * 9), rand)
  }
}

// ---- Answers and levels -----------------------------------------------------------------------------

function seeded(seed: number): () => number {
  let x = seed
  return () => (x = (x * 48271) % 2147483647) / 2147483647
}
const LEVEL_ANSWERS = new Map<number, string[]>()
const labelOf = new Map<string, string>()
for (let level = 1; level <= 10; level++) {
  const rand = seeded(3000 + level)
  const count = new Map<string, number>()
  for (let i = 0; i < 4000; i++) {
    const a = questionFor(level, rand)
    count.set(a.answer, (count.get(a.answer) ?? 0) + 1)
    Object.entries(a.shortOf).forEach(([id, s]) => labelOf.set(id, s))
  }
  LEVEL_ANSWERS.set(level, [...count].filter(([, n]) => n >= 10).map(([id]) => id))
}
/** What a label sounds like, so two tiles never sound the same (C♯ and D♭). */
function soundOf(id: string): string {
  if (id.startsWith('n-')) return id
  const pc = (name: string) => (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[name[0]] + (name.includes('♯') ? 1 : name.includes('♭') ? -1 : 0) + 12) % 12
  const label = labelOf.get(id)!
  const [main, bass] = label.split('/')
  const root = main.match(/^[A-G][♯♭]?/)![0]
  return `${pc(root)}${main.slice(root.length)}${bass ? `/${pc(bass)}` : ''}`
}
const allIds = [...new Set([...LEVEL_ANSWERS.values()].flat())]
const items: readonly Item[] = allIds.map((id) => ({
  id,
  short: labelOf.get(id)!,
  name: id.startsWith('n-') ? `Number ${labelOf.get(id)!}` : `The ${labelOf.get(id)!} chord`,
  hint: id.startsWith('n-') ? 'Count up the scale from the key note' : 'Count up the scale from the key note',
}))

const LEVEL_TEXT: [string, string][] = [
  ['1, 4 and 5 in C', 'Session players write chords as numbers of the key: 1 is the home chord, 4 and 5 the other two major chords. In C: 1 = C, 4 = F, 5 = G.'],
  ['G and F', 'The same numbers in G and F: count up the scale from the key note.'],
  ['Any key', '1, 4 and 5 in every key. This is why bands love numbers: the chart works in any key.'],
  ['Chords to numbers', 'The other way round: which number is this chord?'],
  ['Minor numbers', '"-" means minor: 2-, 3- and 6-. In C: Dm, Em, Am.'],
  ['Slash numbers', 'The number after the slash is the bass note, counted in the key: in C, 1/3 is C/E and 5/7 is G/B.'],
  ['7ths', '5⁷ is a dominant 7th (G7 in C); 1maj7 and 2-7 are written as they sound.'],
  ['Borrowed numbers', '♭7, ♭3 and ♭6 are major chords borrowed from minor (B♭, E♭, A♭ in C); 4- is the minor four.'],
  ['A number chart', 'Read a whole chart written in numbers, in any key.'],
  ['Everything', 'Any of the above.'],
]
const QUIZ = ['chord'] as const satisfies readonly Mode[]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: LEVEL_ANSWERS.get(i + 1)!, modes: QUIZ, lowRange: [48, 72] as const }))

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  let a = questionFor(level.id, rand)
  for (let tries = 0; a.answer !== item.id && tries < 20000; tries++) a = questionFor(level.id, rand)
  const offered = [item.id]
  const sounds = new Set([soundOf(item.id)])
  const offer = (id: string) => {
    if (offered.length >= 4 || offered.includes(id) || !level.items.includes(id) || id.startsWith('n-') !== item.id.startsWith('n-') || sounds.has(soundOf(id))) return
    offered.push(id)
    sounds.add(soundOf(id))
  }
  a.near.forEach(offer)
  for (const id of level.items) if (rand() < 0.3) offer(id)
  level.items.forEach(offer)
  return {
    root: 60, item: item.id, mode: 'chord', notes: [60],
    prompt: { text: a.text, ...(a.chart ? { chart: a.chart } : {}) },
    choices: offered,
    explain: a.explain,
  }
}

export const nashvilleExercise: ExerciseDef = {
  id: 'nashville',
  name: 'Nashville numbers',
  kind: 'quiz',
  blurb: 'The number system session players use: chords written as numbers of the key (1 4 5 6-), so one chart works in any key. Read numbers as chords and chords as numbers, with minors, slashes, 7ths and borrowed chords.',
  rangeWord: 'chord',
  hintLabel: 'Hint:',
  question: 'Read the numbers.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'numbers' },
  phrase: (item) => (item.id.startsWith('n-') ? `number ${item.short}` : `the ${item.short} chord`),
}
