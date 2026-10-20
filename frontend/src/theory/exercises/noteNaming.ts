import { chordEvent } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const NAMES = ['C', 'C♯/D♭', 'D', 'E♭', 'E', 'F', 'F♯/G♭', 'G', 'A♭', 'A', 'B♭', 'B']
const IDS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const SHORT_NAME = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const items: readonly Item[] = IDS.map((id, pc) => ({ id, short: NAMES[pc], name: SHORT_NAME[pc], hint: [1, 3, 6, 8, 10].includes(pc) ? 'A black key' : 'A white key' }))

interface Setup {
  answers: readonly string[]
  /** The reference note's pitch class, or null for a different named reference each time. */
  ref: number | null
  /** Lowest and highest MIDI note asked. */
  span: readonly [number, number]
  /** Two notes after the reference: name the second. */
  two: boolean
}
const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const S = (answers: readonly string[], ref: number | null = 0, span: [number, number] = [60, 71], two = false): Setup => ({ answers, ref, span, two })
const SETUP: Record<number, Setup> = {
  1: S(['C', 'D', 'E']), 2: S(['C', 'D', 'E', 'F', 'G']), 3: S(WHITE), 4: S([...WHITE, 'F#', 'Bb']), 5: S(IDS),
  6: S(WHITE, 9), 7: S(IDS, null), 8: S(IDS, 0, [48, 83]), 9: S(IDS, 0, [60, 71], true), 10: S(IDS, null, [48, 83], true),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string][] = [
  ['C, D or E', 'A C plays first, then another note. Name it: C again, D a step up, or E two steps up.'],
  ['C to G', 'The first five white keys above C.'],
  ['All white keys', 'C D E F G A B: sing up from C to find it.'],
  ['F♯ and B♭', 'Two black keys join in.'],
  ['All twelve', 'Every note, black keys too.'],
  ['From A', 'The reference is A now (the orchestra\'s tuning note): the white keys again.'],
  ['Any reference', 'The reference changes; its name is given.'],
  ['Any octave', 'Notes higher and lower: the name is the same in every octave.'],
  ['Two notes', 'Two notes after the reference: name the second one.'],
  ['Everything', 'Any reference, any octave, two notes.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: SETUP[i + 1].answers, modes: MAJ, lowRange: [48, 83] as const }))

function build(setup: Setup, id: string, refPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const pc = IDS.indexOf(id)
  const ref = 60 + refPc
  const octaves = [] as number[]
  for (let m = setup.span[0]; m <= setup.span[1]; m++) if (m % 12 === pc) octaves.push(m)
  const note = pick(octaves, rand)
  const middle = 48 + Math.floor(rand() * 36)
  const events: TimedEvent[] = [chordEvent(0, 1.2, [ref])]
  const steps = [{ label: `reference · ${SHORT_NAME[refPc]}`, notes: [ref] }]
  let t = 1.6
  if (setup.two) {
    events.push(chordEvent(t, 0.8, [middle]))
    steps.push({ label: `first · ${SHORT_NAME[middle % 12]}`, notes: [middle] })
    t += 0.9
  }
  events.push(chordEvent(t, 1.4, [note]))
  steps.push({ label: `the note · ${SHORT_NAME[pc]}`, notes: [note] })
  const up = (pc - refPc + 12) % 12
  return {
    root: note, item: id, mode: 'major', notes: [note],
    events, answerFrom: 1, stepOf: steps.map((_, i) => i), steps,
    prompt: { text: `The reference is ${SHORT_NAME[refPc]}. Which note ${setup.two ? 'comes last' : 'follows it'}?` },
    explain: `${SHORT_NAME[pc]}: ${up === 0 ? 'the same note as the reference' : `${up} half step${up === 1 ? '' : 's'} above ${SHORT_NAME[refPc]}`}. Try it: play ${SHORT_NAME[refPc]}, then sing up to ${SHORT_NAME[pc]} before you play it.`,
    swap: (other) => build(setup, other, refPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, setup.ref ?? Math.floor(rand() * 12), rand())
}

export const noteNamingExercise: ExerciseDef = {
  id: 'note-naming',
  name: 'Naming a note by ear',
  blurb: 'Hear a reference note with its name, then another note, and name it. It trains your ear to turn what you hear into note names, the first step to playing a tune you hear.',
  hintLabel: 'On the piano:',
  question: 'Which note follows the reference?',
  partLabels: { key: 'The reference', question: 'The note' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'note' },
  phrase: (item) => `the note ${item.name}`,
  tip: 'Sing from the reference up the scale until you reach the note, counting letter names as you go. With practice you start to recognise the jump at once.',
}
