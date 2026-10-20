import { chordEvent, keyLabel, type VoicedChord } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Ways to mix a broken chord (one note at a time) with the chord struck all at once in one bar. */
const WAYS: readonly (Item & { how: string; tryIt: string })[] = [
  { id: 'arp-bar', short: 'All broken', name: 'Broken chord all bar', hint: 'One note at a time, never together', how: 'the right hand breaks the chord the whole bar, never striking it together: calm and flowing, good for a verse or an intro.', tryIt: 'bass on 1, then up and down the chord in eighths: 1 & 2 & 3 & 4 &' },
  { id: 'hit-3', short: 'Hit on 3', name: 'Broken, then hit on 3', hint: 'Notes on 1 and 2, the chord on 3', how: 'the chord is broken on beats 1 and 2, then struck together on 3: it flows, then lands, and the hit marks the middle of the bar.', tryIt: 'break the chord on 1 & 2 &, strike it on 3 and hold' },
  { id: 'hit-1', short: 'Hit on 1', name: 'Hit on 1, then broken', hint: 'The chord first, then its notes', how: 'the chord is struck on 1 with the bass, then broken for the rest of the bar: a strong start that keeps moving.', tryIt: 'strike the chord with the bass on 1, then play its notes one by one on 2 & 3 & 4 &' },
  { id: 'push', short: 'Push on 4&', name: 'Broken, then a push on the "&" of 4', hint: 'The chord comes early, just before the change', how: 'the chord is broken until the "&" of 4, then struck early, just before the next bar: a push that pulls you into the next chord. Pop and gospel players use it all the time.', tryIt: 'break the chord on 1 & 2 & 3 & 4, strike it on the "&" and hold it over the bar line' },
  { id: 'spread-arp', short: 'Spread up', name: 'Spread arpeggio from the bass', hint: 'Root, 5th, octave, 10th rising from the bottom', how: 'the notes climb from the bass: root, 5th, octave, then the 3rd above (a 10th): a wide, open arpeggio that makes the piano sound big without any chord struck.', tryIt: 'left hand root, 5th and octave in turn, right hand continues with the 3rd and 5th above' },
]
const BY_ID = new Map(WAYS.map((w) => [w.id, w]))
const items: readonly Item[] = WAYS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  loops: readonly string[][]
  beat: number
}
const POP = [['I', 'V', 'vi', 'IV']]
const LOOPS = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V']]
const SEVENTHS = [['Imaj7', 'vi7', 'ii7', 'V7'], ['Imaj7', 'IVmaj7', 'ii7', 'V7']]
const S = (anyKey: boolean, loops: string[][] = POP, beat = 0.62): Setup => ({ anyKey, loops, beat })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(false), 4: S(false), 5: S(true), 6: S(true, LOOPS),
  7: S(true, SEVENTHS), 8: S(true, LOOPS, 0.45), 9: S(true, LOOPS, 0.85), 10: S(true, [...LOOPS, ...SEVENTHS], 0.55),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = WAYS.map((w) => w.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Broken or hit', 'Four bars. Is each chord broken all bar, or broken and then struck on 3?', ['arp-bar', 'hit-3']],
  ['Hit on 1', 'Add a hit on 1 followed by broken notes.', ['arp-bar', 'hit-3', 'hit-1']],
  ['The push', 'Add the push: the chord struck on the "&" of 4, just before the next one.', ['arp-bar', 'hit-3', 'hit-1', 'push']],
  ['Spread up', 'Add the spread arpeggio, climbing from the bass.', ALL],
  ['Any key', 'All five, in any key.', ALL],
  ['Other loops', 'Other chord loops.', ALL],
  ['7th chords', 'Over 7th chords, four notes to break.', ALL],
  ['Faster', 'At a pop tempo.', ALL],
  ['Slower', 'At a ballad tempo.', ALL],
  ['Everything', 'Any pattern, loop and key.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

function bar(id: string, v: VoicedChord, t: number, beat: number): TimedEvent[] {
  const up = [...v.upper].sort((a, b) => a - b)
  const top = up[up.length - 1]
  // Up and down the chord: 1 3 5 (7) 8, then back.
  const rise = [...up, up[0] + 12 > top ? up[0] + 12 : top + 1]
  const line = [...rise, ...rise.slice(1, -1).reverse(), ...rise].slice(0, 8)
  const at = (b: number, hold: number, notes: number[]) => chordEvent(t + b * beat, hold * beat, notes)
  const eighths = (from: number, to: number) => line.slice(from * 2, to * 2).map((m, i) => at(from + i / 2, 0.5, [m]))
  switch (id) {
    case 'arp-bar':
      return [at(0, 3.9, [v.bass]), ...eighths(0, 4)]
    case 'hit-3':
      return [at(0, 3.9, [v.bass]), ...eighths(0, 2), at(2, 1.9, up)]
    case 'hit-1':
      return [at(0, 3.9, [v.bass]), at(0, 0.95, up), ...line.slice(2, 8).map((m, i) => at(1 + i / 2, 0.5, [m]))]
    case 'push':
      return [at(0, 3.4, [v.bass]), ...eighths(0, 3), at(3, 0.5, [line[6]]), at(3.5, 1.4, up)]
    default: {
      // spread-arp: root, 5th, octave, 10th, 5th above, then back down
      const third = v.bass + 12 + ((up.map((m) => (m - v.bass + 120) % 12).find((x) => x === 3 || x === 4)) ?? 4)
      const notes = [v.bass, v.bass + 7, v.bass + 12, third, v.bass + 19, third + 12, v.bass + 19, third]
      return notes.map((m, i) => at(i / 2, i === 0 ? 3.9 : 0.9, [m]))
    }
  }
}

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const w = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const loop = pick(setup.loops, rand)
  const { voiced, names } = voiceNumerals(tonicPc, loop)
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  const steps: { label: string; notes: number[] }[] = []
  voiced.forEach((v, i) => {
    const evs = bar(id, v, i * 4 * setup.beat, setup.beat)
    events.push(...evs)
    stepOf.push(...evs.map(() => i))
    steps.push({ label: `bar ${i + 1} · ${names[i]}`, notes: [...new Set(evs.flatMap((e) => e.notes))].sort((a, b) => a - b) })
  })
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `${w.name} (${label}): ${w.how} Try it on ${names[0]}: ${w.tryIt}. Aim the top note of each chord at the nearest note of the next one, and the pattern flows from bar to bar.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const arpeggioHitsExercise: ExerciseDef = {
  noYourTurn: true,
  id: 'arpeggio-hits',
  name: 'Broken chords and hits',
  blurb: 'Many songs mix a broken chord (one note at a time) with the chord struck all at once. Hear a few bars and name the pattern: broken all bar, a hit on 3, a hit on 1, a push on the "&" of 4, or a spread arpeggio from the bass.',
  hintLabel: 'Sounds like:',
  question: 'Listen for where the chord is struck together. Which pattern is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'pattern' },
  phrase: (item) => BY_ID.get(item.id)!.name.replace(/^./, (c) => c.toLowerCase()),
  tip: 'Bass on 1, then break the chord upward; strike it together on 3, or on the "&" of 4 to push into the next chord. Broken chords feel calm (verses), struck chords feel strong (choruses): switching between them shapes the song.',
}
