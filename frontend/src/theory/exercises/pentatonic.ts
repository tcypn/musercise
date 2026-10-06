import { keyContext, keyLabel, type Help, type KeyMode } from '../harmony'
import { noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The notes of the scales, in pitch order: [letters above the tonic, semitones above the tonic]. */
const DEGREES: readonly { id: string; short: string; name: string; hint: string; letters: number; semis: number; ordinal: string }[] = [
  { id: '1', short: '1', name: 'Home (tonic)', hint: 'Settled: the line has arrived', letters: 0, semis: 0, ordinal: 'home note (1)' },
  { id: '2', short: '2', name: 'Second', hint: 'Floats just above home', letters: 1, semis: 2, ordinal: '2nd' },
  { id: 'b3', short: '♭3', name: 'Flat third', hint: 'The minor sound, bluesy and dark', letters: 2, semis: 3, ordinal: 'flat 3rd' },
  { id: '3', short: '3', name: 'Third', hint: 'Bright and sweet, a gentle landing', letters: 2, semis: 4, ordinal: '3rd' },
  { id: '4', short: '4', name: 'Fourth', hint: 'Open, a step above the ♭3', letters: 3, semis: 5, ordinal: '4th' },
  { id: 'b5', short: '♭5', name: 'Blue note (flat fifth)', hint: 'Gritty: the blues note between 4 and 5', letters: 4, semis: 6, ordinal: 'blue note (♭5)' },
  { id: '5', short: '5', name: 'Fifth', hint: 'Strong and stable, but not quite home', letters: 4, semis: 7, ordinal: '5th' },
  { id: '6', short: '6', name: 'Sixth', hint: 'Warm and open, wants to go on', letters: 5, semis: 9, ordinal: '6th' },
  { id: 'b7', short: '♭7', name: 'Flat seventh', hint: 'Relaxed and bluesy, just below home', letters: 6, semis: 10, ordinal: 'flat 7th' },
]
const BY_ID = new Map(DEGREES.map((d) => [d.id, d]))

type Scale = 'major' | 'minor' | 'blues'
const SCALES: Record<Scale, readonly string[]> = {
  major: ['1', '2', '3', '5', '6'],
  minor: ['1', 'b3', '4', '5', 'b7'],
  blues: ['1', 'b3', '4', 'b5', '5', 'b7'],
}

const items: readonly Item[] = DEGREES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Per level: tune length, the largest jump in scale notes, whether the key is always C, and which scale a minor key uses. */
interface Shape {
  length: readonly [number, number]
  leap: number
  inC: boolean
  minor: Scale
}
const SHAPE: Record<number, Shape> = {
  1: { length: [3, 3], leap: 1, inC: true, minor: 'minor' },
  2: { length: [3, 3], leap: 1, inC: true, minor: 'minor' },
  3: { length: [4, 4], leap: 1, inC: true, minor: 'minor' },
  4: { length: [5, 5], leap: 2, inC: true, minor: 'minor' },
  5: { length: [4, 5], leap: 2, inC: false, minor: 'minor' },
  6: { length: [4, 5], leap: 2, inC: false, minor: 'minor' },
  7: { length: [4, 5], leap: 2, inC: false, minor: 'minor' },
  8: { length: [4, 5], leap: 2, inC: false, minor: 'minor' },
  9: { length: [4, 5], leap: 2, inC: false, minor: 'blues' },
  10: { length: [3, 5], leap: 2, inC: false, minor: 'blues' },
}

const MAJOR = ['major'] as const satisfies readonly Mode[]
const MINOR = ['minor'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [55, 84]

const levels: readonly Level[] = [
  { id: 1, name: 'Landing notes', blurb: 'The major pentatonic is five notes of the major scale: 1 2 3 5 6 (C D E G A in C). Hear the key, then a three-note tune, and say where it lands: 1, 3 or 5.', items: ['1', '3', '5'], modes: MAJOR, lowRange: RANGE },
  { id: 2, name: 'All five notes', blurb: 'The tune can now land on any of the five: 1, 2, 3, 5 or 6.', items: SCALES.major, modes: MAJOR, lowRange: RANGE },
  { id: 3, name: 'Four notes', blurb: 'Longer tunes: four notes, moving to the next note of the scale up or down.', items: SCALES.major, modes: MAJOR, lowRange: RANGE },
  { id: 4, name: 'Five notes and skips', blurb: 'Five-note tunes that may skip a note of the scale, as real lines do.', items: SCALES.major, modes: MAJOR, lowRange: RANGE },
  { id: 5, name: 'Any key', blurb: 'The same five notes in every key: the numbers stay the same, only the home note moves.', items: SCALES.major, modes: MAJOR, lowRange: RANGE },
  { id: 6, name: 'Less help', blurb: 'Only the home chord plays before the tune, not the whole I–IV–V–I.', items: SCALES.major, modes: MAJOR, lowRange: RANGE, help: 'light' },
  { id: 7, name: 'Minor pentatonic', blurb: 'The minor pentatonic: 1 ♭3 4 5 ♭7 (A C D E G in A minor). The sound of rock, blues and R&B riffs.', items: SCALES.minor, modes: MINOR, lowRange: RANGE },
  { id: 8, name: 'Minor, less help', blurb: 'Minor pentatonic tunes after only the home chord.', items: SCALES.minor, modes: MINOR, lowRange: RANGE, help: 'light' },
  { id: 9, name: 'The blue note', blurb: 'Add the ♭5 between 4 and 5: the minor pentatonic becomes the blues scale.', items: SCALES.blues, modes: MINOR, lowRange: RANGE, help: 'light' },
  { id: 10, name: 'Everything', blurb: 'Major and minor keys, any key, the blues note too, with the least help.', items: DEGREES.map((d) => d.id), modes: ['major', 'minor'], lowRange: RANGE, help: 'light' },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

/** The key a degree belongs to: 2, 3 and 6 only in major; ♭3, 4, ♭5 and ♭7 only in minor; 1 and 5 in both. */
function modeFor(id: string, asked: KeyMode): KeyMode {
  if (SCALES.major.includes(id) && !SCALES.blues.includes(id)) return 'major'
  if (SCALES.blues.includes(id) && !SCALES.major.includes(id)) return 'minor'
  return asked
}

function makeQuestion(level: Level, item: Item, asked: Mode, rand: () => number): Question {
  const shape = SHAPE[level.id]
  const keyMode = level.modes.length > 1 ? modeFor(item.id, asked as KeyMode) : (asked as KeyMode)
  const scale = SCALES[keyMode === 'major' ? 'major' : shape.minor]
  const tonicPc = shape.inC ? 0 : Math.floor(rand() * 12)
  // The tune sits an octave above the key chords: home between C4 and B4.
  const home = 60 + tonicPc
  const pool: number[] = []
  for (let midi = RANGE[0]; midi <= RANGE[1]; midi++) {
    if (scale.some((id) => (midi - home - BY_ID.get(id)!.semis + 120) % 12 === 0)) pool.push(midi)
  }
  // Pick where the tune ends, near home, then walk backwards through the scale to its start.
  const target = BY_ID.get(item.id)!.semis
  const ends = pool.map((m, i) => [m, i] as const).filter(([m]) => (m - home - target + 120) % 12 === 0 && m >= home - 5 && m <= home + 14)
  let at = pick(ends, rand)[1]
  const length = shape.length[0] + Math.floor(rand() * (shape.length[1] - shape.length[0] + 1))
  const path = [at]
  while (path.length < length) {
    const moves: number[] = []
    for (let d = -shape.leap; d <= shape.leap; d++) if (d !== 0 && at + d >= 0 && at + d < pool.length) moves.push(at + d)
    at = pick(moves, rand)
    path.push(at)
  }
  const tune = path.reverse().map((i) => pool[i])

  const help: Help = level.help ?? 'full'
  const { events: context, end } = keyContext(48 + tonicPc, keyMode, help)
  const start = end + 0.9
  const notes = tune.map((midi, i) => ({ time: start + i * 0.55, hold: i === tune.length - 1 ? 1.8 : 0.5, notes: [midi] }))

  const { tonic, label } = keyLabel(tonicPc, keyMode)
  const degreeOf = (midi: number) => DEGREES.find((d) => (midi - home - d.semis + 120) % 12 === 0 && scale.includes(d.id))!
  const name = (midi: number) => {
    const d = degreeOf(midi)
    return noteLabel(spellFrom(tonic, [[d.letters, d.semis]])[0])
  }
  const last = tune[tune.length - 1]
  return {
    root: last,
    item: item.id,
    mode: keyMode,
    notes: tune,
    events: [...context, ...notes],
    answerFrom: context.length,
    steps: tune.map((midi) => ({ label: `${degreeOf(midi).short} · ${name(midi)}`, notes: [midi] })),
    explain: `In ${label}: ${tune.map(name).join(' ')}. The tune ended on ${name(last)}, the ${BY_ID.get(item.id)!.ordinal}.`,
  }
}

export const pentatonicExercise: ExerciseDef = {
  id: 'pentatonic',
  name: 'Pentatonic scale',
  blurb: 'Hear a key, then a short tune made only of pentatonic notes, and say which note it ended on. These five notes are the safest first tool for improvising, and knowing where a line lands is how you start making your own.',
  hintLabel: 'Feels:',
  question: 'Listen to the key, then the tune. Which note of the scale does the tune end on?',
  partLabels: { key: 'The key', question: 'Where does it end?' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.8 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => `the ${BY_ID.get(item.id)!.ordinal}`,
}
