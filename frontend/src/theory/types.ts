export type ExerciseId = 'intervals' | 'chords'

/** How the notes of a question are played. Intervals use the first three, chords the last two. */
export type Mode = 'ascending' | 'descending' | 'harmonic' | 'block' | 'arpeggio'

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
}

export interface Question {
  /** The chord root, or the note an interval starts on. It is always one of `notes`. */
  root: number
  item: string
  mode: Mode
  /** MIDI numbers, in the order they sound (lowest first for chords). */
  notes: number[]
  inversion?: number
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
  modeLabel: Record<Mode, string>
}
