import type { Question } from './types'

/** "Your turn": the notes to play after answering, the ones the answer keyboard shows (the chosen step, if any). */
export function yourTurnTarget(question: Question, step: number): number[] {
  if (question.steps?.length) return question.steps[Math.min(step, question.steps.length - 1)].notes
  return question.lit ?? question.notes
}

const pcs = (midis: readonly number[]) => [...new Set(midis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b).join(',')

/** Right when the same note names are held: any octave, order or doubling. */
export const matchesTarget = (midis: readonly number[], target: readonly number[]): boolean => midis.length > 0 && pcs(midis) === pcs(target)
