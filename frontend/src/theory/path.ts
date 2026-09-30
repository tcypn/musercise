import type { Progress } from '../api/types'
import { STAGES, type Stage } from './curriculum'
import { EXERCISES } from './exercises'
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
}

export interface PathStage {
  stage: Stage
  nodes: PathNode[]
  /** Lessons in this stage that can be practised, out of all. */
  ready: number
  total: number
  /** This stage holds the level to carry on with. */
  current: boolean
  /** Every playable level in the stage is passed. */
  finished: boolean
}

/** The sideways shift of the nth node: a gentle S-curve that repeats. */
const WIND = [0, 56, 84, 56, 0, -56, -84, -56] as const
export const windOffset = (index: number): number => WIND[index % WIND.length]

export function buildPath(progress: Progress): PathStage[] {
  const map = summariseMap(progress)
  const hereExercise = map.stages.flatMap((s) => s.statuses).find((s) => s.concept.id === map.here)?.concept.exerciseId

  return STAGES.map((stage) => {
    const nodes: Omit<PathNode, 'offset'>[] = []
    let ready = 0
    for (const concept of stage.concepts) {
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
          nodes.push({ id: concept.id, caption: concept.name, name: `${concept.name}, coming soon`, state: 'soon', to: `/soon/${concept.id}`, lessons: 1 })
        }
        continue
      }
      ready++
      const passed = new Set(progress.exercises[exercise.id].levels.filter((l) => l.passed).map((l) => l.level))
      const carryOn = exercise.levels.find((l) => !passed.has(l.id))
      for (const level of exercise.levels) {
        const done = passed.has(level.id)
        const open = isUnlocked(level.id, passed)
        const state: NodeState = done ? 'done' : !open ? 'locked' : exercise.id === hereExercise && level.id === carryOn?.id ? 'current' : 'open'
        nodes.push({
          id: `${exercise.id}-${level.id}`,
          caption: level.name,
          name: `${exercise.name}, level ${level.id}: ${level.name}`,
          state,
          to: open ? `/practice/${exercise.id}/${level.id}` : undefined,
          ring: state === 'current' ? passed.size / exercise.levels.length : undefined,
        })
      }
    }
    const withOffsets = nodes.map((n, i) => ({ ...n, offset: windOffset(i) }))
    const playable = withOffsets.filter((n) => n.state !== 'soon')
    return {
      stage,
      nodes: withOffsets,
      ready,
      total: stage.concepts.length,
      current: withOffsets.some((n) => n.state === 'current'),
      finished: playable.length > 0 && playable.every((n) => n.state === 'done'),
    }
  })
}

/** The stage to show open: the one holding the current level, else the first unfinished, else the first. */
export function defaultStage(path: readonly PathStage[]): number {
  const current = path.find((s) => s.current) ?? path.find((s) => s.ready > 0 && !s.finished) ?? path[0]
  return current.stage.id
}
