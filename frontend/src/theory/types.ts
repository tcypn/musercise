import type { TimedEvent } from './practice'

export type ExerciseId = 'intervals' | 'chords' | 'scale-degrees' | 'extensions' | 'note-names' | 'major-scale' | 'chord-function' | 'diatonic-chords' | 'progressions' | 'chord-spelling' | 'pentatonic' | 'cadences' | 'slash-chords' | 'chord-tones' | 'two-five-one' | 'by-ear' | 'minor-scales' | 'modes' | 'comping' | 'voice-leading' | 'left-hand' | 'bass-lines' | 'lead-sheets' | 'transposition' | 'modulation' | 'borrowed-chords' | 'nashville' | 'circle-of-fifths'

/** How a question is played or set up. Intervals use the first three, chords the next two, scale degrees the key (major or minor). */
export type Mode =
  | 'ascending' | 'descending' | 'harmonic' // intervals
  | 'block' | 'arpeggio' // chords
  | 'major' | 'minor' // scale degrees: the key
  | 'name' | 'half' | 'whole' | 'octave' // note names: the kind of question
  | 'steps' | 'signature' | 'note' | 'key' | 'scale' // major scale: the kind of question
  | 'quality' | 'chord' | 'numeral' | 'seventh' // chords on each scale note: the kind of question
  | 'spell' | 'symbol' // chord spelling: symbol to notes, or notes to symbol

/** One thing the learner can answer with (an interval size, a chord quality...). */
export interface Item {
  id: string
  /** Big label on the answer button. */
  short: string
  name: string
  /** A memory aid: a song for an interval, a character for a chord. */
  hint: string
}

export interface Level {
  id: number
  name: string
  blurb: string
  /** Item ids that can be asked (and answered) at this level. */
  items: readonly string[]
  modes: readonly Mode[]
  /** MIDI range of the lowest note (the root, or the lower note of an interval). */
  lowRange: readonly [number, number]
  /** Chords only: may triads be turned upside down? */
  inversions?: boolean
  /** Scale degrees only: the whole I-IV-V-I before the note (default), or just the home chord. */
  help?: 'full' | 'light'
}

export interface Question {
  /** The chord root, or the note an interval starts on. It is always one of `notes`. */
  root: number
  item: string
  mode: Mode
  /** MIDI numbers, in the order they sound (lowest first for chords). */
  notes: number[]
  inversion?: number
  /** Everything that sounds, when a question is more than one run of `notes` (a key first, then a note; a chord sequence). */
  events?: TimedEvent[]
  /** When the events start with a key to listen to first: the index of the first event the learner answers about. */
  answerFrom?: number
  /** Keys to light once answered, when that differs from `notes`. The one equal to `root` lights first, the rest second. */
  lit?: number[]
  /** After the answer, the chords of a progression one by one: each lights on the keyboard as it sounds, and can be tapped to hear alone. */
  steps?: { label: string; notes: number[] }[]
  /** For each of `events`, the step it belongs to (null for the key played first). Needed when a step has several sounds. */
  stepOf?: (number | null)[]
  /** Quiz lessons: the question in words, with keys to show on the keyboard while it is asked. */
  prompt?: { text: string; lit?: number[]; chart?: string }
  /** Quiz lessons: why the answer is right, in a sentence, shown after the answer. */
  explain?: string
  /** Quiz lessons: offer only these answers (ids, always including the right one) instead of every answer of the level. */
  choices?: string[]
  /** The same question with another answer swapped in and nothing else changed (used for "hear yours"). */
  swap?: (item: string) => Question
}

/** `gap` seconds between note starts (0 = all at once); each note rings for `hold` seconds. */
export interface PlayStyle {
  gap: number
  hold: number
}

export interface ExerciseDef {
  id: ExerciseId
  name: string
  blurb: string
  /** The question put to the learner on every screen of a session. */
  question: string
  /** Lessons that play a key first: the names of the two parts on screen ("The key", "Name this chord"). */
  partLabels?: { key: string; question: string }
  /** `quiz`: read and answer, no sound (unless a question carries `events`). Default `ear`. */
  kind?: 'ear' | 'quiz'
  /** What the lit strip on the keyboard stands for in the intro: "lowest note" (default) or, for one-note questions, "note". */
  rangeWord?: string
  /** Shown before answer hints: "Song:" or "Sounds:". */
  hintLabel: string
  items: readonly Item[]
  levels: readonly Level[]
  makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question
  playStyle(mode: Mode): PlayStyle
  /** After answering: which notes were played and how they make up the answer. */
  describe(question: Question): string
  /** Used in "Not quite. That was ...". */
  phrase(item: Item): string
  /** Short word for the direction/way of playing, shown under the keyboard. */
  modeLabel: Partial<Record<Mode, string>>
}
