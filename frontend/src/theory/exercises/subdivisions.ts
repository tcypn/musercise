import { chordEvent, keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, pulse, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const perBeat = (fractions: number[]) => [0, 1, 2, 3].flatMap((b) => fractions.map((f) => b + f))

/** How a bar of four beats is split: where the notes fall, in beats from the start of the bar. */
const RHYTHMS: readonly (Item & { at: number[]; count: string; how: string })[] = [
  { id: 'quarter', short: 'Quarters', name: 'Quarter notes', hint: 'One note on every beat', at: perBeat([0]), count: '1 2 3 4', how: 'one note on every beat, with the pulse: quarter notes.' },
  { id: 'eighths', short: 'Eighths', name: 'Eighth notes', hint: 'Two even notes per beat: 1 & 2 &', at: perBeat([0, 0.5]), count: '1 & 2 & 3 & 4 &', how: 'two even notes on every beat (1 & 2 &): eighth notes.' },
  { id: 'triplets', short: 'Triplets', name: 'Triplets', hint: 'Three even notes per beat: 1 trip-let', at: perBeat([0, 1 / 3, 2 / 3]), count: '1 trip let 2 trip let…', how: 'three even notes on every beat (1 trip-let): triplets. They roll, where eighths march.' },
  { id: 'sixteenths', short: 'Sixteenths', name: 'Sixteenth notes', hint: 'Four quick notes per beat: 1 e & a', at: perBeat([0, 0.25, 0.5, 0.75]), count: '1 e & a 2 e & a…', how: 'four quick notes on every beat (1 e & a): sixteenth notes.' },
  { id: 'offbeat', short: 'Off-beats', name: 'Off-beats only', hint: 'Between the beats: & & & &', at: perBeat([0.5]), count: '& & & &', how: 'notes only between the beats, on each "&", never with the pulse: off-beats, the simplest syncopation (reggae and ska chords).' },
  { id: 'dotted', short: 'Pop push', name: 'The pop push (3 + 3 + 2)', hint: 'On 1, the & of 2, and 4', at: [0, 1.5, 3], count: '1 . . & . . 4 .', how: 'three notes in the bar, on 1, the "&" of 2, and 4: eighths grouped 3 + 3 + 2. The middle note comes early, across the beat: the push in countless pop and Latin songs.' },
]
const BY_ID = new Map(RHYTHMS.map((r) => [r.id, r]))
const items: readonly Item[] = RHYTHMS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  texture: 'note' | 'chord' | 'either'
  /** Keep the pulse going under the rhythm (false: only the count-in). */
  pulse: boolean
  tempo: 'steady' | 'any'
}
const S = (anyKey: boolean, texture: Setup['texture'], withPulse: boolean, tempo: Setup['tempo']): Setup => ({ anyKey, texture, pulse: withPulse, tempo })
const SETUP: Record<number, Setup> = {
  1: S(false, 'note', true, 'steady'), 2: S(false, 'note', true, 'steady'), 3: S(false, 'note', true, 'steady'),
  4: S(false, 'note', true, 'steady'), 5: S(false, 'note', true, 'steady'), 6: S(false, 'note', true, 'steady'),
  7: S(true, 'note', true, 'steady'), 8: S(true, 'chord', true, 'steady'), 9: S(true, 'note', false, 'steady'),
  10: S(true, 'either', true, 'any'),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = RHYTHMS.map((r) => r.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Quarters or eighths', 'A low note counts four beats, then a high note plays a rhythm over it. One note per beat, or two?', ['quarter', 'eighths']],
  ['Triplets', 'Add triplets: three even notes per beat, 1 trip-let.', ['quarter', 'eighths', 'triplets']],
  ['Sixteenths', 'Two, three or four notes per beat: count along with the low note.', ['eighths', 'triplets', 'sixteenths']],
  ['Off the beat', 'Add off-beats: notes only between the beats, on "&".', ['quarter', 'eighths', 'offbeat']],
  ['The pop push', 'Add 3 + 3 + 2: on 1, the "&" of 2, and 4. The middle note comes early.', ['eighths', 'offbeat', 'dotted']],
  ['All six', 'Every rhythm.', ALL],
  ['Any key', 'Every rhythm, in any key.', ALL],
  ['As chords', 'The rhythm is played with chords, the way you would comp it.', ALL],
  ['Less help', 'The pulse counts you in, then stops: keep counting in your head.', ALL],
  ['Everything', 'Every rhythm, any key and tempo, notes or chords.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 48] as const }))

/** The count of a note at `at` beats: the beat number, or the beat with e, &, a, trip or let ("2 &"). */
export function syllable(at: number): string {
  const beat = Math.floor(at + 1e-6)
  const f = at - beat
  if (f < 0.01) return String(beat + 1)
  const names: [number, string][] = [[0.25, 'e'], [1 / 3, 'trip'], [0.5, '&'], [2 / 3, 'let'], [0.75, 'a']]
  return `${beat + 1} ${names.find(([x]) => Math.abs(x - f) < 0.01)![1]}`
}

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const rhythm = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const beat = setup.tempo === 'any' ? pick([0.55, 0.62, 0.7], rand) : 0.65
  const texture = setup.texture === 'either' ? pick(['note', 'chord'] as const, rand) : setup.texture
  const { voiced } = voiceNumerals(tonicPc, ['I'])
  const sound = texture === 'chord' ? voiced[0].upper : [72 + tonicPc]
  // The count-in: one bar of the pulse alone.
  const events: TimedEvent[] = pulse(tonicPc, 0, 4, beat)
  const stepOf: (number | null)[] = events.map(() => null)
  const answerFrom = events.length
  for (let pass = 0; pass < 2; pass++) {
    const t = (pass + 1) * 4 * beat
    const evs: { e: TimedEvent; step: number | null }[] = setup.pulse ? pulse(tonicPc, t, 4, beat).map((e) => ({ e, step: null })) : []
    rhythm.at.forEach((at, i) => {
      const next = rhythm.at[i + 1] ?? 4
      evs.push({ e: chordEvent(t + at * beat, Math.min(next - at, 1) * beat * 0.85, sound), step: i })
    })
    evs.sort((a, b) => a.e.time - b.e.time)
    events.push(...evs.map((x) => x.e))
    stepOf.push(...evs.map((x) => x.step))
  }
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, answerFrom, stepOf,
    steps: rhythm.at.map((at) => ({ label: syllable(at), notes: sound })),
    explain: `${rhythm.name} (${label}): ${rhythm.how} Count it: ${rhythm.count}. Try it: tap the beat with your left hand on a low ${label.split(' ')[0]} and play this rhythm on a chord with your right.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const subdivisionsExercise: ExerciseDef = {
  noYourTurn: true,
  id: 'subdivisions',
  name: 'Subdivisions and syncopation',
  blurb: 'A low note keeps the beat; a rhythm plays over it. Name how the beat is split: quarters, eighths, triplets, sixteenths, off-beats or the 3 + 3 + 2 pop push. Counting like this is how you copy a song\'s rhythm.',
  hintLabel: 'Count:',
  question: 'Count along with the low note. How is the beat split?',
  partLabels: { key: 'The beat', question: 'The rhythm' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'rhythm' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
  tip: 'Count out loud with the beat: "1 & 2 &" for eighths, "1 trip-let" for triplets, "1 e & a" for sixteenths. Whichever count fits the notes exactly is the answer. Syncopation is a note on "&" with nothing on the beat.',
}
