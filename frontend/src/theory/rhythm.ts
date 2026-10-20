import { chordEvent, chordName, keyLabel, STACK, voiceProgression, type VoicedChord } from './harmony'
import type { TimedEvent } from './practice'
import { spellFrom, type Step } from './spelling'

/** Shared by the rhythm lessons: a seeded random source, so "Hear yours" can rebuild a question exactly. */
export function seededRandom(seed: number): () => number {
  let x = Math.floor(seed * 2147483646) + 1
  return () => (x = (x * 48271) % 2147483647) / 2147483647
}

export const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]

/** Major-key chords: the step above the tonic and the chord type. */
const DEGREE: Record<string, [Step, string]> = {
  I: [[0, 0], 'maj'], ii: [[1, 2], 'min'], iii: [[2, 4], 'min'], IV: [[3, 5], 'maj'], V: [[4, 7], 'maj'], vi: [[5, 9], 'min'],
  I7: [[0, 0], '7'], IV7: [[3, 5], '7'], V7: [[4, 7], '7'],
  Imaj7: [[0, 0], 'maj7'], ii7: [[1, 2], 'm7'], vi7: [[5, 9], 'm7'], IVmaj7: [[3, 5], 'maj7'],
  iv: [[3, 5], 'min'], bVI: [[5, 8], 'maj'], bVII: [[6, 10], 'maj'], '#idim': [[0, 1], 'dim'],
  'VI7': [[5, 9], '7'], 'III7': [[2, 4], '7'],
}

/** The numerals this helper knows. */
export const NUMERALS = Object.keys(DEGREE)

/** Voice a list of numerals in a major key, smoothly, with the chord names for labels. */
export function voiceNumerals(tonicPc: number, numerals: readonly string[]): { voiced: VoicedChord[]; names: string[] } {
  const { tonic } = keyLabel(tonicPc, 'major')
  const voiced = voiceProgression(numerals.map((n) => ({ rootPc: (tonicPc + DEGREE[n][0][1]) % 12, stack: STACK[DEGREE[n][1]] })))
  const names = numerals.map((n) => chordName(spellFrom(tonic, [DEGREE[n][0]])[0], DEGREE[n][1]))
  return { voiced, names }
}

/** A steady pulse: the tonic low in the bass on each beat, so the learner can count along. */
export const pulse = (tonicPc: number, t: number, beats: number, beat: number): TimedEvent[] =>
  Array.from({ length: beats }, (_, i) => chordEvent(t + i * beat, beat * 0.45, [36 + tonicPc]))
