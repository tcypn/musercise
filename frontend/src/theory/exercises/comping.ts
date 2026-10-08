import { beatsPerBar, barEvents, type Pattern } from '../comping'
import { chordName, keyLabel, STACK, voiceProgression } from '../harmony'
import type { TimedEvent } from '../practice'
import { spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The accompaniment patterns, each with how to play it in words. */
const PATTERNS: readonly (Item & { grid: string })[] = [
  { id: 'block', short: 'Block', name: 'Block on every beat', hint: 'Both hands, whole chord, every beat: heavy', grid: 'both hands play the whole chord on every beat. It keeps time but sounds heavy: the place to start from, not to stay.' },
  { id: 'basic', short: 'Basic pop', name: 'Basic pop', hint: 'Bass and 5th below, soft chords on every beat', grid: 'left hand: the bass on 1, the 5th on 3. Right hand: the chord on every beat, softer.' },
  { id: 'ballad', short: 'Ballad', name: 'Ballad (broken left hand)', hint: 'A rolling left hand under a held chord', grid: 'right hand: hold the chord. Left hand rolls root, 5th, octave, 5th in eighths: 1 & 2 & 3 & 4 &.' },
  { id: 'push', short: 'Pop push', name: 'Pop push', hint: 'Bouncy: the chord lands just before beat 3', grid: 'right hand: the chord on 1, the "&" of 2, and 4. Left hand: the bass on 1 and 3.' },
  { id: 'arpeggio', short: 'Arpeggio', name: 'Arpeggio', hint: 'Soft: the chord one note at a time', grid: 'left hand: the bass on 1, held. Right hand: the chord one note at a time on the "&"s.' },
  { id: 'rnb', short: 'R&B', name: 'R&B syncopated', hint: 'Short, off-beat chords with space', grid: 'right hand: short chords on 1, the "&" of 2 and the "&" of 3. Left hand: the bass on 1 and 4. Leave space.' },
  { id: 'gospel', short: 'Gospel', name: 'Gospel octaves', hint: 'Big: octaves in the left hand', grid: 'left hand: octaves on 1 and 3. Right hand: the full chord on every beat. For the big last chorus.' },
  { id: 'waltz', short: 'Waltz', name: 'Waltz (3/4)', hint: 'Oom-pah-pah: bass, chord, chord', grid: 'three beats: the bass on 1, the chord on 2 and 3.' },
]
const BY_ID = new Map(PATTERNS.map((p) => [p.id, p]))
const items: readonly Item[] = PATTERNS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const DEGREE: Record<string, { step: [number, number]; type: 'maj' | 'min' }> = {
  I: { step: [0, 0], type: 'maj' }, ii: { step: [1, 2], type: 'min' }, IV: { step: [3, 5], type: 'maj' },
  V: { step: [4, 7], type: 'maj' }, vi: { step: [5, 9], type: 'min' },
}
const LOOPS = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['I', 'IV', 'V', 'IV'], ['I', 'vi', 'ii', 'V']]

interface Setup {
  anyKey: boolean
  bpm: readonly number[]
}
const SETUP: Record<number, Setup> = {
  1: { anyKey: false, bpm: [84] }, 2: { anyKey: false, bpm: [84] }, 3: { anyKey: false, bpm: [84] }, 4: { anyKey: false, bpm: [84] },
  5: { anyKey: false, bpm: [84] }, 6: { anyKey: false, bpm: [84] }, 7: { anyKey: false, bpm: [84] }, 8: { anyKey: true, bpm: [84] },
  9: { anyKey: true, bpm: [66, 84, 104] }, 10: { anyKey: true, bpm: [66, 84, 104] },
}

const ORDER = PATTERNS.map((p) => p.id)
const upTo = (n: number) => ORDER.slice(0, n)
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const levels: readonly Level[] = [
  { id: 1, name: 'Split the hands', blurb: 'Block chords in both hands on every beat, or basic pop: bass in the left hand, soft chords in the right. Hear how much lighter the split sounds.', items: upTo(2), modes: MAJ, lowRange: RANGE },
  { id: 2, name: 'Ballad', blurb: 'Add the ballad: a held chord over a rolling left hand.', items: upTo(3), modes: MAJ, lowRange: RANGE },
  { id: 3, name: 'Pop push', blurb: 'Add the pop push: the chord lands on the "&" of 2, just before beat 3.', items: upTo(4), modes: MAJ, lowRange: RANGE },
  { id: 4, name: 'Arpeggio', blurb: 'Add the arpeggio: the right hand plays the chord one note at a time.', items: upTo(5), modes: MAJ, lowRange: RANGE },
  { id: 5, name: 'R&B', blurb: 'Add R&B: short, off-beat chords with space between.', items: upTo(6), modes: MAJ, lowRange: RANGE },
  { id: 6, name: 'Gospel', blurb: 'Add gospel: octaves in the left hand, full chords on every beat.', items: upTo(7), modes: MAJ, lowRange: RANGE },
  { id: 7, name: 'Waltz', blurb: 'Add the waltz, in 3/4: bass, chord, chord.', items: ORDER, modes: MAJ, lowRange: RANGE },
  { id: 8, name: 'Other keys and loops', blurb: 'Every pattern in any key, over different loops.', items: ORDER, modes: MAJ, lowRange: RANGE },
  { id: 9, name: 'Tempos', blurb: 'Slow, medium and fast: a pattern keeps its shape at any speed.', items: ORDER, modes: MAJ, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Every pattern, key, loop and tempo.', items: ORDER, modes: MAJ, lowRange: RANGE },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

function build(pattern: Pattern, mode: Mode, loop: string[], tonicPc: number, bpm: number): Question {
  const chords = loop.map((n) => DEGREE[n])
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: (tonicPc + c.step[1]) % 12, stack: STACK[c.type] })))
  const beat = 60 / bpm
  const bar = beatsPerBar(pattern) * beat
  const events: TimedEvent[] = []
  for (let pass = 0; pass < 2; pass++) voiced.forEach((v, i) => events.push(...barEvents(v, pattern, (pass * 4 + i) * bar, beat, () => 0)))
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const names = chords.map((c) => chordName(spellFrom(tonic, [c.step])[0], c.type))
  const p = BY_ID.get(pattern)!
  return {
    root: 48 + tonicPc, item: pattern, mode, notes: [48 + tonicPc],
    events,
    steps: voiced.map((v, i) => ({ label: `${loop[i]} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    explain: `${p.name}, ${loop.join('–')} in ${label} (${names.join(' ')}): ${p.grid}`,
    swap: (other) => build(other as Pattern, mode, loop, tonicPc, bpm),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const loop = setup.anyKey ? pick(LOOPS, rand) : LOOPS[0]
  return build(item.id as Pattern, mode, loop, setup.anyKey ? Math.floor(rand() * 12) : 0, pick(setup.bpm, rand))
}

export const compingExercise: ExerciseDef = {
  id: 'comping',
  name: 'Comping patterns',
  blurb: 'Hear a chord loop played in one accompaniment pattern and name it: basic pop, ballad, pop push, arpeggio, R&B, gospel or waltz. Use Listen first to hear each one, then play along.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the accompaniment. Which pattern is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'pattern' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
}
