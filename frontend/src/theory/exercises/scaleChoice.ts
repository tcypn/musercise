import { barEvents, type Pattern } from '../comping'
import { chordName, keyLabel, STACK, voiceProgression } from '../harmony'
import type { TimedEvent } from '../practice'
import { SCALES } from '../scales'
import { noteLabel, pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The scales to choose from, and the chord each one fits (every chord tone is in the scale). */
const CHOICES: readonly (Item & { steps: readonly Step[]; chord: string; why: string })[] = [
  { id: 'major', short: 'Major', name: 'Major scale (Ionian)', hint: 'Over maj7 chords: bright, with a major 7th', steps: SCALES.major, chord: 'maj7', why: 'it has the major 3rd and the major 7th of a maj7 chord' },
  { id: 'mixolydian', short: 'Mixolydian', name: 'Mixolydian', hint: 'Over dominant 7 chords: major with a ♭7', steps: SCALES.mixolydian, chord: '7', why: 'it has the major 3rd and the ♭7 of a dominant 7 chord' },
  { id: 'dorian', short: 'Dorian', name: 'Dorian', hint: 'Over m7 chords: minor with a bright 6th', steps: SCALES.dorian, chord: 'm7', why: 'it has the ♭3 and ♭7 of an m7 chord' },
  { id: 'locrian', short: 'Locrian', name: 'Locrian', hint: 'Over m7♭5 chords: ♭3, ♭5 and ♭7', steps: SCALES.locrian, chord: 'm7b5', why: 'it is the only one with the ♭5 of an m7♭5 chord' },
  { id: 'major-pent', short: 'Major pent.', name: 'Major pentatonic', hint: 'Over major chords: five safe notes', steps: [[0, 0], [1, 2], [2, 4], [4, 7], [5, 9]], chord: 'maj', why: 'it has the major 3rd of a major chord' },
  { id: 'minor-pent', short: 'Minor pent.', name: 'Minor pentatonic', hint: 'Over minor chords: five safe notes', steps: [[0, 0], [2, 3], [3, 5], [4, 7], [6, 10]], chord: 'min', why: 'it has the ♭3 of a minor chord' },
]
const BY_ID = new Map(CHOICES.map((c) => [c.id, c]))
const items: readonly Item[] = CHOICES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** What the scale's notes clash with: a chord tone the wrong scale does not have. */
const TONE_WORD: Record<number, string> = { 3: '♭3', 4: 'major 3rd', 6: '♭5', 7: '5th', 10: '♭7', 11: 'major 7th' }

interface Setup {
  /** The answers offered together; each question offers these. */
  choices: readonly string[]
  anyKey: boolean
  twoFiveOne: boolean
  vamp: boolean
}
const SEVENTHS = ['major', 'mixolydian', 'dorian', 'locrian']
const PENTS = ['major-pent', 'minor-pent']
const SETUP: Record<number, Setup> = {
  1: { choices: ['major', 'mixolydian'], anyKey: false, twoFiveOne: false, vamp: true },
  2: { choices: ['major', 'mixolydian', 'dorian'], anyKey: false, twoFiveOne: false, vamp: true },
  3: { choices: PENTS, anyKey: false, twoFiveOne: false, vamp: true },
  4: { choices: ['mixolydian', 'dorian'], anyKey: false, twoFiveOne: false, vamp: true },
  5: { choices: ['dorian', 'locrian', 'mixolydian'], anyKey: false, twoFiveOne: false, vamp: true },
  6: { choices: SEVENTHS, anyKey: false, twoFiveOne: false, vamp: true },
  7: { choices: SEVENTHS, anyKey: true, twoFiveOne: false, vamp: true },
  8: { choices: ['major', 'mixolydian', 'dorian'], anyKey: true, twoFiveOne: true, vamp: true },
  9: { choices: SEVENTHS, anyKey: true, twoFiveOne: false, vamp: false },
  10: { choices: [...SEVENTHS, ...PENTS], anyKey: true, twoFiveOne: false, vamp: true },
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const LEVEL_TEXT: [string, string][] = [
  ['maj7 or 7', 'Hear a chord, then choose the scale whose notes all belong to it. Cmaj7 has B, so the major scale; C7 has B♭, so Mixolydian.'],
  ['m7 and Dorian', 'Add m7 chords: Dorian has the ♭3 and ♭7 they need.'],
  ['Pentatonics', 'Five safe notes: the major pentatonic over a major chord, the minor pentatonic over a minor chord. Listen for the 3rd.'],
  ['The 3rd decides', 'C7 or Cm7: both have a ♭7, so the 3rd decides between Mixolydian and Dorian.'],
  ['Locrian', 'Add m7♭5 chords: only Locrian has their ♭5.'],
  ['All four', 'maj7, 7, m7 and m7♭5: major, Mixolydian, Dorian or Locrian.'],
  ['Any key', 'The same four, from any root.'],
  ['Inside a ii-V-I', 'A ii-V-I plays; choose the scale for the chord the question names. Dorian on ii, Mixolydian on V, major on I.'],
  ['Less help', 'The chord once, with no vamp.'],
  ['Everything', 'All six scales, any key.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: SETUP[i + 1].choices, modes: MAJ, lowRange: RANGE }))

/** ii-V-I: the chord and its scale at each place. */
const TWO_FIVE_ONE: { step: Step; scale: string; numeral: string }[] = [
  { step: [1, 2], scale: 'dorian', numeral: 'ii' },
  { step: [4, 7], scale: 'mixolydian', numeral: 'V' },
  { step: [0, 0], scale: 'major', numeral: 'I' },
]

function build(setup: Setup, answer: string, mode: Mode, tonicPc: number, rand: () => number): Question {
  const { tonic, label } = keyLabel(tonicPc, 'major')
  // The chords heard: one chord that the answer fits, or a ii-V-I whose asked chord the answer fits.
  const asked = setup.twoFiveOne ? TWO_FIVE_ONE.findIndex((t) => t.scale === answer) : 0
  const chords: { root: Note; type: string; label: string }[] = setup.twoFiveOne
    ? TWO_FIVE_ONE.map((t) => {
        const root = spellFrom(tonic, [t.step])[0]
        const type = BY_ID.get(t.scale)!.chord
        return { root, type, label: `${t.numeral} · ${chordName(root, type)}` }
      })
    : [{ root: tonic, type: BY_ID.get(answer)!.chord, label: chordName(tonic, BY_ID.get(answer)!.chord) }]
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: pitchClass(c.root), stack: STACK[c.type] })))
  const beat = 60 / 84
  const pattern: Pattern = setup.vamp ? 'pop' : 'held'
  const bars = setup.vamp && !setup.twoFiveOne ? 2 : 1
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  for (let pass = 0; pass < (setup.twoFiveOne ? 2 : bars); pass++) {
    voiced.forEach((v, i) => {
      const bar = barEvents(v, pattern, (pass * voiced.length + i) * 4 * beat, beat, rand)
      events.push(...bar)
      stepOf.push(...bar.map(() => i))
    })
  }
  const target = chords[asked]
  const scale = BY_ID.get(answer)!
  const notes = spellFrom(target.root, scale.steps).map(noteLabel).join(' ')
  const symbol = chordName(target.root, target.type)
  // Pentatonics are offered for triads, seven-note scales for 7th chords: only one choice ever fits.
  const isPent = (id: string) => id.endsWith('-pent')
  const choices = setup.choices.filter((c) => isPent(c) === isPent(answer))
  const offered = choices.filter((c) => c !== answer)
  const clash = offered
    .map((o) => {
      const missing = STACK[target.type].find((t) => !BY_ID.get(o)!.steps.some((s) => s[1] === t))
      return missing === undefined ? '' : `${BY_ID.get(o)!.short} has no ${TONE_WORD[missing] ?? 'note'} of ${symbol}`
    })
    .filter(Boolean)
  return {
    root: 48 + tonicPc, item: answer, mode, notes: [48 + tonicPc],
    events,
    stepOf,
    steps: voiced.map((v, i) => ({ label: chords[i].label, notes: [v.bass, ...v.upper] })),
    prompt: setup.twoFiveOne ? { text: `A ii-V-I in ${label}. Which scale fits chord ${asked + 1}?` } : undefined,
    choices,
    explain: `${symbol}: ${scale.name} (${notes}), because ${scale.why}.${clash.length ? ` ${clash.join('; ')}.` : ''} Try it: hold ${symbol} with your left hand and play up and down ${scale.name} from ${noteLabel(target.root)} with your right.`,
    swap: setup.twoFiveOne ? undefined : (other) => build(setup, other, mode, tonicPc, rand),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand)
}

export const scaleChoiceExercise: ExerciseDef = {
  id: 'scale-choice',
  name: 'Which scale over which chord',
  blurb: 'Hear a chord and choose the scale that fits it: every note of the chord is in the scale, so every note you play sounds right. Major over maj7, Mixolydian over 7, Dorian over m7, Locrian over m7♭5, and the pentatonics.',
  hintLabel: 'Fits:',
  question: 'Listen to the chord. Which scale fits it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'chord' },
  phrase: (item) => `the ${BY_ID.get(item.id)!.name}`,
  tip: 'Match the scale to the chord\'s 3rd and 7th: major 3rd and major 7th → major; major 3rd and ♭7 → Mixolydian; ♭3 and ♭7 → Dorian; ♭3, ♭5 and ♭7 → Locrian.',
}
