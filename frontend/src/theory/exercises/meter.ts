import { chordEvent, keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The meters: how many eighth notes a bar has, and on which of them a beat falls. */
const METERS: readonly (Item & { eighths: number; beats: readonly number[]; count: string; how: string })[] = [
  { id: '2/4', short: '2/4', name: '2/4 (two beats)', hint: 'ONE two, ONE two: a march', eighths: 4, beats: [0, 2], count: '1 2', how: 'two beats in a bar, counted 1 2: a march.' },
  { id: '3/4', short: '3/4', name: '3/4 (three beats)', hint: 'ONE two three: a waltz', eighths: 6, beats: [0, 2, 4], count: '1 2 3', how: 'three beats in a bar, counted 1 2 3: a waltz.' },
  { id: '4/4', short: '4/4', name: '4/4 (four beats)', hint: 'ONE two three four: most pop songs', eighths: 8, beats: [0, 2, 4, 6], count: '1 2 3 4', how: 'four beats in a bar, counted 1 2 3 4: most pop, rock and R&B songs.' },
  { id: '6/8', short: '6/8', name: '6/8 (two beats of three)', hint: 'ONE-and-a TWO-and-a: a rocking ballad', eighths: 6, beats: [0, 3], count: '1 2 3 4 5 6', how: 'two beats in a bar, each split in three: 1 2 3 4 5 6, leaning on 1 and 4. It rocks like a slow soul ballad.' },
]
const BY_ID = new Map(METERS.map((m) => [m.id, m]))
const items: readonly Item[] = METERS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  /** Fill in the eighth notes between the beats in 2/4, 3/4 and 4/4: true, false or either. */
  fill: boolean | 'either'
  tempo: 'steady' | 'any'
  /** The chord changes every bar. */
  changes: boolean
  /** The bass marks only beat 1 (true), or plays on every beat (false: only the chord changes show the bar). */
  accent: boolean
}
const S = (anyKey: boolean, fill: Setup['fill'], tempo: Setup['tempo'], changes: boolean, accent: boolean): Setup => ({ anyKey, fill, tempo, changes, accent })
const SETUP: Record<number, Setup> = {
  1: S(false, false, 'steady', false, true), 2: S(false, false, 'steady', false, true), 3: S(false, true, 'steady', false, true),
  4: S(false, 'either', 'steady', false, true), 5: S(true, 'either', 'steady', false, true), 6: S(true, true, 'steady', false, true),
  7: S(true, 'either', 'any', false, true), 8: S(true, 'either', 'steady', true, true), 9: S(true, true, 'steady', true, false),
  10: S(true, 'either', 'any', true, true),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = METERS.map((m) => m.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['3/4 or 4/4', 'Hear four bars. The low bass note falls on each 1: count the beats from one bass note to the next. Three is a waltz, four is most songs.', ['3/4', '4/4']],
  ['2/4', 'Add 2/4: a bass note every two beats, like a march.', ['2/4', '3/4', '4/4']],
  ['3/4 or 6/8', 'Both have six quick notes in a bar. 3/4 groups them in twos (1 & 2 & 3 &); 6/8 groups them in threes (1 2 3 4 5 6), with chords on 1 and 4.', ['3/4', '6/8']],
  ['All four', '2/4, 3/4, 4/4 and 6/8.', ALL],
  ['Any key', 'All four meters, in any key.', ALL],
  ['Busy bars', 'Quick notes between every beat, so you count beats, not notes.', ALL],
  ['Any tempo', 'Slower and faster.', ALL],
  ['Chord changes', 'The chord changes every bar, as in a song: a new chord usually comes on 1.', ALL],
  ['No accent', 'The bass plays on every beat. Only the chord changes show where each bar begins.', ALL],
  ['Everything', 'Every meter, key, tempo and texture.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

const LOOPS = [['I', 'IV', 'V', 'I'], ['I', 'vi', 'IV', 'V'], ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V']]

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const meter = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const numerals = setup.changes ? pick(LOOPS, rand) : ['I', 'I', 'I', 'I']
  const { voiced, names } = voiceNumerals(tonicPc, numerals)
  // One eighth note: a beat of 2/4, 3/4 or 4/4 is two of them; a beat of 6/8 is three.
  const quarter = setup.tempo === 'any' ? pick([0.5, 0.6, 0.72], rand) : 0.6
  const eighth = meter.id === '6/8' ? quarter * 0.45 : quarter / 2
  const fill = meter.id === '6/8' || (setup.fill === 'either' ? rand() < 0.5 : setup.fill)
  const bar = meter.eighths * eighth
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  const steps: { label: string; notes: number[] }[] = []
  voiced.forEach((v, b) => {
    const t = b * bar
    const top = Math.max(...v.upper)
    const evs: TimedEvent[] = []
    // The bass: once on 1 for the whole bar, or on every beat.
    if (setup.accent) evs.push(chordEvent(t, bar * 0.95, [v.bass]))
    else for (const at of meter.beats) evs.push(chordEvent(t + at * eighth, eighth * 1.8, [v.bass]))
    for (let e = 0; e < meter.eighths; e++) {
      if (meter.beats.includes(e)) evs.push(chordEvent(t + e * eighth, eighth * 1.6, v.upper))
      else if (fill) evs.push(chordEvent(t + e * eighth, eighth * 0.8, [top]))
    }
    evs.sort((a, c) => a.time - c.time)
    events.push(...evs)
    stepOf.push(...evs.map(() => b))
    steps.push({ label: `bar ${b + 1} · ${names[b]} · ${meter.count}`, notes: [...new Set(evs.flatMap((e) => e.notes))] })
  })
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `${meter.short} in ${label}: ${meter.how} Try it: play a ${names[0]} chord and count ${meter.count} out loud, leaning on 1${meter.id === '6/8' ? ' and 4' : ''}.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const meterExercise: ExerciseDef = {
  noYourTurn: true,
  id: 'meter',
  name: 'Meter and time signatures',
  blurb: 'Hear a few bars and name the meter: 2/4, 3/4, 4/4 or 6/8. Find beat 1 (the low bass note or the chord change) and count the beats until the next one.',
  hintLabel: 'Feels like:',
  question: 'Count the beats in each bar. Which meter is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'meter' },
  phrase: (item) => BY_ID.get(item.id)!.name,
  tip: 'Find beat 1 first: the low bass note, or the moment the chord changes. Then count until the next 1. If the quick notes fall in threes, it is 6/8.',
}
