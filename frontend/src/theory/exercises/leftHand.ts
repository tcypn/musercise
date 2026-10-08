import { barEvents, type Pattern } from '../comping'
import { chordName, keyLabel, STACK, voiceProgression } from '../harmony'
import type { TimedEvent } from '../practice'
import { spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Left-hand patterns under a held right-hand chord, each with how to play it. */
const PATTERNS: readonly (Item & { how: string; tryIt: string })[] = [
  { id: 'root', short: 'Root', name: 'Root, held', hint: 'One low note per chord: calm', how: 'left hand: the root on beat 1, held for the bar.', tryIt: 'hold C E G with your right hand and play a low C with your left; change both together.' },
  { id: 'root-5th', short: 'Root + 5th', name: 'Root and 5th', hint: 'Two notes per bar: steady', how: 'left hand: the root on 1, the 5th on 3 (C then G).', tryIt: 'play C on 1 and G on 3 with your left hand under a held C chord.' },
  { id: 'octave', short: 'Octaves', name: 'Octaves', hint: 'Big and solid', how: 'left hand: the root in octaves (two Cs together) on 1 and 3.', tryIt: 'stretch your left hand over an octave, C to C, and play it on 1 and 3.' },
  { id: 'broken', short: 'Broken', name: 'Broken 1-5-8-5', hint: 'Rolling quarter notes', how: 'left hand: root, 5th, octave, 5th, one per beat (C G C G).', tryIt: 'play C G C G with your left hand, one per beat, under a held C chord.' },
  { id: 'alberti', short: 'Alberti', name: 'Alberti 1-5-3-5', hint: 'Classical: busy eighths', how: 'left hand: root, 5th, 3rd, 5th in eighth notes (C G E G), twice per bar.', tryIt: 'play C G E G C G E G with your left hand, evenly, as in a Mozart sonata.' },
  { id: 'stride', short: 'Stride', name: 'Stride', hint: 'Oom-pah: low note, then a chord', how: 'left hand: the low root on 1 and 3, a small chord (3rd, 5th, octave) on 2 and 4.', tryIt: 'jump between a low C on 1 and 3 and E G C on 2 and 4.' },
  { id: 'walk', short: 'Walking', name: 'Walking 1-2-3-5', hint: 'Steps up through the chord', how: 'left hand: root, 2nd, 3rd, 5th, one per beat (C D E G); the 2nd is a passing note.', tryIt: 'walk C D E G with your left hand, then start again from the next chord\'s root.' },
]
const BY_ID = new Map(PATTERNS.map((p) => [p.id, p]))
const items: readonly Item[] = PATTERNS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const DEGREE: Record<string, { step: [number, number]; type: 'maj' | 'min' }> = {
  I: { step: [0, 0], type: 'maj' }, ii: { step: [1, 2], type: 'min' }, IV: { step: [3, 5], type: 'maj' },
  V: { step: [4, 7], type: 'maj' }, vi: { step: [5, 9], type: 'min' },
}
const LOOPS = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['I', 'IV', 'V', 'IV'], ['I', 'vi', 'ii', 'V']]

const SETUP: Record<number, { anyKey: boolean; otherLoops: boolean; bpm: readonly number[] }> = {
  1: { anyKey: false, otherLoops: false, bpm: [80] }, 2: { anyKey: false, otherLoops: false, bpm: [80] },
  3: { anyKey: false, otherLoops: false, bpm: [80] }, 4: { anyKey: false, otherLoops: false, bpm: [80] },
  5: { anyKey: false, otherLoops: false, bpm: [80] }, 6: { anyKey: false, otherLoops: false, bpm: [80] },
  7: { anyKey: true, otherLoops: false, bpm: [80] }, 8: { anyKey: true, otherLoops: true, bpm: [80] },
  9: { anyKey: true, otherLoops: true, bpm: [66, 80, 100] }, 10: { anyKey: true, otherLoops: true, bpm: [66, 80, 100] },
}

const ORDER = PATTERNS.map((p) => p.id)
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const level = (id: number, name: string, blurb: string, n: number): Level => ({ id, name, blurb, items: ORDER.slice(0, n), modes: MAJ, lowRange: RANGE })
const levels: readonly Level[] = [
  level(1, 'Root or root and 5th', 'Your right hand holds the chord. Listen to the left hand only: one root per bar, or the root then the 5th on beat 3?', 2),
  level(2, 'Octaves', 'Add octaves: two roots together, a big solid sound.', 3),
  level(3, 'Broken', 'Add the broken pattern: root, 5th, octave, 5th, one per beat.', 4),
  level(4, 'Alberti', 'Add the Alberti bass: root, 5th, 3rd, 5th in quick eighth notes, as in classical pieces.', 5),
  level(5, 'Stride', 'Add stride: a low root, then a small chord, back and forth.', 6),
  level(6, 'Walking', 'Add the walk: root, 2nd, 3rd, 5th. The 2nd is a passing note that leads to the 3rd.', 7),
  level(7, 'Any key', 'Every pattern in any key.', 7),
  level(8, 'Other loops', 'Different chord loops.', 7),
  level(9, 'Tempos', 'Slow, medium and fast.', 7),
  level(10, 'Everything', 'Every pattern, key, loop and tempo.', 7),
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

function build(pattern: string, mode: Mode, loop: string[], tonicPc: number, bpm: number): Question {
  const chords = loop.map((n) => DEGREE[n])
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: (tonicPc + c.step[1]) % 12, stack: STACK[c.type] })))
  const beat = 60 / bpm
  const events: TimedEvent[] = []
  for (let pass = 0; pass < 2; pass++) voiced.forEach((v, i) => events.push(...barEvents(v, `lh-${pattern}` as Pattern, (pass * 4 + i) * 4 * beat, beat, () => 0)))
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const names = chords.map((c) => chordName(spellFrom(tonic, [c.step])[0], c.type))
  const p = BY_ID.get(pattern)!
  return {
    root: 48 + tonicPc, item: pattern, mode, notes: [48 + tonicPc],
    events,
    steps: voiced.map((v, i) => ({ label: `${loop[i]} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    explain: `${p.name}, ${loop.join('–')} in ${label} (${names.join(' ')}): ${p.how} Try it: ${p.tryIt}`,
    swap: (other) => build(other, mode, loop, tonicPc, bpm),
  }
}

function makeQuestion(lvl: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[lvl.id]
  const loop = setup.otherLoops ? pick(LOOPS, rand) : LOOPS[0]
  return build(item.id, mode, loop, setup.anyKey ? Math.floor(rand() * 12) : 0, pick(setup.bpm, rand))
}

export const leftHandExercise: ExerciseDef = {
  id: 'left-hand',
  name: 'Left-hand patterns',
  blurb: 'Your right hand holds the chord; the left hand gives it movement. Hear and name seven left-hand patterns, from a held root to Alberti and stride. Use Listen first to hear each one, then play along.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the left hand. Which pattern is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'pattern' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
}
