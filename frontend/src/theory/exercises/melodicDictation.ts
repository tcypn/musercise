import { chordEvent, keyContext, keyLabel, type Help } from '../harmony'
import type { TimedEvent } from '../practice'
import { seededRandom } from '../rhythm'
import { MAJOR_SCALE, noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/*
 * A melody is a list of scale degrees of a major key (1 to 7, and 8 for the 1 an octave up), written as its id:
 * "1-2-3-5". The choices are other melodies of the level, the closest first (one note different).
 */

const SEMIS = [0, 2, 4, 5, 7, 9, 11, 12]

/** Every melody of `length` notes from the given starts, moving by the given steps, staying between lo and hi. */
function melodies(length: number, starts: readonly number[], moves: readonly number[], lo: number, hi: number): string[] {
  let out: number[][] = starts.map((s) => [s])
  for (let i = 1; i < length; i++) out = out.flatMap((m) => moves.map((d) => m[m.length - 1] + d).filter((n) => n >= lo && n <= hi).map((n) => [...m, n]))
  return out.map((m) => m.join('-'))
}
/** At most `n` of them, the same ones every time (a fixed shuffle). */
function some(list: string[], n: number): string[] {
  if (list.length <= n) return list
  const rand = seededRandom(0.37)
  return list.map((id) => ({ id, k: rand() })).sort((a, b) => a.k - b.k).slice(0, n).map((o) => o.id).sort()
}

interface Setup { set: string[]; anyKey: boolean; help: Help }
const STEP = [-2, -1, 1, 2]
const SETS = {
  three: melodies(3, [1], STEP, 1, 3),
  four: melodies(4, [1, 3], [-1, 1], 1, 5),
  fourSkips: some(melodies(4, [1], STEP, 1, 5), 40),
  five: some(melodies(5, [1, 3, 5], STEP, 1, 6), 48),
  octave: some(melodies(5, [1], [-3, -2, -1, 1, 2, 3], 1, 8), 48),
  six: some(melodies(6, [1, 5], STEP, 1, 8), 48),
  leaps: some(melodies(5, [1], [-4, -2, -1, 1, 2, 4], 1, 8), 48),
}
const SETUP: Record<number, Setup> = {
  1: { set: SETS.three, anyKey: false, help: 'full' },
  2: { set: SETS.four, anyKey: false, help: 'full' },
  3: { set: SETS.fourSkips, anyKey: false, help: 'full' },
  4: { set: SETS.five, anyKey: false, help: 'full' },
  5: { set: SETS.octave, anyKey: false, help: 'full' },
  6: { set: SETS.octave, anyKey: true, help: 'full' },
  7: { set: SETS.six, anyKey: true, help: 'full' },
  8: { set: SETS.leaps, anyKey: true, help: 'full' },
  9: { set: SETS.octave, anyKey: true, help: 'light' },
  10: { set: some([...new Set([...SETS.five, ...SETS.six, ...SETS.leaps])], 60), anyKey: true, help: 'light' },
}
const ALL = [...new Set(Object.values(SETUP).flatMap((s) => s.set))]
const show = (id: string) => id.split('-').join(' ')
const items: readonly Item[] = ALL.map((id) => ({ id, short: show(id), name: `the tune ${show(id)}`, hint: `${id.split('-').length} notes` }))

const MAJ = ['major'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string][] = [
  ['Three notes', 'Hear the key, then a three-note tune starting on home (1). Which numbers did you hear?'],
  ['Four notes, by step', 'Four notes, starting on 1 or 3, each moving to the next scale note up or down.'],
  ['Skips', 'Now a note can skip one: 1 3, 5 3.'],
  ['Five notes', 'Five notes, starting on 1, 3 or 5.'],
  ['Up to the octave', 'From 1 up to 8 (home an octave up), with skips of up to a 4th.'],
  ['Any key', 'The same tunes in any key: the numbers stay the same.'],
  ['Six notes', 'Longer tunes: hold the first half while you hear the rest.'],
  ['Leaps', 'Jumps of a 5th: 1 to 5, 4 to 8.'],
  ['Less help', 'Only the home chord before the tune.'],
  ['Everything', 'Any tune, any key, less help.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: SETUP[i + 1].set, modes: MAJ, lowRange: [48, 84] as const }))

const apart = (a: string, b: string) => {
  const x = a.split('-')
  const y = b.split('-')
  return x.length !== y.length ? 99 : x.filter((d, i) => d !== y[i]).length
}

function build(setup: Setup, id: string, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const degrees = id.split('-').map(Number)
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const names = spellFrom(tonic, MAJOR_SCALE).map(noteLabel)
  const context = keyContext(48 + tonicPc, 'major', setup.help)
  const home = 60 + tonicPc
  const events: TimedEvent[] = [...context.events]
  const stepOf: (number | null)[] = context.events.map(() => null)
  let t = context.end + 0.8
  degrees.forEach((d, i) => {
    events.push(chordEvent(t, 0.5, [home + SEMIS[d - 1]]))
    stepOf.push(i)
    t += 0.55
  })
  // Three other tunes, the closest first.
  const others = setup.set.filter((m) => m !== id).map((m) => ({ m, d: apart(m, id), k: rand() })).sort((a, b) => a.d - b.d || a.k - b.k).slice(0, 3).map((o) => o.m)
  return {
    root: 48 + tonicPc, item: id, mode: 'major', notes: [48 + tonicPc],
    events, answerFrom: context.events.length, stepOf,
    steps: degrees.map((d) => ({ label: `${d} · ${names[(d - 1) % 7]}`, notes: [home + SEMIS[d - 1]] })),
    choices: [id, ...others].map((m) => ({ m, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.m),
    explain: `In ${label}: ${show(id)}, that is ${degrees.map((d) => names[(d - 1) % 7]).join(' ')}. Try it: sing it back on numbers, then play it.`,
    swap: (other) => build(setup, other, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const melodicDictationExercise: ExerciseDef = {
  id: 'melodic-dictation',
  name: 'Melodic dictation',
  blurb: 'Hear the key, then a short tune, and pick how it is written in scale numbers ("1 2 3 5 3") from four close choices. This is how you learn a tune you hear: as numbers, in any key.',
  hintLabel: 'Length:',
  question: 'Which tune did you hear?',
  partLabels: { key: 'The key', question: 'The tune' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'tune' },
  phrase: (item) => `“${item.short}”`,
  tip: 'Find the first note against home (1), then follow the tune step by step: up or down, by a step or a skip? Sing the numbers quietly as it plays.',
}
