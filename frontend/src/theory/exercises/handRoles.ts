import { barEvents } from '../comping'
import { chordEvent, keyLabel, type VoicedChord } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Ways of sharing a song between the hands. */
const SETUPS: readonly (Item & { how: string; tryIt: string })[] = [
  { id: 'block', short: 'Both: chords', name: 'Both hands on the chord', hint: 'The whole chord in both hands, every beat', how: 'both hands play the whole chord together on every beat. Solid, but heavy: it fills every gap and leaves no room for a singer.', tryIt: 'play it this way, then try the next answer, bass in the left hand only, and hear how much lighter it gets' },
  { id: 'bass-chord', short: 'Bass + chord', name: 'Left bass, right chord', hint: 'Low single notes, chords above', how: 'the left hand plays only the bass (root, then the 5th) and the right hand plays the chord. The standard way to accompany a singer.', tryIt: 'left hand: the root on 1 and the 5th on 3; right hand: the chord on every beat' },
  { id: 'spread', short: 'Spread', name: 'Spread (open) voicing', hint: 'Left root-5th-octave, right chord up high', how: 'the left hand spreads root, 5th and octave, and the right hand plays the chord higher up: an open voicing, full and wide, the sound of a piano ballad.', tryIt: 'left hand: root, 5th and octave together (C G C); right hand: E G C above middle C' },
  { id: 'melody-top', short: 'Melody on top', name: 'Chord with the melody on top', hint: 'Bass below, chords whose top note sings the tune', how: 'the left hand plays the bass and the right hand plays chords with the tune as their top note, and the tune alone between them. How to play a song solo, with no singer.', tryIt: 'find the tune with your right little finger, and fill in chord notes below it with the other fingers' },
  { id: 'lh-chord', short: 'Left chord', name: 'Left chord, right melody', hint: 'Chords low in the left hand, a tune above', how: 'the left hand plays the chords, low and close, and the right hand is free for a tune or a fill. Good for an intro, a solo or the gaps between sung lines.', tryIt: 'hold the chord with your left hand just below middle C and play the tune or a pentatonic fill with your right' },
]
const BY_ID = new Map(SETUPS.map((s) => [s.id, s]))
const items: readonly Item[] = SETUPS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  loops: readonly string[][]
  beat: number
  bars: number
}
const POP = [['I', 'V', 'vi', 'IV']]
const LOOPS = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['I', 'IV', 'ii', 'V']]
const S = (anyKey: boolean, loops: string[][] = POP, beat = 0.6, bars = 4): Setup => ({ anyKey, loops, beat, bars })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(false), 4: S(false), 5: S(true), 6: S(true, LOOPS),
  7: S(true, LOOPS, 0.85), 8: S(true, LOOPS, 0.48), 9: S(true, LOOPS, 0.6, 2), 10: S(true, LOOPS, 0.6, 2),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = SETUPS.map((s) => s.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Chords or bass', 'Four bars of the pop loop. Do both hands play the chord, or does the left hand only play the bass?', ['block', 'bass-chord']],
  ['Spread', 'Add the spread voicing: root-5th-octave low, the chord up high.', ['block', 'bass-chord', 'spread']],
  ['Melody on top', 'Add chords with the tune as their top note.', ['block', 'bass-chord', 'spread', 'melody-top']],
  ['Left-hand chords', 'Add chords in the left hand with a tune in the right.', ALL],
  ['Any key', 'All five, in any key.', ALL],
  ['Other loops', 'Other chord loops.', ALL],
  ['Ballad', 'Slow, as in a ballad.', ALL],
  ['Faster', 'At a quicker tempo.', ALL],
  ['Two bars', 'Only two bars to listen to.', ALL],
  ['Everything', 'Any setup, loop and key, two bars.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

/** A simple tune for one bar: chord tones on 1 and 3, scale notes on 2 and 4, above `floor`. */
function tune(v: VoicedChord, tonicPc: number, floor: number, rand: () => number): number[] {
  const tones = v.upper.map((m) => atOrAbove(floor, m % 12)).sort((a, b) => a - b)
  const scale = (m: number) => MAJOR.includes((m - tonicPc + 120) % 12)
  const step = (m: number) => {
    const ups = [m + 1, m + 2].filter(scale)
    return ups.length ? ups[0] : m + 2
  }
  const a = pick(tones, rand)
  const c = pick(tones, rand)
  return [a, step(a), c, step(c)]
}

function bar(id: string, v: VoicedChord, tonicPc: number, t: number, beat: number, rand: () => number): TimedEvent[] {
  const at = (b: number, hold: number, notes: number[]) => chordEvent(t + b * beat, hold * beat, notes)
  switch (id) {
    case 'block':
      return barEvents(v, 'block', t, beat, rand)
    case 'bass-chord':
      return barEvents(v, 'basic', t, beat, rand)
    case 'spread': {
      const high = [...new Set(v.upper.map((m) => atOrAbove(64, m % 12)))].sort((a, b) => a - b)
      return [at(0, 3.8, [v.bass, v.bass + 7, v.bass + 12]), at(0, 1.9, high), at(2, 1.9, high)]
    }
    case 'melody-top': {
      const mel = tune(v, tonicPc, Math.max(...v.upper) + 1, rand)
      return [at(0, 3.8, [v.bass]), at(0, 0.95, [...v.upper, mel[0]]), at(1, 0.95, [mel[1]]), at(2, 0.95, [...v.upper, mel[2]]), at(3, 0.95, [mel[3]])]
    }
    default: {
      // lh-chord: the chord close below middle C, the tune above it.
      const low = [...new Set(v.upper.map((m) => { let x = m; while (x >= 60) x -= 12; return x }))].sort((a, b) => a - b)
      const mel = tune(v, tonicPc, 67, rand)
      return [at(0, 1.9, low), at(2, 1.9, low), ...mel.map((m, i) => at(i, 0.95, [m]))]
    }
  }
}

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const s = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const loop = pick(setup.loops, rand).slice(0, setup.bars)
  const { voiced, names } = voiceNumerals(tonicPc, loop)
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  const steps: { label: string; notes: number[] }[] = []
  voiced.forEach((v, i) => {
    const evs = bar(id, v, tonicPc, i * 4 * setup.beat, setup.beat, rand)
    events.push(...evs)
    stepOf.push(...evs.map(() => i))
    steps.push({ label: `bar ${i + 1} · ${names[i]}`, notes: [...new Set(evs.flatMap((e) => e.notes))].sort((a, b) => a - b) })
  })
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `${s.name} (${label}): ${s.how} Try it on ${names[0]}: ${s.tryIt}.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const handRolesExercise: ExerciseDef = {
  id: 'hand-roles',
  name: 'Hands and voicings',
  blurb: 'Hear a few bars and name how the hands share the work: chords in both hands, bass and chord, a spread (open) voicing, chords with the melody on top, or chords in the left hand with a tune in the right. Each suits a different moment in a song.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the low and high notes. How do the hands share the work?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'setup' },
  phrase: (item) => BY_ID.get(item.id)!.name.replace(/^./, (c) => c.toLowerCase()),
  tip: 'Keep the hands apart: left below middle C, right around or above it. With a singer: left bass, right chord, and play less while they sing. Fill when they stop. Alone: put the tune on top of your right-hand chords.',
}
