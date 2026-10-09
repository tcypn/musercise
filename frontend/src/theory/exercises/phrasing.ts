import { chordEvent, keyContext, keyLabel, type Help, type KeyMode } from '../harmony'
import type { TimedEvent } from '../practice'
import { noteLabel, spellFrom, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** What the response does with the call. */
const RESPONSES: readonly (Item & { how: string })[] = [
  { id: 'repeat', short: 'Repeat', name: 'Repeats the call', hint: 'The same notes again', how: 'repeats the call exactly. Repetition makes a phrase easy to remember.' },
  { id: 'contrast', short: 'New idea', name: 'A new idea', hint: 'A different shape', how: 'is a different shape altogether: contrast, for a fresh start.' },
  { id: 'sequence', short: 'Sequence', name: 'Moves the call (sequence)', hint: 'Same shape, one scale step higher or lower', how: 'keeps the call\'s shape but moves it one step of the scale: a sequence. It builds a line without new material.' },
  { id: 'answer', short: 'Answer', name: 'Answers the call', hint: 'Same start, but it comes home', how: 'starts like the call but ends on home (1) where the call ended up in the air: a question and its answer.' },
]
const BY_ID = new Map(RESPONSES.map((r) => [r.id, r]))
const items: readonly Item[] = RESPONSES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Pentatonic degrees as [label, letters, semitones] above home. */
const PENT: Record<KeyMode, [string, number, number][]> = {
  major: [['1', 0, 0], ['2', 1, 2], ['3', 2, 4], ['5', 4, 7], ['6', 5, 9]],
  minor: [['1', 0, 0], ['♭3', 2, 3], ['4', 3, 5], ['5', 4, 7], ['♭7', 6, 10]],
}

interface Setup {
  anyKey: boolean
  minor: boolean
  length: readonly [number, number]
  rhythm: boolean
  down: boolean
  help: Help
}
const S = (anyKey: boolean, minor: boolean, length: [number, number], rhythm: boolean, down: boolean, help: Help): Setup => ({ anyKey, minor, length, rhythm, down, help })
const SETUP: Record<number, Setup> = {
  1: S(false, false, [3, 4], false, false, 'full'), 2: S(false, false, [3, 4], false, false, 'full'), 3: S(false, false, [3, 4], false, false, 'full'),
  4: S(false, false, [5, 5], false, false, 'full'), 5: S(true, false, [4, 5], false, false, 'full'), 6: S(true, true, [4, 5], false, false, 'full'),
  7: S(true, false, [4, 5], true, false, 'full'), 8: S(true, false, [4, 5], true, true, 'full'), 9: S(true, false, [4, 5], true, true, 'light'),
  10: S(true, true, [3, 5], true, true, 'light'),
}

const MAJ = ['major', 'minor'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 88]
const upTo = (n: number) => RESPONSES.slice(0, n).map((r) => r.id)
const LEVEL_TEXT: [string, string, number][] = [
  ['Repeat or new idea', 'Hear a short call, a breath, then the response. Does the response repeat the call, or play something new?', 2],
  ['Sequence', 'Add the sequence: the same shape moved one step up the scale.', 3],
  ['Answer', 'Add the answer: it starts like the call but comes home to 1, where the call ended up in the air.', 4],
  ['Longer calls', 'Five-note calls.', 4],
  ['Any key', 'Every kind of response, in any key.', 4],
  ['Minor pentatonic', 'Calls and responses in the minor pentatonic, the sound of blues and R&B riffs.', 4],
  ['With a rhythm', 'Calls with long and short notes. A repeat or a sequence keeps the rhythm too.', 4],
  ['Going down', 'Sequences can also move one step down.', 4],
  ['Less help', 'Only the home chord first.', 4],
  ['Everything', 'Major and minor, any key, any length.', 4],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, n], i) => ({ id: i + 1, name, blurb, items: upTo(n), modes: i === 5 ? ['minor'] : i === 9 ? MAJ : ['major'], lowRange: RANGE }))

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

/** A motif: indexes into the pentatonic notes (0 = home, 5 = home an octave up), and note lengths in beats. */
interface Motif { idx: number[]; beats: number[] }

function sameShape(a: Motif, b: Motif): number | null {
  if (a.idx.length !== b.idx.length || a.beats.some((x, i) => x !== b.beats[i])) return null
  const d = b.idx[0] - a.idx[0]
  return a.idx.every((x, i) => b.idx[i] - x === d) ? d : null
}
/** What a response does: the same test the lesson's answers are built from. */
function kindOf(call: Motif, res: Motif): string {
  const d = sameShape(call, res)
  if (d === 0) return 'repeat'
  if (d === 1 || d === -1) return 'sequence'
  const sameRhythm = call.beats.length === res.beats.length && call.beats.every((x, i) => x === res.beats[i])
  const n = call.idx.length
  if (sameRhythm && call.idx.slice(0, n - 1).every((x, i) => x === res.idx[i]) && res.idx[n - 1] % 5 === 0 && call.idx[n - 1] % 5 !== 0) return 'answer'
  return 'contrast'
}

function makeCall(setup: Setup, rand: () => number): Motif {
  const n = setup.length[0] + Math.floor(rand() * (setup.length[1] - setup.length[0] + 1))
  for (;;) {
    const idx = [2 + Math.floor(rand() * 4)]
    while (idx.length < n) idx.push(Math.max(1, Math.min(8, idx[idx.length - 1] + pick([-2, -1, 1, 2], rand))))
    // The call ends up in the air, two steps from home (2, 3, 5 or 6 in major), so it can be answered,
    // and a sequence a step up or down never lands on home.
    if (![2, 3, 7, 8].includes(idx[n - 1])) continue
    const beats = setup.rhythm ? idx.map((_, i) => (i === n - 1 ? 2 : pick([0.5, 1, 1, 1.5], rand))) : idx.map((_, i) => (i === n - 1 ? 2 : 1))
    return { idx, beats }
  }
}

function makeResponse(kind: string, call: Motif, setup: Setup, rand: () => number): Motif {
  const n = call.idx.length
  if (kind === 'repeat') return { idx: [...call.idx], beats: [...call.beats] }
  if (kind === 'sequence') {
    const d = setup.down && rand() < 0.5 ? -1 : 1
    return { idx: call.idx.map((x) => x + d), beats: [...call.beats] }
  }
  if (kind === 'answer') {
    // The nearest home: the call ends on 2, 3, 7 or 8, so home is 0 (from 2), 5 (from 3 or 7) or 10 (from 8).
    const last = call.idx[n - 1]
    const home = last === 2 ? 0 : last === 8 ? 10 : 5
    return { idx: [...call.idx.slice(0, n - 1), home], beats: [...call.beats] }
  }
  for (;;) {
    const res = makeCall({ ...setup, length: [n, n] }, rand)
    if (kindOf(call, res) === 'contrast' && res.idx[0] !== call.idx[0]) return res
  }
}

function build(setup: Setup, kind: string, mode: Mode, tonicPc: number, seed: number): Question {
  let x = Math.floor(seed * 2147483646) + 1
  const rand = () => (x = (x * 48271) % 2147483647) / 2147483647
  const keyMode: KeyMode = mode === 'minor' ? 'minor' : 'major'
  const scale = PENT[keyMode]
  const call = makeCall(setup, rand)
  const res = makeResponse(kind, call, setup, rand)
  const { tonic, label } = keyLabel(tonicPc, keyMode)
  const home = 60 + tonicPc
  const midiOf = (i: number) => home + 12 * Math.floor(i / 5) + scale[((i % 5) + 5) % 5][2]
  const nameOf = (i: number) => {
    const [deg, letters, semis] = scale[((i % 5) + 5) % 5]
    return `${deg} · ${noteLabel(spellFrom(tonic, [[letters, semis] as Step])[0])}`
  }

  const context = keyContext(48 + tonicPc, keyMode, setup.help)
  const beat = 0.42
  const events: TimedEvent[] = [...context.events]
  const stepOf: (number | null)[] = context.events.map(() => null)
  const steps: { label: string; notes: number[] }[] = []
  let t = context.end + 0.8
  for (const [part, m] of [['call', call], ['response', res]] as const) {
    m.idx.forEach((i, k) => {
      events.push(chordEvent(t, m.beats[k] * beat * 0.95, [midiOf(i)]))
      steps.push({ label: `${part} · ${nameOf(i)}`, notes: [midiOf(i)] })
      stepOf.push(steps.length - 1)
      t += m.beats[k] * beat
    })
    t += 0.9 // a breath between call and response
  }
  const r = BY_ID.get(kind)!
  return {
    root: 48 + tonicPc, item: kind, mode, notes: [48 + tonicPc],
    events,
    answerFrom: context.events.length,
    stepOf, steps,
    explain: `In ${label}: the response ${r.how} Try it: play the call, then make up your own response of each kind.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const phrasingExercise: ExerciseDef = {
  id: 'phrasing',
  name: 'Phrasing, licks and call-and-response',
  blurb: 'Hear a short call and its response, and name what the response does: repeat it, move it up a step (a sequence), answer it by coming home, or play a new idea. This is how improvised lines get shape: say something, then reply to it.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the call and the response. What does the response do?',
  partLabels: { key: 'The key', question: 'Call and response' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
  tip: 'Improvise in short phrases with space between them. Play a call, then answer it: repeat it, move it up a step, or bring it home to 1. Leaving gaps is as important as the notes.',
}
