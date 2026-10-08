import type { Progress } from '../api/types'
import { getConcept, STAGES, type Stage } from './curriculum'
import { EXERCISES } from './exercises'
import { goalProgress, type Goal } from './goals'
import { summariseMap } from './mapProgress'
import { isUnlocked } from './rules'

/**
 * done: passed. current: the level to carry on with. open: playable, but not the one to carry on with.
 * locked: a level whose earlier level is not passed yet. soon: a lesson that is not built.
 */
export type NodeState = 'done' | 'current' | 'open' | 'locked' | 'soon'

export interface PathNode {
  id: string
  /** Short caption under the node. */
  caption: string
  /** Full accessible name, without the state. */
  name: string
  state: NodeState
  /** Where it goes; locked nodes have no destination. */
  to?: string
  /** Sideways shift in px from the middle of the path, so the path winds. */
  offset: number
  /** How many lessons a "soon" node stands for (consecutive unbuilt lessons are grouped). */
  lessons?: number
  /** The current node only: share of this lesson's levels already passed (0 to 1), drawn as a ring. */
  ring?: number
  /** A lesson's last level: drawn as a badge with the lesson's number in the stage. */
  badge?: number
}

/** One lesson of a stage (a "unit"): its levels as nodes, or a group of lessons coming soon. */
export interface PathLesson {
  id: string
  name: string
  /** 1, 2, 3… for lessons that can be practised; none for a coming-soon group. */
  number?: number
  nodes: PathNode[]
}

export interface PathStage {
  stage: Stage
  nodes: PathNode[]
  /** The same nodes, lesson by lesson; each lesson's path winds from the middle. */
  lessons: PathLesson[]
  /** Lessons in this stage that can be practised, out of all. */
  ready: number
  total: number
  /** This stage holds the level to carry on with. */
  current: boolean
  /** Every playable level in the stage is passed. */
  finished: boolean
  /** Levels passed, out of all levels of the stage's lessons that can be practised. */
  levelsPassed: number
  levelsTotal: number
}

/** The sideways shift of the nth node: a gentle S-curve that repeats. */
const WIND = [0, 56, 84, 56, 0, -56, -84, -56] as const
export const windOffset = (index: number): number => WIND[index % WIND.length]

/**
 * The lesson path. With a goal, only the goal's lessons are shown (stages without any are left out), and the level to
 * carry on with is in the goal's next lesson.
 */
export function buildPath(progress: Progress, goal?: Goal): PathStage[] {
  const map = summariseMap(progress)
  const goalNext = goal ? goalProgress(goal, progress).next : undefined
  const hereId = goal ? goalNext?.conceptId : map.here
  const hereExercise = hereId ? getConcept(hereId)?.exerciseId : undefined

  const stages = STAGES.map((stage) => ({ stage, concepts: goal ? stage.concepts.filter((c) => goal.lessons.includes(c.id)) : stage.concepts }))
  return stages.filter((s) => s.concepts.length > 0).map(({ stage, concepts }) => {
    const nodes: Omit<PathNode, 'offset'>[] = []
    const groups: { id: string; name: string; number?: number; nodes: Omit<PathNode, 'offset'>[] }[] = []
    let ready = 0
    for (const concept of concepts) {
      const exercise = concept.exerciseId ? EXERCISES[concept.exerciseId] : undefined
      if (!exercise) {
        const last = nodes[nodes.length - 1]
        if (last?.state === 'soon') {
          // Consecutive unbuilt lessons share one node, so the path is not a wall of locks.
          last.lessons = (last.lessons ?? 1) + 1
          last.caption = `${last.lessons} lessons coming soon`
          last.name = `${last.lessons} lessons coming soon`
          last.to = '/map'
        } else {
          const soon: Omit<PathNode, 'offset'> = { id: concept.id, caption: concept.name, name: `${concept.name}, coming soon`, state: 'soon', to: `/soon/${concept.id}`, lessons: 1 }
          nodes.push(soon)
          groups.push({ id: concept.id, name: 'Coming soon', nodes: [soon] })
        }
        continue
      }
      ready++
      const group: (typeof groups)[number] = { id: exercise.id, name: exercise.name, number: ready, nodes: [] }
      groups.push(group)
      const passed = new Set(progress.exercises[exercise.id].levels.filter((l) => l.passed).map((l) => l.level))
      const carryOn = exercise.levels.find((l) => !passed.has(l.id))
      for (const level of exercise.levels) {
        const done = passed.has(level.id)
        const open = isUnlocked(level.id, passed)
        const state: NodeState = done ? 'done' : !open ? 'locked' : exercise.id === hereExercise && level.id === carryOn?.id ? 'current' : 'open'
        const last = level.id === exercise.levels[exercise.levels.length - 1].id
        const node: Omit<PathNode, 'offset'> = {
          id: `${exercise.id}-${level.id}`,
          caption: level.name,
          name: `${exercise.name}, level ${level.id}: ${level.name}`,
          state,
          to: open ? `/practice/${exercise.id}/${level.id}` : undefined,
          ring: state === 'current' ? passed.size / exercise.levels.length : undefined,
          ...(last ? { badge: ready } : {}),
        }
        nodes.push(node)
        group.nodes.push(node)
      }
    }
    // Each lesson's path starts in the middle and winds from there.
    const offsetOf = new Map<Omit<PathNode, 'offset'>, number>()
    groups.forEach((g) => g.nodes.forEach((n, i) => offsetOf.set(n, windOffset(i))))
    const withOffset = (n: Omit<PathNode, 'offset'>): PathNode => ({ ...n, offset: offsetOf.get(n) ?? 0 })
    const withOffsets = nodes.map(withOffset)
    const lessons: PathLesson[] = groups.map((g) => ({ id: g.id, name: g.name, number: g.number, nodes: g.nodes.map(withOffset) }))
    const playable = withOffsets.filter((n) => n.state !== 'soon')
    return {
      stage,
      nodes: withOffsets,
      lessons,
      ready,
      total: concepts.length,
      current: withOffsets.some((n) => n.state === 'current'),
      finished: playable.length > 0 && playable.every((n) => n.state === 'done'),
      levelsPassed: playable.filter((n) => n.state === 'done').length,
      levelsTotal: playable.length,
    }
  })
}

/** The stage to show open: the one holding the current level, else the first unfinished, else the first. */
export function defaultStage(path: readonly PathStage[]): number {
  const current = path.find((s) => s.current) ?? path.find((s) => s.ready > 0 && !s.finished) ?? path[0]
  return current.stage.id
}
