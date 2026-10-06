import { chordEvent, chordName, keyContext, keyLabel, STACK, voiceProgression, type Help, type KeyMode } from '../harmony'
import { pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Where a ii-V-I lands: the target chord's place in the home key, and whether it is a minor chord. */
interface Target extends Item {
  numeral: string
  step: Step
  minor: boolean
  feel: string
}
const TARGETS: readonly Target[] = [
  { id: 'major', short: 'Major', name: 'Major ii-V-I', hint: 'Warm and settled: lands on a major chord', numeral: 'I', step: [0, 0], minor: false, feel: 'A major ii-V-I: minor ii, major V, settling home on a major chord.' },
  { id: 'minor', short: 'Minor', name: 'Minor ii-V-i', hint: 'Darker: the ii is half-diminished, it lands on minor', numeral: 'i', step: [0, 0], minor: true, feel: 'A minor ii-V-i: the ii is diminished (m7♭5 with its 7th) and it lands on a minor chord.' },
  { id: 'to-IV', short: 'To IV', name: 'ii-V to IV', hint: 'Leaves home and lands one step "away", on IV', numeral: 'IV', step: [3, 5], minor: false, feel: 'The ii-V borrows the pull of a new key to land on IV, as in countless gospel and R&B songs.' },
  { id: 'to-V', short: 'To V', name: 'ii-V to V', hint: 'Lands on V: bright, but not home', numeral: 'V', step: [4, 7], minor: false, feel: 'A ii-V that lands on V, the chord of tension, as if V were briefly home.' },
  { id: 'to-vi', short: 'To vi', name: 'ii-V to vi', hint: 'Turns to the relative minor', numeral: 'vi', step: [5, 9], minor: true, feel: 'A minor ii-V-i into vi, the relative minor: the classic turn to a sad chord.' },
  { id: 'to-ii', short: 'To ii', name: 'ii-V to ii', hint: 'Lands on ii, a minor chord just above home', numeral: 'ii', step: [1, 2], minor: true, feel: 'A minor ii-V-i into ii; it often keeps going with ii-V-I back home.' },
]
const BY_ID = new Map(TARGETS.map((t) => [t.id, t]))
const items: readonly Item[] = TARGETS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

type Colour = 'triads' | 'sevenths' | 'rich'
interface Setup {
  inC: boolean
  colour: Colour | 'any'
  /** Play the key first (and how much of it). */
  help?: Help
  twice: 'never' | 'always' | 'sometimes'
}
const SETUP: Record<number, Setup> = {
  1: { inC: true, colour: 'triads', twice: 'never' },
  2: { inC: false, colour: 'sevenths', twice: 'never' },
  3: { inC: false, colour: 'sevenths', help: 'full', twice: 'never' },
  4: { inC: false, colour: 'sevenths', help: 'full', twice: 'never' },
  5: { inC: false, colour: 'sevenths', help: 'full', twice: 'never' },
  6: { inC: false, colour: 'sevenths', help: 'full', twice: 'never' },
  7: { inC: false, colour: 'sevenths', help: 'light', twice: 'never' },
  8: { inC: false, colour: 'sevenths', help: 'light', twice: 'always' },
  9: { inC: false, colour: 'rich', help: 'light', twice: 'never' },
  10: { inC: false, colour: 'any', help: 'light', twice: 'sometimes' },
}

const AWAY = ['major', 'to-IV', 'to-V', 'to-vi', 'to-ii']
const BOTH = ['major', 'minor'] as const satisfies readonly Mode[]
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 77]
const levels: readonly Level[] = [
  { id: 1, name: 'Major or minor', blurb: 'ii-V-I is three chords, each a 5th below the last: Dm G C in C major. In a minor key the ii is diminished: Ddim G Cm. Which one do you hear?', items: ['major', 'minor'], modes: BOTH, lowRange: RANGE },
  { id: 2, name: 'With 7ths', blurb: 'As jazz and R&B play it: Dm7 G7 Cmaj7, or Dm7♭5 G7 Cm7. Any key.', items: ['major', 'minor'], modes: BOTH, lowRange: RANGE },
  { id: 3, name: 'Home or IV', blurb: 'Hear the key first. Does the ii-V-I land home (I), or on IV (Gm7 C7 F in C)?', items: ['major', 'to-IV'], modes: MAJ, lowRange: RANGE },
  { id: 4, name: 'To V', blurb: 'Add a ii-V-I that lands on V (Am7 D7 G in C).', items: ['major', 'to-IV', 'to-V'], modes: MAJ, lowRange: RANGE },
  { id: 5, name: 'To vi', blurb: 'Add a minor ii-V-i into vi, the relative minor (Bm7♭5 E7 Am in C).', items: ['major', 'to-IV', 'to-V', 'to-vi'], modes: MAJ, lowRange: RANGE },
  { id: 6, name: 'To ii', blurb: 'Add a minor ii-V-i into ii (Em7♭5 A7 Dm in C).', items: AWAY, modes: MAJ, lowRange: RANGE },
  { id: 7, name: 'Less help', blurb: 'Only the home chord plays before the ii-V-I.', items: AWAY, modes: MAJ, lowRange: RANGE },
  { id: 8, name: 'Two in a row', blurb: 'Two ii-V-Is, one after the other, as in jazz standards. Where does the second one go?', items: AWAY, modes: MAJ, lowRange: RANGE },
  { id: 9, name: 'R&B colours', blurb: 'Richer chords: m9 on the ii, 9 or 13 on the V, maj9 or m9 on the I. Same moves, more colour.', items: AWAY, modes: MAJ, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Major and minor, every target, plain or rich, sometimes two in a row.', items: TARGETS.map((t) => t.id), modes: BOTH, lowRange: RANGE },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const STEP = 1.2

/** The three chord types of a ii-V-I landing on a major or a minor chord. */
function typesFor(minor: boolean, colour: Colour, rand: () => number): [string, string, string] {
  if (colour === 'triads') return minor ? ['dim', 'maj', 'min'] : ['min', 'maj', 'maj']
  if (colour === 'sevenths') return minor ? ['m7b5', '7', 'm7'] : ['m7', '7', 'maj7']
  const v = pick(['9', '13'], rand)
  return minor ? ['m7b5', v, 'm9'] : ['m9', v, 'maj9']
}

interface Chord { numeral: string; root: Note; type: string }
/** ii, V and the target, spelled from the target's root. */
function twoFiveOne(target: Target, home: Note, colour: Colour, relative: boolean, rand: () => number): Chord[] {
  const root = spellFrom(home, [target.step])[0]
  const [ii, v, i] = typesFor(target.minor, colour, rand)
  const seventh = colour !== 'triads'
  const of = relative && target.numeral !== 'I' ? ` of ${target.numeral}` : ''
  const iiName = target.minor ? (seventh ? 'iiø7' : 'ii°') : seventh ? 'ii7' : 'ii'
  return [
    { numeral: `${iiName}${of}`, root: spellFrom(root, [[1, 2]])[0], type: ii },
    { numeral: `${seventh ? 'V7' : 'V'}${of}`, root: spellFrom(root, [[4, 7]])[0], type: v },
    { numeral: target.numeral, root, type: i },
  ]
}

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const target = BY_ID.get(item.id)!
  const keyMode: KeyMode = item.id === 'minor' ? 'minor' : 'major'
  const colour: Colour = setup.colour === 'any' ? pick(['triads', 'sevenths', 'rich'] as const, rand) : setup.colour
  const tonicPc = setup.inC ? 0 : Math.floor(rand() * 12)
  const { tonic, label } = keyLabel(tonicPc, keyMode)
  const relative = setup.help !== undefined

  const twice = setup.twice === 'always' || (setup.twice === 'sometimes' && item.id !== 'minor' && rand() < 0.4)
  const first = twice ? twoFiveOne(BY_ID.get(pick(AWAY.filter((id) => id !== item.id), rand))!, tonic, colour, relative, rand) : []
  const chords = [...first, ...twoFiveOne(target, tonic, colour, relative, rand)]

  const voiced = voiceProgression(chords.map((c) => ({ rootPc: pitchClass(c.root), stack: STACK[c.type] })))
  const context = setup.help ? keyContext(48 + tonicPc, keyMode, setup.help) : { events: [], end: -0.9 }
  const start = context.end + 0.9
  const events = voiced.map((v, i) => chordEvent(start + i * STEP, i === voiced.length - 1 ? 2.8 : STEP + 0.3, [v.bass, ...v.upper]))
  const names = chords.map((c) => chordName(c.root, c.type))
  const firstNotes = events[0].notes
  return {
    root: firstNotes[0], item: item.id, mode: keyMode, notes: firstNotes,
    events: [...context.events, ...events],
    ...(setup.help ? { answerFrom: context.events.length } : {}),
    lit: firstNotes,
    steps: events.map((e, i) => ({ label: `${chords[i].numeral} · ${names[i]}`, notes: e.notes })),
    explain: `${setup.help ? `In ${label}: ` : ''}${names.join(' ')}. ${target.feel}`,
  }
}

export const twoFiveOneExercise: ExerciseDef = {
  id: 'two-five-one',
  name: 'ii-V-I',
  blurb: 'The move behind jazz, gospel and R&B harmony: ii, V, then I. Hear it in major and minor, and hear where it is heading when it leads away from home, to IV, V, vi or ii.',
  hintLabel: 'Sounds like:',
  question: 'Listen, then say what kind of ii-V-I you heard, or where it lands.',
  partLabels: { key: 'The key', question: 'The ii-V-I' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => `a ${BY_ID.get(item.id)!.name}`,
}
