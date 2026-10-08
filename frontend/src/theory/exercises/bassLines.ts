import { chordEvent, chordName, keyContext, keyLabel, STACK, voiceProgression, type VoicedChord } from '../harmony'
import type { TimedEvent } from '../practice'
import { noteLabel, pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** How the bass moves under a chord loop. */
const LINES: readonly (Item & { how: string; tryIt: string })[] = [
  { id: 'roots', short: 'Roots', name: 'Roots', hint: 'The bass plays each chord\'s own name', how: 'the bass plays the root of each chord on beat 1.', tryIt: 'play the roots with your left hand, one per bar, under the chords.' },
  { id: 'pedal', short: 'Pedal', name: 'Pedal note', hint: 'One bass note held while the chords change', how: 'the bass stays on the home note while the chords change above it (a pedal).', tryIt: 'hold the home note low with your left hand and change only the right-hand chords.' },
  { id: 'walk-down', short: 'Walk down', name: 'Walk-down (slash chords)', hint: 'The bass steps down through the loop', how: 'each bass note is the nearest chord tone below the last, so some chords become slash chords (C – G/B – Am).', tryIt: 'play the bass notes shown, stepping down, under the right-hand chords.' },
  { id: 'walk-up', short: 'Walk up', name: 'Walk-up (passing note)', hint: 'A note on beat 4 leads into the next chord', how: 'the root on beat 1, then on beat 4 a passing note a half step below the next root leads into it.', tryIt: 'on beat 4 of each bar, play the note just below the next chord\'s root, then land on that root.' },
  { id: 'root-5th', short: 'Root + 5th', name: 'Root and 5th', hint: 'Two notes per bar, bouncing', how: 'the root on beat 1 and the 5th on beat 3.', tryIt: 'play root then 5th in each bar (C then G for C).' },
]
const BY_ID = new Map(LINES.map((l) => [l.id, l]))
const items: readonly Item[] = LINES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const DEGREE: Record<string, { step: Step; type: 'maj' | 'min' }> = {
  I: { step: [0, 0], type: 'maj' }, ii: { step: [1, 2], type: 'min' }, iii: { step: [2, 4], type: 'min' },
  IV: { step: [3, 5], type: 'maj' }, V: { step: [4, 7], type: 'maj' }, vi: { step: [5, 9], type: 'min' },
}
const TONES: Record<string, readonly Step[]> = { maj: [[0, 0], [2, 4], [4, 7]], min: [[0, 0], [2, 3], [4, 7]] }
/** Loops where walking down gives at least one slash chord, so it never sounds like plain roots. */
const LOOPS = [['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'iii', 'vi', 'IV'], ['IV', 'I', 'V', 'vi']]

const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

/** The bass notes of each bar (beat, MIDI) for a line over voiced chords. */
function bassLine(line: string, voiced: VoicedChord[], tonicPc: number, chordPcs: number[][]): [number, number][][] {
  const roots = voiced.map((v) => v.bass)
  switch (line) {
    case 'roots':
      return roots.map((r) => [[0, r]])
    case 'pedal': {
      const home = atOrAbove(36, tonicPc)
      return roots.map(() => [[0, home]])
    }
    case 'root-5th':
      return roots.map((r) => [[0, r], [2, r + 7]])
    case 'walk-up':
      return roots.map((r, i) => {
        const next = roots[(i + 1) % roots.length]
        return [[0, r], [3, next - 1]]
      })
    default: {
      // Walk down: start on the first root (raised an octave if low), then the nearest chord tone below each time.
      let last = roots[0] < 40 ? roots[0] + 12 : roots[0]
      return chordPcs.map((pcs, i) => {
        if (i > 0) {
          let m = last - 1
          while (!pcs.includes(((m % 12) + 12) % 12)) m--
          last = m
        }
        return [[0, last]]
      })
    }
  }
}

interface Setup {
  anyKey: boolean
  otherLoops: boolean
  busy: boolean
  keyFirst: boolean
  bpm: number
}
const S = (anyKey: boolean, otherLoops: boolean, busy: boolean, keyFirst: boolean, bpm: number): Setup => ({ anyKey, otherLoops, busy, keyFirst, bpm })
const SETUP: Record<number, Setup> = {
  1: S(false, false, false, true, 76), 2: S(false, false, false, true, 76), 3: S(false, false, false, true, 76), 4: S(false, false, false, true, 76),
  5: S(true, false, false, true, 76), 6: S(true, true, false, true, 76), 7: S(true, true, true, true, 76), 8: S(true, true, true, true, 96),
  9: S(true, true, true, false, 84), 10: S(true, true, true, false, 90),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [28, 84]
const lv = (id: number, name: string, blurb: string, its: string[]): Level => ({ id, name, blurb, items: its, modes: MAJ, lowRange: RANGE })
const ALL = LINES.map((l) => l.id)
const levels: readonly Level[] = [
  lv(1, 'Roots or pedal', 'Listen only to the lowest notes. Does the bass follow each chord\'s root, or stay on one home note while the chords change?', ['roots', 'pedal']),
  lv(2, 'Walk-down', 'Add the walk-down: the bass steps down, turning some chords into slash chords (C – G/B – Am).', ['roots', 'pedal', 'walk-down']),
  lv(3, 'Walk-up', 'Add the walk-up: a passing note on beat 4 leads into the next chord.', ['roots', 'pedal', 'walk-down', 'walk-up']),
  lv(4, 'Root and 5th', 'Add root and 5th: two notes per bar.', ALL),
  lv(5, 'Any key', 'Every bass line in any key.', ALL),
  lv(6, 'Other loops', 'Different chord loops.', ALL),
  lv(7, 'Busier right hand', 'The right hand plays a pop rhythm on top. Keep listening to the bass.', ALL),
  lv(8, 'Faster', 'A quicker tempo.', ALL),
  lv(9, 'No key first', 'No key is played first, as in a real song.', ALL),
  lv(10, 'Everything', 'Every bass line, key, loop and tempo.', ALL),
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

function build(setup: Setup, line: string, mode: Mode, loop: string[], tonicPc: number): Question {
  const chords = loop.map((n) => DEGREE[n])
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: (tonicPc + c.step[1]) % 12, stack: STACK[c.type] })))
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const roots: Note[] = chords.map((c) => spellFrom(tonic, [c.step])[0])
  const tones = chords.map((c, i) => spellFrom(roots[i], TONES[c.type]))
  const chordPcs = voiced.map((v) => [...new Set(v.upper.map((m) => m % 12))])
  const bass = bassLine(line, voiced, tonicPc, chordPcs)

  const context = setup.keyFirst ? keyContext(48 + tonicPc, 'major', 'full') : { events: [], end: -0.9 }
  const start = context.end + 0.9
  const beat = 60 / setup.bpm
  const bar = 4 * beat
  const song: TimedEvent[] = []
  const stepOf: (number | null)[] = context.events.map(() => null)
  for (let pass = 0; pass < 2; pass++) {
    voiced.forEach((v, i) => {
      const t = start + (pass * 4 + i) * bar
      if (setup.busy) song.push(...[0, 1.5, 3].map((b, k) => chordEvent(t + b * beat, (k === 2 ? 0.9 : 1.4) * beat, v.upper)))
      else song.push(chordEvent(t, 3.9 * beat, v.upper))
      bass[i].forEach(([b, m], k) => song.push(chordEvent(t + b * beat, ((bass[i][k + 1]?.[0] ?? 4) - b - 0.1) * beat, [m])))
      while (stepOf.length < context.events.length + song.length) stepOf.push(i)
    })
  }

  /** How a bass note is written: a chord tone, the home note (a pedal), or a passing note a half step below the next root. */
  const spellBass = (m: number, i: number) => {
    const tone = tones[i].find((t) => pitchClass(t) === m % 12)
    if (tone) return noteLabel(tone)
    if (m % 12 === tonicPc) return noteLabel(tonic)
    return noteLabel(spellFrom(roots[(i + 1) % roots.length], [[6, 11]])[0])
  }
  const names = chords.map((c, i) => chordName(roots[i], c.type))
  const steps = voiced.map((v, i) => {
    const first = spellBass(bass[i][0][1], i)
    const slash = bass[i][0][1] % 12 === v.bass % 12 ? names[i] : `${names[i]}/${first}`
    return { label: `${slash} · bass ${bass[i].map(([, m]) => spellBass(m, i)).join(' ')}`, notes: [...bass[i].map(([, m]) => m), ...v.upper] }
  })
  const l = BY_ID.get(line)!
  return {
    root: 48 + tonicPc, item: line, mode, notes: [48 + tonicPc],
    events: [...context.events, ...song],
    stepOf,
    ...(setup.keyFirst ? { answerFrom: context.events.length } : {}),
    steps,
    explain: `${l.name}, ${loop.join('–')} in ${label}: ${steps.map((s) => s.label.split(' · ')[0]).join(' ')}. ${l.how[0].toUpperCase()}${l.how.slice(1)} Try it: ${l.tryIt}`,
    swap: (other) => build(setup, other, mode, loop, tonicPc),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const loop = setup.otherLoops ? pick(LOOPS, rand) : LOOPS[0]
  return build(setup, item.id, mode, loop, setup.anyKey ? Math.floor(rand() * 12) : 0)
}

export const bassLinesExercise: ExerciseDef = {
  id: 'bass-lines',
  name: 'Bass lines',
  blurb: 'The left hand\'s other job: the bass line. Hear a chord loop and name how the bass moves: roots, a pedal note, a walk down through slash chords, a walk up with passing notes, or root and 5th.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the lowest notes. How does the bass move?',
  partLabels: { key: 'The key', question: 'The loop' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'bass line' },
  phrase: (item) => `a ${BY_ID.get(item.id)!.name.toLowerCase()} bass`,
}
