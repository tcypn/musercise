import type { Progress } from '../api/types'
import { EXERCISE_LIST } from './exercises'
import { isUnlocked } from './rules'
import type { ExerciseDef, Level } from './types'

/** An answer counts as a mistake once it has been asked this many times and is right less often than the pass mark. */
export const MIN_ASKED = 3
export const WEAK_BELOW = 0.8
export const MISTAKE_QUESTIONS = 10
const MAX_WEAK = 4
const MAX_ITEMS = 5

export interface WeakSpot {
  exercise: ExerciseDef
  /** The level the practice is played at: the highest one you have open that contains every answer below. */
  level: Level
  /** Everything offered as an answer: the weak ones and what they are mixed up with. */
  items: string[]
  /** The answers you get wrong most often, worst first. */
  weak: { item: string; asked: number; correct: number }[]
}

/** The answers of one lesson to practise, or null when nothing is weak yet. */
export function weakSpot(exercise: ExerciseDef, progress: Progress): WeakSpot | null {
  const stats = progress.exercises[exercise.id]
  if (!stats) return null
  const passed = new Set(stats.levels.filter((l) => l.passed).map((l) => l.level))
  const open = exercise.levels.filter((l) => isUnlocked(l.id, passed)).reverse() // highest first
  const weak = stats.items
    .filter((i) => i.asked >= MIN_ASKED && i.correct / i.asked < WEAK_BELOW && open.some((l) => l.items.includes(i.item)))
    .sort((a, b) => a.correct / a.asked - b.correct / b.asked || b.asked - a.asked)
    .slice(0, MAX_WEAK)
  if (weak.length === 0) return null


  // Each weak answer brings the answer it is most often mistaken for (either way round).
  const wanted: string[] = []
  const add = (id: string) => { if (!wanted.includes(id)) wanted.push(id) }
  for (const w of weak) {
    add(w.item)
    const partner = stats.confusions
      .filter((c) => c.asked === w.item || c.answered === w.item)
      .sort((a, b) => b.count - a.count)[0]
    if (partner) add(partner.asked === w.item ? partner.answered : partner.asked)
  }

  // The highest open level that has all of them; failing that, the highest that has the worst one.
  const level = open.find((l) => wanted.every((id) => l.items.includes(id))) ?? open.find((l) => l.items.includes(weak[0].item))
  if (!level) return null
  const items = wanted.filter((id) => level.items.includes(id)).slice(0, MAX_ITEMS)
  // Always something to choose between.
  for (const id of level.items) {
    if (items.length >= 2) break
    if (!items.includes(id)) items.push(id)
  }
  return { exercise, level, items, weak: weak.filter((w) => items.includes(w.item)) }
}

/** Every lesson with something to practise, the one with the most mistakes first. */
export function weakSpots(progress: Progress): WeakSpot[] {
  return EXERCISE_LIST.map((e) => weakSpot(e, progress))
    .filter((s): s is WeakSpot => s !== null)
    .sort((a, b) => b.weak.length - a.weak.length)
}
