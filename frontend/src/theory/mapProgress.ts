import type { Progress } from '../api/types'
import { ALL_CONCEPTS, STAGES, type Concept, type Stage } from './curriculum'
import { EXERCISES } from './exercises'

export type ConceptState = 'soon' | 'ready' | 'progress' | 'mastered'

export interface ConceptStatus {
  concept: Concept
  state: ConceptState
  passed: number
  total: number
}

export function conceptStatus(concept: Concept, progress: Progress): ConceptStatus {
  if (!concept.exerciseId) return { concept, state: 'soon', passed: 0, total: 0 }
  const total = EXERCISES[concept.exerciseId].levels.length
  const stats = progress.exercises[concept.exerciseId]
  const passed = stats.levels.filter((l) => l.passed).length
  const started = stats.levels.length > 0
  const state: ConceptState = passed >= total ? 'mastered' : started ? 'progress' : 'ready'
  return { concept, state, passed, total }
}

export interface StageSummary {
  stage: Stage
  statuses: ConceptStatus[]
  open: number
  mastered: number
}

export interface MapSummary {
  stages: StageSummary[]
  conceptCount: number
  openCount: number
  masteredCount: number
  /** Share of the whole map completed (unbuilt concepts count as zero). */
  percent: number
  /** The concept to continue with, or null when every open concept is mastered. */
  here: string | null
}

export function summariseMap(progress: Progress): MapSummary {
  const stages = STAGES.map((stage) => {
    const statuses = stage.concepts.map((c) => conceptStatus(c, progress))
    return {
      stage,
      statuses,
      open: statuses.filter((s) => s.state !== 'soon').length,
      mastered: statuses.filter((s) => s.state === 'mastered').length,
    }
  })
  const all = stages.flatMap((s) => s.statuses)
  const completed = all.reduce((sum, s) => sum + (s.total ? s.passed / s.total : 0), 0)

  // Continue where you practised last, unless that concept is finished.
  const last = progress.history[0]?.exercise
  const lastConcept = last ? all.find((s) => s.concept.exerciseId === last) : undefined
  const firstUnfinished = all.find((s) => s.state === 'ready' || s.state === 'progress')
  const here = lastConcept && lastConcept.state !== 'mastered' ? lastConcept : firstUnfinished

  return {
    stages,
    conceptCount: ALL_CONCEPTS.length,
    openCount: all.filter((s) => s.state !== 'soon').length,
    masteredCount: all.filter((s) => s.state === 'mastered').length,
    percent: ALL_CONCEPTS.length ? completed / ALL_CONCEPTS.length : 0,
    here: here?.concept.id ?? null,
  }
}
