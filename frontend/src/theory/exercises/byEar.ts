import { chordName, keyContext, keyLabel, STACK, voiceProgression } from '../harmony'
import { barEvents, type Pattern } from '../comping'
import type { TimedEvent } from '../practice'
import { spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The chords of a major key a pop song uses, plus ♭VII, the rock and pop chord borrowed from minor. */
const CHORDS: readonly (Item & { letters: number; semis: number; type: 'maj' | 'min' })[] = [
  { id: 'I', short: 'I', name: 'Home chord', hint: 'At rest: everything returns here', letters: 0, semis: 0, type: 'maj' },
  { id: 'ii', short: 'ii', name: 'Two (minor)', hint: 'Soft and minor, leads on to V', letters: 1, semis: 2, type: 'min' },
  { id: 'iii', short: 'iii', name: 'Three (minor)', hint: 'Minor, close to I: a gentle shade of home', letters: 2, semis: 4, type: 'min' },
  { id: 'IV', short: 'IV', name: 'Four', hint: 'Bright, moving away from home', letters: 3, semis: 5, type: 'maj' },
  { id: 'V', short: 'V', name: 'Five', hint: 'Bright and tense: wants to go home', letters: 4, semis: 7, type: 'maj' },
  { id: 'vi', short: 'vi', name: 'Six (minor)', hint: 'The sad chord: the relative minor', letters: 5, semis: 9, type: 'min' },
  { id: 'bVII', short: '♭VII', name: 'Flat seven', hint: 'Big and rock: a whole step below home', letters: 6, semis: 10, type: 'maj' },
]
const BY_ID = new Map(CHORDS.map((c) => [c.id, c]))
const items: readonly Item[] = CHORDS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Loops heard in countless songs. */
const LOOPS: readonly string[][] = [
  ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['IV', 'I', 'V', 'vi'], ['I', 'vi', 'IV', 'V'], ['I', 'IV', 'V', 'IV'],
  ['I', 'IV', 'vi', 'V'], ['I', 'vi', 'ii', 'V'], ['I', 'iii', 'IV', 'V'], ['I', 'bVII', 'IV', 'I'], ['I', 'V', 'IV', 'V'], ['ii', 'V', 'I', 'vi'],
]

type Texture = Extract<Pattern, 'held' | 'bass' | 'broken' | 'pop' | 'melody'>
interface Setup {
  chords: readonly string[]
  textures: readonly Texture[]
  keyFirst: boolean
  /** Loops may start away from I, and any chord can be the one asked. */
  free: boolean
  bpm: number
}
const FOUR = ['I', 'IV', 'V', 'vi']
const FIVE = ['I', 'ii', 'IV', 'V', 'vi']
const ALL = CHORDS.map((c) => c.id)
const SETUP: Record<number, Setup> = {
  1: { chords: FOUR, textures: ['held'], keyFirst: true, free: false, bpm: 90 },
  2: { chords: FIVE, textures: ['held'], keyFirst: true, free: false, bpm: 90 },
  3: { chords: FIVE, textures: ['bass'], keyFirst: true, free: false, bpm: 90 },
  4: { chords: FIVE, textures: ['broken'], keyFirst: true, free: false, bpm: 80 },
  5: { chords: FIVE, textures: ['pop'], keyFirst: true, free: false, bpm: 96 },
  6: { chords: FIVE, textures: ['melody'], keyFirst: true, free: false, bpm: 96 },
  7: { chords: FIVE, textures: ['bass', 'broken', 'pop', 'melody'], keyFirst: true, free: true, bpm: 96 },
  8: { chords: FIVE, textures: ['bass', 'broken', 'pop', 'melody'], keyFirst: false, free: true, bpm: 96 },
  9: { chords: ALL, textures: ['bass', 'broken', 'pop', 'melody'], keyFirst: false, free: true, bpm: 96 },
  10: { chords: ALL, textures: ['held', 'bass', 'broken', 'pop', 'melody'], keyFirst: false, free: true, bpm: 112 },
}

const MAJOR = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const levels: readonly Level[] = [
  { id: 1, name: 'Four chords', blurb: 'Hear the key, then a four-chord loop, twice. Find the chord the question asks for: I, IV, V or vi. Most pop songs use just these four.', items: FOUR, modes: MAJOR, lowRange: RANGE },
  { id: 2, name: 'Add ii', blurb: 'Add ii, the soft minor chord that leads to V.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 3, name: 'Bass and chords', blurb: 'Played like a song: a bass note on the beat, the chord after it. Follow the bass.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 4, name: 'A ballad', blurb: 'Broken chords, as in a piano ballad.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 5, name: 'Pop rhythm', blurb: 'A pop comping rhythm, with the bass on beats 1 and 3.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 6, name: 'With a melody', blurb: 'A simple tune on top. Listen under it, to the bass and the chord.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 7, name: 'Not starting at home', blurb: 'Loops that start on vi, IV or ii, and any chord can be the one asked. Keep track of where home is.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 8, name: 'No key first', blurb: 'Like a real song: no key is played first. Find home from the loop itself.', items: FIVE, modes: MAJOR, lowRange: RANGE },
  { id: 9, name: 'iii and ♭VII', blurb: 'Add iii, and ♭VII, the big rock and pop chord a whole step below home (B♭ in C).', items: ALL, modes: MAJOR, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Every chord and every way of playing, at a faster tempo.', items: ALL, modes: MAJOR, lowRange: RANGE },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

/** A loop with the asked chord in it, and the position (0 to 3) that is asked. */
function loopFor(item: string, setup: Setup, rand: () => number): { loop: string[]; at: number } {
  const options: { loop: string[]; at: number }[] = []
  for (const loop of LOOPS) {
    if (!loop.every((n) => setup.chords.includes(n)) || (!setup.free && loop[0] !== 'I')) continue
    loop.forEach((n, at) => { if (n === item && (setup.free || at > 0)) options.push({ loop, at }) })
  }
  if (options.length && rand() < 0.7) return pick(options, rand)
  // A loop of the level's chords, never the same chord twice in a row (counting the turn back to the start).
  for (;;) {
    const at = setup.free ? Math.floor(rand() * 4) : 1 + Math.floor(rand() * 3)
    const loop = [0, 1, 2, 3].map((i) => (i === at ? item : i === 0 && !setup.free ? 'I' : pick(setup.chords, rand)))
    if (loop.every((n, i) => n !== loop[(i + 1) % 4])) return { loop, at }
  }
}

/** A repeatable random generator, so a swapped question keeps the same tune and rhythm. */
function seeded(seed: number): () => number {
  let x = Math.floor(seed * 2147483646) + 1
  return () => (x = (x * 48271) % 2147483647) / 2147483647
}

function build(setup: Setup, item: string, mode: Mode, loop: string[], at: number, tonicPc: number, texture: Texture, seed: number): Question {
  const rand = seeded(seed)
  const chords = loop.map((n) => BY_ID.get(n)!)
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: (tonicPc + c.semis) % 12, stack: STACK[c.type] })))

  const context = setup.keyFirst ? keyContext(48 + tonicPc, 'major', 'full') : { events: [], end: -0.9 }
  const start = context.end + 0.9
  const beat = 60 / setup.bpm
  const song: TimedEvent[] = []
  const stepOf: (number | null)[] = context.events.map(() => null)
  for (let pass = 0; pass < 2; pass++) {
    voiced.forEach((v, i) => {
      const bar = barEvents(v, texture, start + (pass * 4 + i) * 4 * beat, beat, rand)
      song.push(...bar)
      stepOf.push(...bar.map(() => i))
    })
  }

  const { tonic, label } = keyLabel(tonicPc, 'major')
  const names = chords.map((c) => chordName(spellFrom(tonic, [[c.letters, c.semis]])[0], c.type))
  const asked = voiced[at]
  return {
    // The root is home (C3 to B3), so a swapped question counts as the same setting even when chord 1 changes.
    root: 48 + tonicPc, item, mode, notes: [48 + tonicPc],
    events: [...context.events, ...song],
    stepOf,
    ...(setup.keyFirst ? { answerFrom: context.events.length } : {}),
    prompt: { text: `Which chord is number ${at + 1}?` },
    lit: [asked.bass, ...asked.upper],
    steps: voiced.map((v, i) => ({ label: `${i + 1}: ${chords[i].short} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    explain: `In ${label}: ${names.join(' ')}. Chord ${at + 1} is ${chords[at].short} (${names[at]}).`,
    // "Hear yours": the same song with only the asked chord changed.
    swap: (other) => build(setup, other, mode, loop.map((n, i) => (i === at ? other : n)), at, tonicPc, texture, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const { loop, at } = loopFor(item.id, setup, rand)
  return build(setup, item.id, mode, loop, at, Math.floor(rand() * 12), pick(setup.textures, rand), rand())
}

export const byEarExercise: ExerciseDef = {
  id: 'by-ear',
  name: 'Finding the chords by ear',
  blurb: 'Hear a four-chord loop played like a song, and find one chord at a time by its sound against home. This is how you work out the chords of a real song.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the loop and find the chord.',
  partLabels: { key: 'The key', question: 'The song' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key' },
  phrase: (item) => `${BY_ID.get(item.id)!.short}, the ${BY_ID.get(item.id)!.name.toLowerCase()}`,
}
