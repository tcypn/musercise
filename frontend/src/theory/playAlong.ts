import { barEvents, type Pattern } from './comping'
import type { TimedEvent } from './practice'
import { voiceNumerals } from './rhythm'

/** Chord charts to play along with, as numerals, one chord per bar. */
export const CHARTS: readonly { id: string; name: string; bars: readonly string[] }[] = [
  { id: 'pop', name: 'Pop loop (I V vi IV)', bars: ['I', 'V', 'vi', 'IV'] },
  { id: 'fifties', name: '50s loop (I vi IV V)', bars: ['I', 'vi', 'IV', 'V'] },
  { id: 'two-five-one', name: 'ii-V-I', bars: ['ii7', 'V7', 'Imaj7', 'Imaj7'] },
  { id: 'blues', name: '12-bar blues', bars: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'] },
  { id: 'aaba', name: 'AABA (16 bars)', bars: ['I', 'vi', 'ii', 'V', 'I', 'vi', 'ii', 'V', 'IV', 'iv', 'I', 'I', 'I', 'vi', 'ii', 'V'] },
]

export type Backing = 'click' | 'bass' | Extract<Pattern, 'basic' | 'ballad' | 'pop' | 'gospel'>
export const BACKINGS: readonly { id: Backing; name: string }[] = [
  { id: 'click', name: 'Click only' },
  { id: 'bass', name: 'Click and bass' },
  { id: 'ballad', name: 'Ballad' },
  { id: 'basic', name: 'Basic pop' },
  { id: 'pop', name: 'Pop push' },
  { id: 'gospel', name: 'Gospel' },
]

export interface Bar {
  /** Index over the whole play-through (all rounds). */
  index: number
  round: number
  name: string
  /** The chord's pitch classes, its root and its 3rd. */
  pcs: number[]
  root: number
  third: number
  /** The chord as voiced, to show and to play. */
  notes: number[]
  /** Seconds from the start of the sound to this bar's beat 1. */
  at: number
}

/** What to play: a bar of clicks to count in, then the chart `rounds` times; and where each bar starts. */
export function schedule(chartId: string, keyPc: number, bpm: number, backing: Backing, rounds: number): { events: TimedEvent[]; bars: Bar[]; beatOf: (number | null)[]; barOf: (number | null)[] } {
  const chart = CHARTS.find((c) => c.id === chartId)!
  const { voiced, names } = voiceNumerals(keyPc, chart.bars)
  const beat = 60 / bpm
  const events: TimedEvent[] = []
  /** For every event: which beat of its bar it marks (clicks only), and which bar (-1 for the count-in). */
  const beatOf: (number | null)[] = []
  const barOf: (number | null)[] = []
  const click = (t: number, b: number, bar: number) => {
    events.push({ time: t, hold: 0.08, notes: [b === 0 ? 96 : 84] })
    beatOf.push(b)
    barOf.push(bar)
  }
  for (let b = 0; b < 4; b++) click(b * beat, b, -1)
  const bars: Bar[] = []
  for (let round = 0; round < rounds; round++) {
    voiced.forEach((v, i) => {
      const index = round * voiced.length + i
      const at = (index + 1) * 4 * beat
      const pcs = [...new Set([v.bass % 12, ...v.upper.map((m) => m % 12)])]
      const root = v.bass % 12
      const third = pcs.find((pc) => [3, 4].includes((pc - root + 12) % 12))!
      bars.push({ index, round, name: names[i], pcs, root, third, notes: [v.bass, ...v.upper], at })
      for (let b = 0; b < 4; b++) click(at + b * beat, b, index)
      const backingEvents = backing === 'click' ? [] : backing === 'bass' ? [{ time: at, hold: 4 * beat * 0.95, notes: [v.bass] }] : barEvents(v, backing, at, beat, () => 0.5)
      for (const e of backingEvents) {
        events.push(e)
        beatOf.push(null)
        barOf.push(index)
      }
    })
  }
  // In time order, so the sound and the screen move together.
  const order = events.map((_, i) => i).sort((a, b) => events[a].time - events[b].time || (beatOf[a] === null ? 1 : 0) - (beatOf[b] === null ? 1 : 0))
  return { events: order.map((i) => events[i]), bars, beatOf: order.map((i) => beatOf[i]), barOf: order.map((i) => barOf[i]) }
}

/** A note struck, and when (milliseconds, on the same clock as the beat). */
export interface Struck {
  midi: number
  t: number
}

export type BarResult = { kind: 'right'; offset: number } | { kind: 'early' | 'late'; offset: number } | { kind: 'wrong'; offset: number; played: number[] } | { kind: 'missed' }

/** Notes starting this long before or after beat 1 count for the bar. */
export const WINDOW = { before: 150, after: 250 }
/** Within this, a right chord is on time. */
export const ON_TIME = 80

/** Did the notes struck around beat 1 make the bar's chord, and how far off the beat was the first one? */
export function judgeBar(struck: readonly Struck[], bar: Pick<Bar, 'pcs' | 'root' | 'third'>, beatT: number): BarResult {
  const near = struck.filter((s) => s.t - beatT >= -WINDOW.before && s.t - beatT <= WINDOW.after)
  if (near.length === 0) return { kind: 'missed' }
  const offset = Math.round(Math.min(...near.map((s) => s.t)) - beatT)
  const pcs = new Set(near.map((s) => s.midi % 12))
  const fits = [...pcs].every((pc) => bar.pcs.includes(pc)) && pcs.has(bar.root) && pcs.has(bar.third)
  if (!fits) return { kind: 'wrong', offset, played: near.map((s) => s.midi) }
  return { kind: Math.abs(offset) <= ON_TIME ? 'right' : offset < 0 ? 'early' : 'late', offset }
}
