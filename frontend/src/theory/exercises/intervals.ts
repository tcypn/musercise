import { intervalBySemitones, INTERVALS } from '../intervals'
import { HIGHEST_MIDI, LOWEST_MIDI, noteName } from '../notes'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const PERFECT = [5, 7, 12]
const WITH_THIRDS = [...PERFECT, 3, 4]
const WITH_SIXTHS = [...WITH_THIRDS, 8, 9]
const NO_TRITONE = [...WITH_SIXTHS, 1, 2, 10, 11]
const ALL = [...NO_TRITONE, 6]

const MID: readonly [number, number] = [48, 67] // C3–G4: the comfortable middle
const WIDE: readonly [number, number] = [36, 79]
const FULL: readonly [number, number] = [LOWEST_MIDI, HIGHEST_MIDI]

const ids = (semitones: number[]) => semitones.map(String)

const levels: readonly Level[] = [
  { id: 1, name: 'Perfect ground', blurb: 'The most stable sounds: fourth, fifth and octave.', items: ids(PERFECT), modes: ['ascending'], lowRange: MID },
  { id: 2, name: 'Thirds', blurb: 'Add the bright major third and the darker minor third.', items: ids(WITH_THIRDS), modes: ['ascending'], lowRange: MID },
  { id: 3, name: 'Sixths', blurb: 'Wide and singing: major and minor sixths join the set.', items: ids(WITH_SIXTHS), modes: ['ascending'], lowRange: MID },
  { id: 4, name: 'Seconds and sevenths', blurb: 'The tight, dissonant intervals. Everything except the tritone.', items: ids(NO_TRITONE), modes: ['ascending'], lowRange: MID },
  { id: 5, name: 'The tritone', blurb: 'All twelve intervals, going up, across a wider register.', items: ids(ALL), modes: ['ascending'], lowRange: [43, 72] },
  { id: 6, name: 'Coming down', blurb: 'The same twelve intervals, now falling.', items: ids(ALL), modes: ['descending'], lowRange: [43, 72] },
  { id: 7, name: 'Both directions', blurb: 'Rising and falling mixed together, from bass to treble.', items: ids(ALL), modes: ['ascending', 'descending'], lowRange: WIDE },
  { id: 8, name: 'Played together', blurb: 'Both notes at once. Start with the consonant intervals.', items: ids(WITH_SIXTHS), modes: ['harmonic'], lowRange: [43, 72] },
  { id: 9, name: 'Tight harmony', blurb: 'All twelve intervals sounded together.', items: ids(ALL), modes: ['harmonic'], lowRange: WIDE },
  { id: 10, name: 'All 88 keys', blurb: 'Every interval, every direction, the whole keyboard.', items: ids(ALL), modes: ['ascending', 'descending', 'harmonic'], lowRange: FULL },
]

const items: readonly Item[] = INTERVALS.map((i) => ({
  id: String(i.semitones),
  short: i.short,
  name: i.name,
  hint: i.anchor,
}))

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const semitones = Number(item.id)
  const min = Math.max(level.lowRange[0], LOWEST_MIDI)
  const max = Math.min(level.lowRange[1], HIGHEST_MIDI - semitones)
  const low = min + Math.floor(rand() * (max - min + 1))
  const high = low + semitones
  return mode === 'descending'
    ? { root: high, item: item.id, mode, notes: [high, low] }
    : { root: low, item: item.id, mode, notes: [low, high] }
}

const WORD: Record<string, string> = { ascending: 'rising', descending: 'falling', harmonic: 'together' }

export const intervalsExercise: ExerciseDef = {
  id: 'intervals',
  name: 'Intervals',
  blurb:
    'Hear two notes, name the distance between them. Ten levels take you from the fifth and octave to every interval across all 88 keys.',
  hintLabel: 'Song:',
  question: 'What interval did you hear?',
  items,
  levels,
  makeQuestion,
  playStyle: (mode) => (mode === 'harmonic' ? { gap: 0, hold: 2.4 } : { gap: 0.9, hold: 1.6 }),
  describe: (q) => {
    const interval = intervalBySemitones(Number(q.item))
    return `${noteName(q.notes[0])} to ${noteName(q.notes[1])}, ${WORD[q.mode]}, ${interval.short}.`
  },
  phrase: (item) => `the ${item.name.toLowerCase()}`,
  modeLabel: { ascending: 'up', descending: 'down', harmonic: 'together', block: 'together', arpeggio: 'broken' },
}
