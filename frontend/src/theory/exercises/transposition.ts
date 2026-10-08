import { SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, pitchClass, spellFrom, type KeyDef, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const ascii = (s: string) => s.replaceAll('♯', '#').replaceAll('♭', 'b')
const chordId = (symbol: string) => `c-${ascii(symbol)}`
const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

/** Spellings a chord chart would use (no C♭, F♭, E♯, B♯ or double sharps and flats). */
const plainNote = (n: Note) => Math.abs(n.accidental) <= 1 && !['C♭', 'F♭', 'E♯', 'B♯'].includes(noteLabel(n))

// ---- Chords by Roman numeral ------------------------------------------------------------------------

const DEGREES: Record<string, { step: Step; triad: string; seventh: string }> = {
  I: { step: [0, 0], triad: 'maj', seventh: 'maj7' },
  ii: { step: [1, 2], triad: 'min', seventh: 'm7' },
  iii: { step: [2, 4], triad: 'min', seventh: 'm7' },
  IV: { step: [3, 5], triad: 'maj', seventh: 'maj7' },
  V: { step: [4, 7], triad: 'maj', seventh: '7' },
  vi: { step: [5, 9], triad: 'min', seventh: 'm7' },
}
/** A chord of a key, written as on a chart; `over` is a slash bass as [letters, semitones] above the chord's root. */
function chordIn(key: KeyDef, numeral: string, seventh: boolean, over?: Step): string {
  const d = DEGREES[numeral]
  const root = spellFrom(key.tonic, [d.step])[0]
  const symbol = `${noteLabel(root)}${SUFFIX[seventh ? d.seventh : d.triad]}`
  return over ? `${symbol}/${noteLabel(spellFrom(root, [over])[0])}` : symbol
}
const keyNamed = (label: string) => KEYS_BY_FIFTHS.find((k) => noteLabel(k.tonic) === label)!
const keyName = (k: KeyDef) => `${noteLabel(k.tonic)} major`

const PROGRESSIONS: { numerals: string[]; over?: (Step | undefined)[] }[] = [
  { numerals: ['I', 'V', 'vi', 'IV'] }, { numerals: ['I', 'IV', 'V', 'I'] }, { numerals: ['I', 'vi', 'IV', 'V'] },
  { numerals: ['vi', 'IV', 'I', 'V'] }, { numerals: ['ii', 'V', 'I', 'vi'] }, { numerals: ['I', 'iii', 'IV', 'V'] },
]
/** Progressions with slash chords: the bass walks (C – G/B – Am – F, C – C/E – F – G). */
const SLASH: { numerals: string[]; over: (Step | undefined)[] }[] = [
  { numerals: ['I', 'V', 'vi', 'IV'], over: [undefined, [2, 4], undefined, undefined] },
  { numerals: ['I', 'I', 'IV', 'V'], over: [undefined, [2, 4], undefined, undefined] },
  { numerals: ['IV', 'I', 'V', 'vi'], over: [undefined, [2, 4], [2, 4], undefined] },
]

// ---- Questions --------------------------------------------------------------------------------------

interface Asked {
  text: string
  answer: string
  /** Wrong answers that make sense (other chords of the key, the chord left untransposed, near misses). */
  near: string[]
  explain: string
}

const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(keyNamed).map((k) => k.tonic)
const CAPO_SHAPES = ['C', 'G', 'D', 'A', 'E'].map(keyNamed)

function stepQuestion(up: boolean, rand: () => number): Asked {
  for (;;) {
    const root = pick(NATURALS, rand)
    const minor = rand() < 0.5
    const target = spellFrom(root, [up ? [1, 2] : [6, 10]])[0]
    if (!plainNote(target)) continue
    const sym = (n: Note) => `${noteLabel(n)}${minor ? 'm' : ''}`
    const misses: Step[] = [[1, 1], [1, 3], [6, 11], [2, 4], [0, 0]]
    const near = misses.map((s) => spellFrom(root, [s])[0]).filter(plainNote).map(sym)
    return {
      text: `Move ${sym(root)} ${up ? 'up' : 'down'} a whole step (2 semitones).`,
      answer: sym(target),
      near,
      explain: `${sym(root)} ${up ? 'up' : 'down'} a whole step is ${sym(target)}: the root moves from ${noteLabel(root)} to ${noteLabel(target)}, and the chord stays ${minor ? 'minor' : 'major'}.`,
    }
  }
}

function progQuestion(from: KeyDef, to: KeyDef, seventh: boolean, slash: boolean, rand: () => number): Asked {
  const p = slash ? pick(SLASH, rand) : pick(PROGRESSIONS, rand)
  const over = 'over' in p ? p.over : undefined
  const src = p.numerals.map((n, i) => chordIn(from, n, seventh, over?.[i]))
  const dst = p.numerals.map((n, i) => chordIn(to, n, seventh, over?.[i]))
  const i = Math.floor(rand() * p.numerals.length)
  const numerals = p.numerals.join('–')
  const near = [src[i], ...dst.filter((c) => c !== dst[i]), ...Object.keys(DEGREES).map((n) => chordIn(to, n, seventh))]
  return {
    text: `${src.join(' ')} is ${numerals} in ${keyName(from)}. In ${keyName(to)}, what does ${src[i]} become?`,
    answer: dst[i],
    near,
    explain: `Think in numbers: ${numerals} in ${keyName(to)} is ${dst.join(' ')}. ${src[i]} is the ${p.numerals[i]} chord, so it becomes ${dst[i]}. Try it: play it in both keys and sing over the new one.`,
  }
}

function capoQuestion(rand: () => number): Asked {
  const shape = pick(CAPO_SHAPES, rand)
  const fret = 1 + Math.floor(rand() * 5)
  const sounding = KEYS_BY_FIFTHS.find((k) => pitchClass(k.tonic) === (pitchClass(shape.tonic) + fret) % 12)!
  const n = (k: KeyDef) => noteLabel(k.tonic)
  const others = KEYS_BY_FIFTHS.filter((k) => k !== sounding && k !== shape).map(n)
  if (rand() < 0.5) {
    return {
      text: `A guitarist plays ${n(shape)}-shape chords with a capo on fret ${fret}. What key do you hear?`,
      answer: n(sounding),
      near: [n(shape), ...others],
      explain: `A capo raises everything by one half step per fret: ${n(shape)} up ${fret} semitone${fret === 1 ? '' : 's'} is ${n(sounding)}. Play in ${keyName(sounding)}.`,
    }
  }
  return {
    text: `The song is in ${keyName(sounding)}. The guitarist puts a capo on fret ${fret}. Which chord shapes do they play?`,
    answer: n(shape),
    near: [n(sounding), ...CAPO_SHAPES.map(n), ...others],
    explain: `Shapes + capo = what you hear, so the shapes are ${n(sounding)} down ${fret} semitone${fret === 1 ? '' : 's'}: ${n(shape)}. They play ${n(shape)} shapes; you play in ${keyName(sounding)}.`,
  }
}

const C = keyNamed('C')
const COMMON = ['C', 'G', 'F', 'D', 'A', 'E', 'B♭', 'E♭'].map(keyNamed)
const FLATS = ['F', 'B♭', 'E♭', 'A♭', 'D♭'].map(keyNamed)
const otherKey = (from: KeyDef, pool: readonly KeyDef[], rand: () => number) => pick(pool.filter((k) => k !== from), rand)
const halfStep = (from: KeyDef, rand: () => number) => {
  const target = (pitchClass(from.tonic) + (rand() < 0.5 ? 1 : 11)) % 12
  return KEYS_BY_FIFTHS.find((k) => pitchClass(k.tonic) === target)!
}

function questionFor(level: number, rand: () => number): Asked {
  switch (level) {
    case 1: return stepQuestion(true, rand)
    case 2: return stepQuestion(false, rand)
    case 3: return progQuestion(C, pick(['G', 'F'].map(keyNamed), rand), false, false, rand)
    case 4: { const from = pick(COMMON, rand); return progQuestion(from, otherKey(from, COMMON, rand), false, false, rand) }
    case 5: { const from = pick(COMMON, rand); return progQuestion(from, halfStep(from, rand), false, false, rand) }
    case 6: { const from = pick(COMMON, rand); return progQuestion(from, otherKey(from, COMMON, rand), false, true, rand) }
    case 7: { const from = pick(COMMON, rand); return progQuestion(from, otherKey(from, COMMON, rand), true, false, rand) }
    case 8: return capoQuestion(rand)
    case 9: { const from = pick(['C', 'G', 'D'].map(keyNamed), rand); return progQuestion(from, pick(FLATS, rand), rand() < 0.5, false, rand) }
    default: return questionFor(1 + Math.floor(rand() * 9), rand)
  }
}

/** What a chord symbol sounds like: root pitch class, the rest of the symbol, and the bass. "C♯m" and "D♭m" sound the same. */
function soundOf(symbol: string): string {
  const pc = (name: string) => (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[name[0]] + (name.includes('♯') ? 1 : name.includes('♭') ? -1 : 0) + 12) % 12
  const [main, bass] = symbol.split('/')
  const root = main.match(/^[A-G][♯♭]?/)![0]
  return `${pc(root)}${main.slice(root.length)}${bass ? `/${pc(bass)}` : ''}`
}

// ---- Answers and levels -----------------------------------------------------------------------------

function seeded(seed: number): () => number {
  let x = seed
  return () => (x = (x * 48271) % 2147483647) / 2147483647
}

const LEVEL_ANSWERS = new Map<number, string[]>()
const symbols = new Map<string, string>()
for (let level = 1; level <= 10; level++) {
  const rand = seeded(2000 + level)
  const count = new Map<string, number>()
  for (let i = 0; i < 4000; i++) {
    const a = questionFor(level, rand)
    count.set(chordId(a.answer), (count.get(chordId(a.answer)) ?? 0) + 1)
    for (const s of [a.answer, ...a.near]) symbols.set(chordId(s), s)
  }
  LEVEL_ANSWERS.set(level, [...count].filter(([, n]) => n >= 10).map(([id]) => id))
}
const allIds = [...new Set([...LEVEL_ANSWERS.values()].flat())]
/** "G major", "B minor", or the chord itself for 7ths and slash chords. */
const longName = (sym: string) => (/^[A-G][♯♭]?$/.test(sym) ? `${sym} major` : /^[A-G][♯♭]?m$/.test(sym) ? `${sym.slice(0, -1)} minor` : `The ${sym} chord`)
const items: readonly Item[] = allIds.map((id) => ({ id, short: symbols.get(id)!, name: longName(symbols.get(id)!), hint: 'Count the steps, or think in numbers' }))

const LEVEL_TEXT: [string, string][] = [
  ['Up a whole step', 'Move one chord up 2 semitones: C becomes D, Am becomes Bm. The kind of chord stays the same.'],
  ['Down a whole step', 'Move one chord down 2 semitones: D becomes C, Em becomes Dm.'],
  ['C to G or F', 'Move a progression from C into G or F. Think in numbers: I–V–vi–IV is the same pattern in every key.'],
  ['Any key', 'Between common keys, through the numbers.'],
  ['A half step', 'Up or down one semitone, as when a singer needs it a little higher or lower.'],
  ['Slash chords', 'The bass moves too: G/B in C becomes D/F♯ in G.'],
  ['7th chords', 'The same moves with Cmaj7, Dm7, G7 and the rest.'],
  ['Capo', 'Working with a guitarist: chord shapes + capo = the key you hear.'],
  ['Into flat keys', 'Into F, B♭, E♭, A♭ and D♭, spelled the way charts write them.'],
  ['Everything', 'Any of the above.'],
]
const QUIZ = ['chord'] as const satisfies readonly Mode[]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: LEVEL_ANSWERS.get(i + 1)!, modes: QUIZ, lowRange: [48, 72] as const }))

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  let a = questionFor(level.id, rand)
  for (let tries = 0; chordId(a.answer) !== item.id && tries < 20000; tries++) a = questionFor(level.id, rand)
  // Up to three wrong answers from the level, the likeliest mistakes first, never two that sound the same.
  const offered = [item.id]
  const sounds = new Set([soundOf(symbols.get(item.id)!)])
  const offer = (id: string) => {
    if (offered.length >= 4 || offered.includes(id) || !level.items.includes(id) || sounds.has(soundOf(symbols.get(id)!))) return
    offered.push(id)
    sounds.add(soundOf(symbols.get(id)!))
  }
  a.near.map(chordId).forEach(offer)
  for (const id of level.items) if (rand() < 0.3) offer(id)
  for (const id of level.items) offer(id)
  return {
    root: 60, item: item.id, mode: 'chord', notes: [60],
    prompt: { text: a.text },
    choices: offered,
    explain: a.explain,
  }
}

export const transpositionExercise: ExerciseDef = {
  id: 'transposition',
  name: 'Transposition',
  kind: 'quiz',
  blurb: 'Move a song to another key, as when a singer needs it lower: one chord at a time, or through the numbers (I–V–vi–IV is the same in every key). Includes slash chords, 7ths and playing with a capo guitarist.',
  rangeWord: 'chord',
  hintLabel: 'Hint:',
  question: 'Transpose.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'transpose' },
  tip: 'Think in numbers, not letters: I–V–vi–IV is the same pattern in every key, so find the new I and count from there. With a guitarist: chord shapes + capo = the key you hear.',
  phrase: (item) => `the answer ${item.short}`,
}
