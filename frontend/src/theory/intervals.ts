export interface Interval {
  semitones: number
  short: string
  name: string
  /** A well-known tune that starts with this interval going up. */
  anchor: string
}

export const INTERVALS: readonly Interval[] = [
  { semitones: 1, short: 'm2', name: 'Minor 2nd', anchor: 'Jaws theme' },
  { semitones: 2, short: 'M2', name: 'Major 2nd', anchor: 'Happy Birthday' },
  { semitones: 3, short: 'm3', name: 'Minor 3rd', anchor: 'Greensleeves' },
  { semitones: 4, short: 'M3', name: 'Major 3rd', anchor: 'When the Saints Go Marching In' },
  { semitones: 5, short: 'P4', name: 'Perfect 4th', anchor: 'Here Comes the Bride' },
  { semitones: 6, short: 'TT', name: 'Tritone', anchor: 'The Simpsons theme' },
  { semitones: 7, short: 'P5', name: 'Perfect 5th', anchor: 'Star Wars main theme' },
  { semitones: 8, short: 'm6', name: 'Minor 6th', anchor: 'The Entertainer' },
  { semitones: 9, short: 'M6', name: 'Major 6th', anchor: 'My Bonnie Lies Over the Ocean' },
  { semitones: 10, short: 'm7', name: 'Minor 7th', anchor: 'Somewhere (West Side Story)' },
  { semitones: 11, short: 'M7', name: 'Major 7th', anchor: 'Take On Me (chorus)' },
  { semitones: 12, short: 'P8', name: 'Octave', anchor: 'Somewhere Over the Rainbow' },
]

const BY_SEMITONES = new Map(INTERVALS.map((i) => [i.semitones, i]))

export function intervalBySemitones(semitones: number): Interval {
  const found = BY_SEMITONES.get(semitones)
  if (!found) throw new Error(`No interval with ${semitones} semitones`)
  return found
}
