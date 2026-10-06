import { chordEvent, keyLabel } from '../harmony'
import { degreeLabel, runOrder, scaleRun, SCALES, type Direction } from '../scales'
import { noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const KINDS: readonly (Item & { explain: string })[] = [
  { id: 'major', short: 'Major', name: 'Major scale', hint: 'Bright all the way up', explain: 'the major scale: bright, with a major 3rd, 6th and 7th.' },
  { id: 'natural', short: 'Natural', name: 'Natural minor', hint: 'Dark and plain: ♭3, ♭6, ♭7', explain: 'natural minor: ♭3, ♭6 and ♭7, the plain minor sound of pop and rock.' },
  { id: 'harmonic', short: 'Harmonic', name: 'Harmonic minor', hint: 'Exotic: a wide gap from ♭6 up to 7', explain: 'harmonic minor: natural minor with a raised 7th, so the step from ♭6 to 7 is a wide, exotic gap.' },
  { id: 'melodic', short: 'Melodic', name: 'Melodic minor', hint: 'Minor at the bottom, major at the top', explain: 'melodic minor: minor 3rd, but a raised 6th and 7th, so the top half sounds major. (Played the jazz way, the same going down.)' },
]
const BY_ID = new Map(KINDS.map((k) => [k.id, k]))
const items: readonly Item[] = KINDS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  inC: boolean
  directions: readonly Direction[]
  homeFirst: boolean
  gap: number
}
const SETUP: Record<number, Setup> = {
  1: { inC: true, directions: ['up'], homeFirst: true, gap: 0.45 },
  2: { inC: true, directions: ['up'], homeFirst: true, gap: 0.45 },
  3: { inC: true, directions: ['up'], homeFirst: true, gap: 0.45 },
  4: { inC: false, directions: ['up'], homeFirst: true, gap: 0.45 },
  5: { inC: false, directions: ['down'], homeFirst: true, gap: 0.45 },
  6: { inC: false, directions: ['top'], homeFirst: true, gap: 0.5 },
  7: { inC: false, directions: ['up', 'down'], homeFirst: false, gap: 0.45 },
  8: { inC: false, directions: ['updown'], homeFirst: false, gap: 0.4 },
  9: { inC: false, directions: ['up', 'down', 'updown'], homeFirst: false, gap: 0.3 },
  10: { inC: false, directions: ['up', 'down', 'updown'], homeFirst: false, gap: 0.35 },
}

const ALL = KINDS.map((k) => k.id)
const MINORS = ['natural', 'harmonic', 'melodic']
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [48, 84]
const levels: readonly Level[] = [
  { id: 1, name: 'Major or minor', blurb: 'Hear the home note, then a scale from home up to home. Major, or natural minor (♭3, ♭6, ♭7)?', items: ['major', 'natural'], modes: MAJ, lowRange: RANGE },
  { id: 2, name: 'Harmonic minor', blurb: 'Harmonic minor raises the 7th of natural minor: listen for the wide, exotic step from ♭6 to 7 near the top.', items: ['major', 'natural', 'harmonic'], modes: MAJ, lowRange: RANGE },
  { id: 3, name: 'Melodic minor', blurb: 'Melodic minor raises the 6th and the 7th: minor at the bottom, major at the top.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 4, name: 'Any key', blurb: 'The same four scales from any home note.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 5, name: 'Going down', blurb: 'The runs come down from the top, so you hear the 7th and 6th first.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 6, name: 'The top half', blurb: 'Only 5, 6, 7 and 8: that is where the three minor scales differ.', items: MINORS, modes: MAJ, lowRange: RANGE },
  { id: 7, name: 'No home note', blurb: 'No home note first: the run itself tells you where home is.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 8, name: 'Up and down', blurb: 'Up to the top and back down.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 9, name: 'Faster', blurb: 'Quicker runs, as in a real melody.', items: ALL, modes: MAJ, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Every scale, up, down or both, any key, quick.', items: ALL, modes: MAJ, lowRange: RANGE },
]

function build(setup: Setup, kind: string, mode: Mode, tonicPc: number, direction: Direction): Question {
  const scale = SCALES[kind]
  const home = 60 + tonicPc
  const context = setup.homeFirst ? [chordEvent(0, 1.4, [home - 12, home])] : []
  const run = scaleRun(home, scale, direction, setup.homeFirst ? 2 : 0, setup.gap)
  // Spell from the usual name of the key: C♯ minor rather than D♭ minor.
  const { tonic } = keyLabel(tonicPc, kind === 'major' ? 'major' : 'minor')
  const notes = spellFrom(tonic, scale)
  const steps = runOrder(direction).map((i, n) => ({
    label: `${i === 7 ? '8' : degreeLabel(scale[i])} · ${noteLabel(notes[i % 7])}`,
    notes: run[n].notes,
  }))
  return {
    root: home, item: kind, mode, notes: [home],
    events: [...context, ...run],
    ...(setup.homeFirst ? { answerFrom: context.length } : {}),
    steps,
    explain: `From ${noteLabel(tonic)}: ${[...notes, notes[0]].map(noteLabel).join(' ')}. This is ${BY_ID.get(kind)!.explain}`,
    swap: (other) => build(setup, other, mode, tonicPc, direction),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const direction = setup.directions[Math.floor(rand() * setup.directions.length)]
  return build(setup, item.id, mode, setup.inC ? 0 : Math.floor(rand() * 12), direction)
}

export const minorScalesExercise: ExerciseDef = {
  id: 'minor-scales',
  name: 'Minor scales',
  blurb: 'Hear a scale and name it: major, natural minor, harmonic minor or melodic minor. Much of R&B, pop ballads and classical music lives in these minor scales.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the scale. Which one is it?',
  partLabels: { key: 'Home', question: 'The scale' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'scale' },
  phrase: (item) => `the ${BY_ID.get(item.id)!.name.toLowerCase()}`,
}
