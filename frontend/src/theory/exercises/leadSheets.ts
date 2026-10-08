import { SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, spellFrom, type KeyDef, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

// ---- Charts ---------------------------------------------------------------------------------------

/** One written bar. `slots` holds a chord or "/" per beat when the bar shows beat slashes. */
export interface Bar {
  chords: string[]
  slots?: string[]
  sim?: boolean // %: play the bar before again
  nc?: boolean // N.C.: no chord
  repeatStart?: boolean
  repeatEnd?: boolean
  ending?: 1 | 2
  segno?: boolean
  toCoda?: boolean
  coda?: boolean // the first bar of the coda
  fine?: boolean
}
export interface Chart {
  meter: 3 | 4
  bars: Bar[]
  /** D.C. al Fine or D.S. al Coda, written after this bar. */
  jump?: { kind: 'dc' | 'ds'; after: number }
}

/**
 * The bars in playing order (indexes into `bars`). Conventions: a repeat is played twice; on the second time
 * through, the 2nd ending replaces the 1st; after D.C. or D.S. repeats are not taken again; D.C. al Fine stops at
 * Fine; D.S. al Coda jumps from "To Coda" to the coda.
 */
export function playOrder(chart: Chart): number[] {
  const { bars } = chart
  const out: number[] = []
  const repeated = new Set<number>()
  let jumped = false
  let second = false
  let i = 0
  while (i < bars.length) {
    const bar = bars[i]
    if (bar.ending === 1 && second) {
      i = bars.findIndex((b) => b.ending === 2)
      second = false
      continue
    }
    if (bar.coda && !jumped) break // the coda is only reached through To Coda
    out.push(i)
    if (jumped && bar.fine) break
    if (jumped && bar.toCoda) {
      i = bars.findIndex((b) => b.coda)
      continue
    }
    if (bar.repeatEnd && !jumped && !repeated.has(i)) {
      repeated.add(i)
      second = true
      let start = i
      while (start > 0 && !bars[start].repeatStart) start--
      i = start
      continue
    }
    if (chart.jump && chart.jump.after === i && !jumped) {
      jumped = true
      i = chart.jump.kind === 'dc' ? 0 : bars.findIndex((b) => b.segno)
      continue
    }
    i++
  }
  return out
}

/** The chord heard in a written bar (following % back to the bar it repeats); 'N.C.' for no chord. */
function heardChord(chart: Chart, index: number): string {
  let i = index
  while (chart.bars[i].sim) i--
  return chart.bars[i].nc ? 'N.C.' : chart.bars[i].chords[0]
}

export function renderChart(chart: Chart): string {
  const cells = chart.bars.map((b, i) => {
    const body = b.sim ? '%' : b.nc ? 'N.C.' : b.slots ? b.slots.join(' ') : b.chords.join(' ')
    const pre = [b.segno ? '[Segno]' : '', b.coda ? '[Coda]' : '', b.ending ? `${b.ending}.` : ''].filter(Boolean).join(' ')
    const post = [b.toCoda ? '[To Coda]' : '', b.fine ? '[Fine]' : ''].filter(Boolean).join(' ')
    const open = b.repeatStart ? '||:' : '|'
    const close = b.repeatEnd ? ':||' : i === chart.bars.length - 1 || chart.bars[i + 1]?.coda ? '||' : ''
    return `${open} ${[pre, body, post].filter(Boolean).join(' ')} ${close}`.trim()
  })
  const lines: string[] = []
  for (let i = 0; i < cells.length; i += 4) {
    const line = cells.slice(i, i + 4).join(' ').replace(/\| \|/g, '|')
    // every line ends on a bar line
    lines.push(/(\||:\|\|)$/.test(line) ? line : `${line} |`)
  }
  const meter = `${chart.meter}/4`
  const jump = chart.jump ? `\n${chart.jump.kind === 'dc' ? 'D.C. al Fine' : 'D.S. al Coda'} (after bar ${chart.jump.after + 1})` : ''
  return `${meter}\n${lines.join('\n')}${jump}`
}

// ---- Chords of the keys used ----------------------------------------------------------------------

const DEGREES: [Step, string][] = [[[0, 0], 'maj'], [[1, 2], 'min'], [[2, 4], 'min'], [[3, 5], 'maj'], [[4, 7], 'maj'], [[5, 9], 'min']]
const KEYS = KEYS_BY_FIFTHS.filter((k) => ['C', 'G', 'F', 'D', 'B♭'].includes(noteLabel(k.tonic)))
const chordsOf = (k: KeyDef) => DEGREES.map(([step, type]) => `${noteLabel(spellFrom(k.tonic, [step])[0])}${SUFFIX[type]}`)
const ascii = (s: string) => s.replaceAll('♯', '#').replaceAll('♭', 'b')
const chordId = (symbol: string) => (symbol === 'N.C.' ? 'nc' : `c-${ascii(symbol)}`)

// ---- Random charts for each level ------------------------------------------------------------------

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const between = (lo: number, hi: number, rand: () => number) => lo + Math.floor(rand() * (hi - lo + 1))

function chordRow(pool: string[], n: number, rand: () => number): string[] {
  const out: string[] = []
  while (out.length < n) {
    const c = pick(pool, rand)
    if (c !== out[out.length - 1]) out.push(c)
  }
  return out
}
const plain = (chords: string[]): Bar[] => chords.map((c) => ({ chords: [c] }))

type Kind = 'written' | 'chord-at' | 'beats' | 'on-beat' | 'played' | 'nth' | 'meter'
interface Asked {
  chart: Chart
  kind: Kind
  /** The bar asked about (written index), or the place in playing order for 'nth'. */
  at?: number
  /** For 'beats': the chord whose beats are counted. */
  chord?: string
  answer: string
  text: string
}

function ask(chart: Chart, kind: Kind, rand: () => number): Asked {
  const order = playOrder(chart)
  if (kind === 'written') return { chart, kind, answer: `bars-${chart.bars.length}`, text: 'How many bars are written?' }
  if (kind === 'played') return { chart, kind, answer: `bars-${order.length}`, text: 'How many bars do you play in all?' }
  if (kind === 'meter') return { chart, kind, answer: `beats-${chart.meter}`, text: 'How many beats are in each bar?' }
  if (kind === 'chord-at') {
    const at = between(0, chart.bars.length - 1, rand)
    return { chart, kind, at, answer: chordId(heardChord(chart, at)), text: `Which chord do you play in bar ${at + 1}?` }
  }
  if (kind === 'nth') {
    const at = between(0, order.length - 1, rand)
    return { chart, kind, at, answer: chordId(heardChord(chart, order[at])), text: `You start at bar 1. What is the ${ordinal(at + 1)} bar you play?` }
  }
  // beats and on-beat: a bar with two chords (or beat slashes)
  const twoChord = chart.bars.map((b, i) => [b, i] as const).filter(([b]) => b.chords.length > 1)
  const [bar, at] = pick(twoChord, rand)
  const slots = bar.slots ?? spread(bar.chords, chart.meter)
  if (kind === 'on-beat') {
    const beat = between(1, chart.meter, rand)
    let i = beat - 1
    while (slots[i] === '/') i--
    return { chart, kind, at, chord: String(beat), answer: chordId(slots[i]), text: `In bar ${at + 1}, which chord do you play on beat ${beat}?` }
  }
  const chord = pick(bar.chords, rand)
  const start = slots.indexOf(chord)
  let n = 1
  while (start + n < slots.length && slots[start + n] === '/') n++
  return { chart, kind, at, chord, answer: `beats-${n}`, text: `In bar ${at + 1}, how many beats does ${chord} get?` }
}

/** Two chords in a bar without slashes share it equally. */
const spread = (chords: string[], meter: number): string[] => {
  const each = meter / chords.length
  return chords.flatMap((c) => [c, ...Array.from({ length: each - 1 }, () => '/')])
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

function chartFor(level: number, rand: () => number): Asked {
  const pool = chordsOf(pick(KEYS, rand))
  switch (level) {
    case 1:
      return ask({ meter: 4, bars: plain(chordRow(pool, between(4, 8, rand), rand)) }, pick(['written', 'chord-at'] as Kind[], rand), rand)
    case 2: {
      const bars = plain(chordRow(pool, between(4, 6, rand), rand))
      const at = between(0, bars.length - 1, rand)
      bars[at] = { chords: chordRow(pool, 2, rand) }
      return ask({ meter: 4, bars }, 'on-beat', rand)
    }
    case 3: {
      const bars: Bar[] = plain(chordRow(pool, between(5, 8, rand), rand))
      for (let i = 1; i < bars.length; i++) if (rand() < 0.3) bars[i] = { chords: [], sim: true }
      if (rand() < 0.5) bars[0] = { chords: [], nc: true }
      return ask({ meter: 4, bars }, 'chord-at', rand)
    }
    case 4: {
      const intro = plain(chordRow(pool, between(0, 2, rand), rand))
      const body = plain(chordRow(pool, between(2, 4, rand), rand))
      body[0].repeatStart = true
      body[body.length - 1].repeatEnd = true
      const outro = plain(chordRow(pool, between(0, 2, rand), rand))
      return ask({ meter: 4, bars: [...intro, ...body, ...outro] }, pick(['played', 'nth'] as Kind[], rand), rand)
    }
    case 5:
      return ask(withEndings(pool, rand), pick(['played', 'nth'] as Kind[], rand), rand)
    case 6: {
      const a = plain(chordRow(pool, between(3, 4, rand), rand))
      a[a.length - 1].fine = true
      const b = plain(chordRow(pool, between(2, 4, rand), rand))
      const bars = [...a, ...b]
      return ask({ meter: 4, bars, jump: { kind: 'dc', after: bars.length - 1 } }, pick(['played', 'nth'] as Kind[], rand), rand)
    }
    case 7:
      return ask(dsChart(pool, rand), pick(['played', 'nth'] as Kind[], rand), rand)
    case 8: {
      const meter = pick([3, 4] as const, rand)
      const bars: Bar[] = chordRow(pool, between(4, 6, rand), rand).map((c) => ({ chords: [c], slots: [c, ...Array.from({ length: meter - 1 }, () => '/')] }))
      const at = between(0, bars.length - 1, rand)
      const [x, y] = chordRow(pool, 2, rand)
      const split = between(1, meter - 1, rand)
      bars[at] = { chords: [x, y], slots: Array.from({ length: meter }, (_, i) => (i === 0 ? x : i === split ? y : '/')) }
      return ask({ meter, bars }, pick(['meter', 'beats'] as Kind[], rand), rand)
    }
    case 9: {
      const chart = withEndings(pool, rand, true)
      return ask(chart, pick(['played', 'nth'] as Kind[], rand), rand)
    }
    default:
      return chartFor(between(1, 9, rand), rand)
  }
}

/** ||: a few bars | 1. X :|| 2. Y || and maybe more bars; with `long`, a % bar and an intro too. */
function withEndings(pool: string[], rand: () => number, long = false): Chart {
  const intro = long ? plain(chordRow(pool, 2, rand)) : []
  const body = plain(chordRow(pool, between(2, 3, rand), rand))
  body[0].repeatStart = true
  if (long) body.push({ chords: [], sim: true })
  const [one, two] = chordRow(pool, 2, rand)
  const ends: Bar[] = [{ chords: [one], ending: 1, repeatEnd: true }, { chords: [two], ending: 2 }]
  const outro = plain(chordRow(pool, between(0, long ? 2 : 1, rand), rand))
  return { meter: 4, bars: [...intro, ...body, ...ends, ...outro] }
}

/** Intro, [Segno] section with [To Coda], more bars, D.S. al Coda, then the coda. */
function dsChart(pool: string[], rand: () => number): Chart {
  const intro = plain(chordRow(pool, between(1, 2, rand), rand))
  const section = plain(chordRow(pool, 3, rand))
  section[0].segno = true
  section[between(1, 2, rand)].toCoda = true
  const more = plain(chordRow(pool, between(1, 2, rand), rand))
  const coda = plain(chordRow(pool, between(1, 2, rand), rand))
  coda[0].coda = true
  const bars = [...intro, ...section, ...more, ...coda]
  return { meter: 4, bars, jump: { kind: 'ds', after: intro.length + section.length + more.length - 1 } }
}

// ---- Answers and levels -----------------------------------------------------------------------------

/** A repeatable random generator, so the answers of each level can be listed once. */
function seeded(seed: number): () => number {
  let x = seed
  return () => (x = (x * 48271) % 2147483647) / 2147483647
}

const LEVEL_TEXT: [string, string][] = [
  ['Bars and chords', 'A chart shows one bar between each pair of bar lines. Count the bars, and find the chord in a bar.'],
  ['Two chords in a bar', 'Two chords in one 4/4 bar share it: 2 beats each.'],
  ['% and N.C.', '% means play the bar before again. N.C. means no chord: stop playing for that bar.'],
  ['Repeats', '||: and :|| enclose bars that are played twice.'],
  ['1st and 2nd endings', 'The first time, play the 1st ending; the second time, skip it and play the 2nd ending.'],
  ['D.C. al Fine', 'At D.C. al Fine go back to the start and stop at Fine. Repeats are not taken again.'],
  ['D.S. al Coda', 'At D.S. al Coda go back to the Segno, play to To Coda, then jump to the Coda.'],
  ['Meter and slashes', 'The time signature says how many beats each bar has. A slash / is one beat of the chord before it.'],
  ['Longer charts', 'Intros, repeats, endings and % together.'],
  ['Everything', 'Any of the above.'],
]

/** Every answer a level can have, found by trying many charts, with how often each comes up. */
const LEVEL_ANSWERS = new Map<number, string[]>()
const symbols = new Set<string>()
for (let level = 1; level <= 10; level++) {
  const rand = seeded(1000 + level)
  const count = new Map<string, number>()
  for (let i = 0; i < 4000; i++) {
    const a = chartFor(level, rand)
    count.set(a.answer, (count.get(a.answer) ?? 0) + 1)
    a.chart.bars.forEach((b) => b.chords.forEach((c) => symbols.add(c)))
  }
  // keep answers common enough to draw again quickly
  LEVEL_ANSWERS.set(level, [...count].filter(([, n]) => n >= 15).map(([id]) => id))
}

const describeAnswer = (id: string): Item => {
  if (id === 'nc') return { id, short: 'N.C.', name: 'No chord', hint: 'Stop playing for that bar' }
  if (id.startsWith('bars-')) return { id, short: `${id.slice(5)} bars`, name: `${id.slice(5)} bars`, hint: 'Count bar by bar' }
  if (id.startsWith('beats-')) return { id, short: `${id.slice(6)} beat${id === 'beats-1' ? '' : 's'}`, name: `${id.slice(6)} beat${id === 'beats-1' ? '' : 's'}`, hint: 'Count the chord and its slashes' }
  const symbol = [...symbols].find((s) => chordId(s) === id)!
  return { id, short: symbol, name: `The ${symbol} chord`, hint: 'Read the bar' }
}
const allIds = [...new Set([...LEVEL_ANSWERS.values()].flat())]
const items: readonly Item[] = allIds.map(describeAnswer)

const QUIZ = ['chord'] as const satisfies readonly Mode[]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: LEVEL_ANSWERS.get(i + 1)!, modes: QUIZ, lowRange: [48, 72] as const }))

// ---- One question ----------------------------------------------------------------------------------

function explain(a: Asked): string {
  const order = playOrder(a.chart)
  const played = `You play bars ${order.map((i) => i + 1).join(' ')} (${order.length} bars).`
  switch (a.kind) {
    case 'written':
      return `${a.chart.bars.length} bars are written: count the spaces between bar lines.`
    case 'played':
      return played
    case 'meter':
      return `${a.chart.meter}/4: ${a.chart.meter} beats in each bar.`
    case 'chord-at': {
      const b = a.chart.bars[a.at!]
      const heard = heardChord(a.chart, a.at!)
      return b.sim ? `Bar ${a.at! + 1} is %, so play the bar before again: ${heard}.` : b.nc ? `Bar ${a.at! + 1} is N.C.: no chord, stop for a bar.` : `Bar ${a.at! + 1} is ${heard}.`
    }
    case 'nth':
      return `${played} The ${ordinal(a.at! + 1)} is bar ${order[a.at!] + 1}: ${heardChord(a.chart, order[a.at!])}.`
    case 'on-beat':
      return `Bar ${a.at! + 1}: two chords share the bar, 2 beats each, so beat ${a.chord} is ${a.answer === 'nc' ? 'N.C.' : describeAnswer(a.answer).short}.`
    case 'beats':
      return `${a.chord} gets ${a.answer.slice(6)} beat${a.answer === 'beats-1' ? '' : 's'}: count it and the slashes after it${a.chart.bars[a.at!].slots ? '' : ' (two chords in a 4/4 bar get 2 beats each)'}.`
  }
}

function choicesFor(answer: string, levelItems: readonly string[], chart: Chart, rand: () => number): string[] {
  const prefix = answer.startsWith('bars-') ? 'bars-' : answer.startsWith('beats-') ? 'beats-' : 'c-'
  const inChart = chart.bars.flatMap((b) => b.chords).map(chordId)
  const pool = levelItems.filter((id) => id !== answer && (prefix === 'c-' ? id.startsWith('c-') || id === 'nc' : id.startsWith(prefix)))
  const preferred = prefix === 'c-' ? pool.filter((id) => inChart.includes(id) || id === 'nc') : pool
  const rest = pool.filter((id) => !preferred.includes(id))
  const shuffled = (l: string[]) => l.map((x) => [rand(), x] as const).sort((p, q) => p[0] - q[0]).map(([, x]) => x)
  return [answer, ...shuffled(preferred), ...shuffled(rest)].slice(0, 4)
}

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  let a = chartFor(level.id, rand)
  for (let tries = 0; a.answer !== item.id && tries < 20000; tries++) a = chartFor(level.id, rand)
  return {
    root: 60, item: item.id, mode: 'chord', notes: [60],
    prompt: { text: a.text, chart: renderChart(a.chart) },
    choices: choicesFor(a.answer, level.items, a.chart, rand),
    explain: explain(a),
  }
}

export const leadSheetsExercise: ExerciseDef = {
  id: 'lead-sheets',
  name: 'Reading lead sheets and chord charts',
  kind: 'quiz',
  blurb: 'Read a chord chart the way bands do: bars, two chords in a bar, %, N.C., repeats, 1st and 2nd endings, D.C. al Fine, D.S. al Coda and beat slashes.',
  rangeWord: 'chart',
  hintLabel: 'Hint:',
  question: 'Read the chart.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'chart' },
  phrase: (item) => item.name.toLowerCase(),
}
