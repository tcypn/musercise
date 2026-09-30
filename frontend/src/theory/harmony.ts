import type { TimedEvent } from './practice'

/** Whether a question sets up a major or a minor key. */
export type KeyMode = 'major' | 'minor'

/** How much of the key is sounded before a question: the full I-IV-V-I, or just the home chord. */
export type Help = 'full' | 'light'

/** Semitones above the tonic of each scale degree. Spelled with b and # so the same ids work in major and minor. */
export const DEGREE_SEMITONES: Readonly<Record<string, number>> = {
  '1': 0,
  '2': 2,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  b6: 8,
  '6': 9,
  b7: 10,
  '7': 11,
}

const chord = (time: number, hold: number, notes: number[]): TimedEvent => ({ time, hold, notes })

/**
 * The home key, played as chords a pianist would use: I - IV - V - I, each chord turned over so the
 * hands barely move (C E G, C F A, B D G, C E G in C). In minor the third is lowered and IV is minor
 * (C E♭ G, C F A♭, B D G, C E♭ G). `light` plays only the home chord.
 * `tonic` is the MIDI note of the lowest tonic in the chords. Returns the events and when they end.
 */
export function keyContext(tonic: number, mode: KeyMode, help: Help): { events: TimedEvent[]; end: number } {
  const third = mode === 'major' ? 4 : 3
  const sixth = mode === 'major' ? 9 : 8
  if (help === 'light') return { events: [chord(0, 1.6, [tonic, tonic + third, tonic + 7])], end: 1.6 }
  const step = 0.75
  const events = [
    chord(0, 0.9, [tonic, tonic + third, tonic + 7]),
    chord(step, 0.9, [tonic, tonic + 5, tonic + sixth]),
    chord(step * 2, 0.9, [tonic - 1, tonic + 2, tonic + 7]),
    chord(step * 3, 1.6, [tonic, tonic + third, tonic + 7]),
  ]
  return { events, end: step * 3 + 1.6 }
}
