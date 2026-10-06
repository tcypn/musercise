import type { TimedEvent } from './practice'
import type { Step } from './spelling'

/** Seven-note scales as [letters, semitones] above the home note. */
export const SCALES: Readonly<Record<string, readonly Step[]>> = {
  major: [[0, 0], [1, 2], [2, 4], [3, 5], [4, 7], [5, 9], [6, 11]],
  natural: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 10]],
  harmonic: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 11]],
  melodic: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 9], [6, 11]],
  ionian: [[0, 0], [1, 2], [2, 4], [3, 5], [4, 7], [5, 9], [6, 11]],
  dorian: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 9], [6, 10]],
  phrygian: [[0, 0], [1, 1], [2, 3], [3, 5], [4, 7], [5, 8], [6, 10]],
  lydian: [[0, 0], [1, 2], [2, 4], [3, 6], [4, 7], [5, 9], [6, 11]],
  mixolydian: [[0, 0], [1, 2], [2, 4], [3, 5], [4, 7], [5, 9], [6, 10]],
  aeolian: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 10]],
  locrian: [[0, 0], [1, 1], [2, 3], [3, 5], [4, 6], [5, 8], [6, 10]],
}

/** How a scale's number is written: ♭3, ♯4 and so on. */
export function degreeLabel([letters, semis]: Step): string {
  const plain = [0, 2, 4, 5, 7, 9, 11][letters]
  const mark = semis < plain ? '♭' : semis > plain ? '♯' : ''
  return `${mark}${letters + 1}`
}

export type Direction = 'up' | 'down' | 'updown' | 'top'

/** Which scale steps a run plays, as indexes 0 to 7 (7 is home an octave up). */
export function runOrder(direction: Direction): number[] {
  if (direction === 'up') return [0, 1, 2, 3, 4, 5, 6, 7]
  if (direction === 'down') return [7, 6, 5, 4, 3, 2, 1, 0]
  if (direction === 'top') return [4, 5, 6, 7]
  return [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0]
}

/** A run of the scale from `home` (MIDI), one note at a time, starting at `start` seconds. */
export function scaleRun(home: number, scale: readonly Step[], direction: Direction, start: number, gap: number): TimedEvent[] {
  const order = runOrder(direction)
  return order.map((i, n) => ({
    time: start + n * gap,
    hold: n === order.length - 1 ? 1.6 : gap * 0.95,
    notes: [home + (i === 7 ? 12 : scale[i][1])],
  }))
}
