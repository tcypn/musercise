import type { VoicedChord } from './harmony'
import type { TimedEvent } from './practice'

/**
 * Ways to play one bar of a chord on the piano. The first five are the song textures of the "finding the chords
 * by ear" lesson; then the accompaniment patterns of the comping lesson; the `lh-` ones are left-hand patterns
 * under a held right-hand chord.
 */
export type Pattern =
  | 'held' | 'bass' | 'broken' | 'pop' | 'melody'
  | 'block' | 'basic' | 'push' | 'ballad' | 'arpeggio' | 'rnb' | 'gospel' | 'waltz'
  | 'lh-root' | 'lh-root-5th' | 'lh-octave' | 'lh-broken' | 'lh-alberti' | 'lh-stride' | 'lh-walk'

export const beatsPerBar = (pattern: Pattern): number => (pattern === 'waltz' ? 3 : 4)

const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

/** The events of one bar starting at `t` seconds. `rand` chooses melody notes (only the `melody` texture uses it). */
export function barEvents(v: VoicedChord, pattern: Pattern, t: number, beat: number, rand: () => number): TimedEvent[] {
  const upper = v.upper
  const bass = v.bass
  const fifth = bass + 7
  const ev = (time: number, hold: number, notes: number[]) => ({ time: t + time * beat, hold: hold * beat, notes })
  switch (pattern) {
    case 'held':
      return [ev(0, 3.8, [bass, ...upper])]
    case 'bass':
      return [ev(0, 3.8, [bass]), ev(1, 2.8, upper)]
    case 'broken': {
      const order = [0, 1, 2, 1, 0, 1, 2].map((i) => upper[Math.min(i, upper.length - 1)])
      return [ev(0, 3.8, [bass]), ...order.map((m, i) => ev(0.5 + i * 0.5, 0.75, [m]))]
    }
    case 'pop':
    case 'melody': {
      const comp = [ev(0, 1.9, [bass]), ev(2, 1.9, [bass]), ev(0, 1.2, upper), ev(1.5, 0.8, upper), ev(2.5, 1.2, upper)]
      if (pattern === 'pop') return comp
      // A tune of chord tones above the right hand, on beats 1 and 3.
      const top = Math.max(...upper) + 1
      const tones = upper.map((m) => atOrAbove(top, m % 12)).sort((a, b) => a - b)
      return [...comp, ev(0, 1.8, [tones[Math.floor(rand() * tones.length)]]), ev(2, 1.8, [tones[Math.floor(rand() * tones.length)]])]
    }
    case 'block': {
      // The whole chord in both hands on every beat: the left hand plays it close above the bass note.
      const left = [bass, ...upper.map((m) => atOrAbove(bass + 1, m % 12))].sort((a, b) => a - b)
      return [0, 1, 2, 3].map((b) => ev(b, 0.9, [...new Set([...left, ...upper])]))
    }
    case 'basic':
      return [ev(0, 1.9, [bass]), ev(2, 1.9, [fifth]), ...[0, 1, 2, 3].map((b) => ev(b, 0.9, upper))]
    case 'push':
      return [ev(0, 1.9, [bass]), ev(2, 1.9, [bass]), ev(0, 1.4, upper), ev(1.5, 1.4, upper), ev(3, 0.9, upper)]
    case 'ballad':
      return [ev(0, 3.9, upper), ...[bass, fifth, bass + 12, fifth, bass, fifth, bass + 12, fifth].map((m, i) => ev(i * 0.5, 0.5, [m]))]
    case 'arpeggio': {
      const [a, b, c] = [...upper].sort((x, y) => x - y)
      return [ev(0, 3.9, [bass]), ...[a, b, c ?? b, b].map((m, i) => ev(0.5 + i, 0.9, [m]))]
    }
    case 'rnb':
      return [ev(0, 1.4, [bass]), ev(3, 0.9, [bass]), ev(0, 0.6, upper), ev(1.5, 0.6, upper), ev(2.5, 0.6, upper)]
    case 'gospel':
      return [ev(0, 1.9, [bass, bass + 12]), ev(2, 1.9, [bass, bass + 12]), ...[0, 1, 2, 3].map((b) => ev(b, 0.9, upper))]
    case 'waltz':
      return [ev(0, 0.95, [bass]), ev(1, 0.9, upper), ev(2, 0.9, upper)]
  }
  // Left-hand patterns: the right hand holds the chord for the whole bar.
  const third = atOrAbove(bass + 1, upper.map((m) => m % 12).find((pc) => [3, 4].includes((pc - bass + 120) % 12))!)
  const held = ev(0, 3.9, upper)
  const quarters = (notes: number[]) => notes.map((m, i) => ev(i, 0.95, [m]))
  switch (pattern) {
    case 'lh-root':
      return [held, ev(0, 3.9, [bass])]
    case 'lh-root-5th':
      return [held, ev(0, 1.9, [bass]), ev(2, 1.9, [fifth])]
    case 'lh-octave':
      return [held, ev(0, 1.9, [bass, bass + 12]), ev(2, 1.9, [bass, bass + 12])]
    case 'lh-broken':
      return [held, ...quarters([bass, fifth, bass + 12, fifth])]
    case 'lh-alberti':
      return [held, ...[bass, fifth, third, fifth, bass, fifth, third, fifth].map((m, i) => ev(i * 0.5, 0.5, [m]))]
    case 'lh-stride': {
      const chord = [third, fifth, bass + 12].sort((x, y) => x - y)
      return [held, ev(0, 0.95, [bass]), ev(1, 0.95, chord), ev(2, 0.95, [bass]), ev(3, 0.95, chord)]
    }
    case 'lh-walk':
      // 1, 2, 3, 5: the 2 is a passing note between the root and the 3rd.
      return [held, ...quarters([bass, bass + 2, third, fifth])]
  }
  return []
}
