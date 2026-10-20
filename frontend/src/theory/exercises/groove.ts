import { chordEvent, keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The feels: where the notes fall inside each beat (0 is the beat). Swing's late note is set per level. */
const FEELS: readonly (Item & { inBeat: (swing: number) => number[]; word: string; how: string })[] = [
  { id: 'straight', short: 'Straight', name: 'Straight eighths', hint: 'Even: 1 & 2 &, as in pop and rock', inBeat: () => [0, 0.5], word: 'even', how: 'the two notes of each beat are even (1 & 2 &): straight eighths, the feel of most pop and rock.' },
  { id: 'swing', short: 'Swing', name: 'Swing', hint: 'Long-short, long-short: jazz and blues', inBeat: (late) => [0, late], word: 'long-short', how: 'the two notes of each beat are long-short, as if the middle note of a triplet were left out: swing, the feel of jazz, blues and shuffles.' },
  { id: 'triplet', short: '12/8 feel', name: '12/8 triplet feel', hint: 'Three per beat: a slow soul ballad', inBeat: () => [0, 1 / 3, 2 / 3], word: 'in threes', how: 'every beat is split in three even notes: the 12/8 triplet feel of slow soul, gospel and doo-wop ballads.' },
]
const BY_ID = new Map(FEELS.map((f) => [f.id, f]))
const items: readonly Item[] = FEELS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  /** Chords on every note, or a chord on the beat and a single note between. */
  full: boolean | 'either'
  /** Seconds per beat, or a choice of them. */
  beats: readonly number[]
  /** Where swing's second note falls in the beat: 2/3 is a full triplet swing, 0.6 a lighter one. */
  swing: readonly number[]
}
const S = (anyKey: boolean, full: Setup['full'], beats: number[], swing: number[] = [2 / 3]): Setup => ({ anyKey, full, beats, swing })
const SETUP: Record<number, Setup> = {
  1: S(false, false, [0.72]), 2: S(false, true, [0.72]), 3: S(false, false, [0.66]),
  4: S(false, false, [0.66]), 5: S(false, true, [0.62]), 6: S(true, 'either', [0.62]),
  7: S(true, 'either', [0.45, 0.5]), 8: S(true, 'either', [0.85, 0.95]), 9: S(true, 'either', [0.6], [0.6]),
  10: S(true, 'either', [0.45, 0.6, 0.85], [0.6, 2 / 3]),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = FEELS.map((f) => f.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Straight or swing', 'The bass plays every beat; listen to the notes between. Even (1 & 2 &) is straight; long-short is swing.', ['straight', 'swing']],
  ['With chords', 'The same two feels, played as chords.', ['straight', 'swing']],
  ['12/8 feel', 'Add the 12/8 feel: three even notes per beat, like a slow soul ballad.', ALL],
  ['Swing or 12/8', 'The closest pair: swing is a triplet with the middle note left out.', ['swing', 'triplet']],
  ['Chords on every note', 'All three feels, with a chord on every note.', ALL],
  ['Any key', 'All three, in any key.', ALL],
  ['Faster', 'At a quicker tempo, where swing gets harder to hear.', ALL],
  ['Slower', 'At a slow tempo, where the beat feels long.', ALL],
  ['Light swing', 'A lighter swing, closer to straight, as in a lot of R&B and hip-hop.', ALL],
  ['Everything', 'Any feel, tempo, key and swing.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 48] as const }))

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const feel = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const beat = pick(setup.beats, rand)
  const late = pick(setup.swing, rand)
  const full = setup.full === 'either' ? rand() < 0.5 : setup.full
  const numerals = pick([['I', 'IV'], ['I', 'vi'], ['I', 'V']], rand)
  const { voiced, names } = voiceNumerals(tonicPc, numerals)
  const inBeat = feel.inBeat(late)
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  const steps: { label: string; notes: number[] }[] = []
  // Two bars of each chord: I I IV IV, say.
  ;[0, 0, 1, 1].forEach((c, bar) => {
    const v = voiced[c]
    const top = Math.max(...v.upper)
    const evs: TimedEvent[] = []
    for (let b = 0; b < 4; b++) {
      const t = (bar * 4 + b) * beat
      // The bass walks root, fifth on every beat, so the beat is always there.
      evs.push(chordEvent(t, beat * 0.9, [b % 2 === 0 ? v.bass : v.bass + 7]))
      inBeat.forEach((f, i) => {
        const next = inBeat[i + 1] ?? 1
        evs.push(chordEvent(t + f * beat, (next - f) * beat * 0.9, f === 0 || full ? v.upper : [top]))
      })
    }
    events.push(...evs)
    stepOf.push(...evs.map(() => bar))
    steps.push({ label: `bar ${bar + 1} · ${names[c]} · ${feel.word}`, notes: [...new Set(evs.flatMap((e) => e.notes))] })
  })
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `${feel.name} in ${label}: ${feel.how} Try it: play ${names[0]} with your right hand ${feel.word === 'even' ? 'on "1 & 2 &", evenly' : feel.word === 'long-short' ? 'long-short, saying "doo-ba doo-ba"' : 'three times per beat, saying "1 trip-let"'} while your left hand plays the beat.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const grooveExercise: ExerciseDef = {
  id: 'groove',
  name: 'Swing and groove feel',
  blurb: 'Hear a groove and name its feel: straight eighths (even), swing (long-short) or the 12/8 triplet feel (three per beat). The same chords played in a different feel make a different song.',
  hintLabel: 'Feels like:',
  question: 'Listen between the beats. Which feel is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'feel' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
  tip: 'Say it along: "1 & 2 &" fits straight, "doo-ba doo-ba" (long-short) fits swing, "1 trip-let" fits the 12/8 feel. Before you comp a song, find its feel: the same pattern sounds wrong in the wrong feel.',
}
