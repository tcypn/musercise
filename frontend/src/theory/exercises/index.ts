import type { ExerciseDef, ExerciseId, Item, Level } from '../types'
import { chordsExercise } from './chords'
import { intervalsExercise } from './intervals'

export const EXERCISES: Record<ExerciseId, ExerciseDef> = {
  intervals: intervalsExercise,
  chords: chordsExercise,
}

export const EXERCISE_LIST: readonly ExerciseDef[] = [intervalsExercise, chordsExercise]

export function getExercise(id: string | undefined): ExerciseDef | undefined {
  return EXERCISE_LIST.find((e) => e.id === id)
}

export function getLevel(exercise: ExerciseDef, id: number): Level | undefined {
  return exercise.levels.find((l) => l.id === id)
}

/** The level's answer choices, in the exercise's own order. */
export function levelItems(exercise: ExerciseDef, level: Level): Item[] {
  return exercise.items.filter((item) => level.items.includes(item.id))
}

export function getItem(exercise: ExerciseDef, id: string): Item {
  const found = exercise.items.find((item) => item.id === id)
  if (!found) throw new Error(`${exercise.id} has no item ${id}`)
  return found
}

/** The level to practise next: the first one not passed yet (all earlier ones are passed), else the last. */
export function nextLevel(exercise: ExerciseDef, passed: ReadonlySet<number>): Level {
  return exercise.levels.find((l) => !passed.has(l.id)) ?? exercise.levels[exercise.levels.length - 1]
}
