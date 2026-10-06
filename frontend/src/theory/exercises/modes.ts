import { chordEvent, chordName, keyLabel, STACK, voiceProgression } from '../harmony'
import type { TimedEvent } from '../practice'
import { degreeLabel, runOrder, scaleRun, SCALES, type Direction } from '../scales'
import { noteLabel, spellFrom, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Each mode, the note that gives it its colour, and a two-chord vamp only that mode has. */
const MODES: readonly (Item & { minor: boolean; colour: string; vamp: [Step, string][] })[] = [
  { id: 'ionian', short: 'Ionian', name: 'Ionian (major)', hint: 'Plain major', minor: false, colour: 'the major scale itself', vamp: [[[0, 0], 'maj7'], [[3, 5], 'maj7']] },
  { id: 'dorian', short: 'Dorian', name: 'Dorian', hint: 'Minor with a bright 6th: soulful, funky', minor: true, colour: 'natural minor with a raised 6th: the bright note in a minor sound', vamp: [[[0, 0], 'm7'], [[3, 5], '7']] },
  { id: 'phrygian', short: 'Phrygian', name: 'Phrygian', hint: 'Minor with a dark ♭2: Spanish, tense', minor: true, colour: 'natural minor with a ♭2: the dark half step above home', vamp: [[[0, 0], 'm7'], [[1, 1], 'maj7']] },
  { id: 'lydian', short: 'Lydian', name: 'Lydian', hint: 'Major with a ♯4: dreamy, floating', minor: false, colour: 'major with a raised 4th: dreamy and floating', vamp: [[[0, 0], 'maj7'], [[1, 2], '7']] },
  { id: 'mixolydian', short: 'Mixolydian', name: 'Mixolydian', hint: 'Major with a ♭7: bluesy, rock', minor: false, colour: 'major with a ♭7: the sound of blues-rock and funk', vamp: [[[0, 0], '7'], [[6, 10], 'maj7']] },
  { id: 'aeolian', short: 'Aeolian', name: 'Aeolian (natural minor)', hint: 'Plain minor', minor: true, colour: 'natural minor: ♭3, ♭6 and ♭7', vamp: [[[0, 0], 'm7'], [[5, 8], 'maj7']] },
  { id: 'locrian', short: 'Locrian', name: 'Locrian', hint: 'Dark and unstable: ♭2 and ♭5', minor: true, colour: 'the darkest mode: ♭2 and ♭5, so even home sounds unstable', vamp: [[[0, 0], 'm7b5'], [[1, 1], 'maj7']] },
]
const BY_ID = new Map(MODES.map((m) => [m.id, m]))
const items: readonly Item[] = MODES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  inC: boolean
  directions: readonly Direction[]
  vamp: 'never' | 'always' | 'sometimes'
}
const SETUP: Record<number, Setup> = {
  1: { inC: true, directions: ['up'], vamp: 'never' },
  2: { inC: true, directions: ['up'], vamp: 'never' },
  3: { inC: true, directions: ['up'], vamp: 'never' },
  4: { inC: true, directions: ['up'], vamp: 'never' },
  5: { inC: true, directions: ['up'], vamp: 'never' },
  6: { inC: false, directions: ['up'], vamp: 'never' },
  7: { inC: false, directions: ['up'], vamp: 'always' },
  8: { inC: false, directions: ['down'], vamp: 'never' },
  9: { inC: false, directions: ['up', 'down'], vamp: 'never' },
  10: { inC: false, directions: ['up', 'down', 'updown'], vamp: 'sometimes' },
}

const SIX = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian']
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const levels: readonly Level[] = [
  { id: 1, name: 'Dorian', blurb: 'A low home note holds while a scale runs over it. Dorian is natural minor with a raised 6th: listen for the bright note near the top. Dorian or Aeolian (natural minor)?', items: ['dorian', 'aeolian'], modes: MAJ, lowRange: RANGE },
  { id: 2, name: 'Mixolydian', blurb: 'Mixolydian is major with a ♭7, the sound of blues-rock. Mixolydian or Ionian (major)?', items: ['ionian', 'mixolydian'], modes: MAJ, lowRange: RANGE },
  { id: 3, name: 'Four modes', blurb: 'Dorian, Aeolian, Mixolydian and Ionian together. First hear minor or major, then the one note that differs.', items: ['ionian', 'dorian', 'mixolydian', 'aeolian'], modes: MAJ, lowRange: RANGE },
  { id: 4, name: 'Lydian', blurb: 'Lydian is major with a raised 4th: dreamy and floating.', items: ['ionian', 'dorian', 'lydian', 'mixolydian', 'aeolian'], modes: MAJ, lowRange: RANGE },
  { id: 5, name: 'Phrygian', blurb: 'Phrygian is natural minor with a ♭2: the dark half step right above home.', items: SIX, modes: MAJ, lowRange: RANGE },
  { id: 6, name: 'Any key', blurb: 'The six modes from any home note.', items: SIX, modes: MAJ, lowRange: RANGE },
  { id: 7, name: 'Vamps', blurb: 'First a two-chord vamp only that mode has (Cm7–F7 is Dorian, C7–B♭maj7 is Mixolydian), then the scale.', items: SIX, modes: MAJ, lowRange: RANGE },
  { id: 8, name: 'Going down', blurb: 'The runs come down from the top.', items: SIX, modes: MAJ, lowRange: RANGE },
  { id: 9, name: 'Locrian', blurb: 'Add Locrian, the darkest mode: ♭2 and ♭5.', items: MODES.map((m) => m.id), modes: MAJ, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'All seven modes, any direction, sometimes with a vamp.', items: MODES.map((m) => m.id), modes: MAJ, lowRange: RANGE },
]

const GAP = 0.45
const BAR = 1.6

function build(id: string, mode: Mode, tonicPc: number, direction: Direction, withVamp: boolean): Question {
  const m = BY_ID.get(id)!
  const scale = SCALES[id]
  const home = 60 + tonicPc
  const { tonic } = keyLabel(tonicPc, m.minor ? 'minor' : 'major')

  // The vamp: its two chords twice, with the home note still in the bass under the second.
  const vampEvents: TimedEvent[] = []
  const vampSteps: { label: string; notes: number[] }[] = []
  if (withVamp) {
    const voiced = voiceProgression(m.vamp.map(([step, type]) => ({ rootPc: (tonicPc + step[1]) % 12, stack: STACK[type] })))
    for (let i = 0; i < 4; i++) vampEvents.push(chordEvent(i * BAR, BAR * 0.95, [voiced[i % 2].bass, ...voiced[i % 2].upper]))
    m.vamp.forEach(([step, type], i) => vampSteps.push({ label: chordName(spellFrom(tonic, [step])[0], type), notes: [voiced[i].bass, ...voiced[i].upper] }))
  }
  const start = withVamp ? 4 * BAR + 0.4 : 0.6
  const run = scaleRun(home, scale, direction, start, GAP)
  const drone = chordEvent(start - 0.6, run[run.length - 1].time - start + 2.2, [home - 24])
  const notes = spellFrom(tonic, scale)
  const order = runOrder(direction)
  return {
    root: home, item: id, mode, notes: [home],
    events: [...vampEvents, drone, ...run],
    steps: [
      ...vampSteps,
      { label: `Home · ${noteLabel(tonic)}`, notes: [home - 24] },
      ...order.map((i, n) => ({ label: `${i === 7 ? '8' : degreeLabel(scale[i])} · ${noteLabel(notes[i % 7])}`, notes: run[n].notes })),
    ],
    explain: `${noteLabel(tonic)} ${m.short}: ${[...notes, notes[0]].map(noteLabel).join(' ')}. ${m.short} is ${m.colour}.${withVamp ? ` Its vamp: ${vampSteps.map((s) => s.label).join('–')}.` : ''}`,
    swap: (other) => build(other, mode, tonicPc, direction, withVamp),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const direction = setup.directions[Math.floor(rand() * setup.directions.length)]
  const withVamp = setup.vamp === 'always' || (setup.vamp === 'sometimes' && rand() < 0.4)
  return build(item.id, mode, setup.inC ? 0 : Math.floor(rand() * 12), direction, withVamp)
}

export const modesExercise: ExerciseDef = {
  id: 'modes',
  name: 'Modes',
  blurb: 'Hear a scale over a held home note and name its mode: Dorian, Mixolydian, Lydian and the rest. Each mode is one note away from major or minor, and that note is its colour when you improvise.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the scale over the home note. Which mode is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'scale' },
  phrase: (item) => BY_ID.get(item.id)!.short,
}
