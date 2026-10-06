import { describe, expect, it } from 'vitest'
import type { Progress } from '../api/types'
import { emptyProgress } from '../store/normalise'
import type { ExerciseId } from './types'
import { buildPath, defaultStage, windOffset } from './path'

function withPassed(exercise: ExerciseId, passed: number[], sessions = passed.length): Progress {
  const p = emptyProgress()
  p.exercises[exercise].levels = passed.map((level) => ({ level, sessions: 1, best_accuracy: 0.9, passed: true, first_passed: '2026-09-01' }))
  p.history = sessions > 0 ? [{ id: 1, exercise, level: passed[passed.length - 1] ?? 1, ended_at: '2026-09-01T10:00:00Z', day: '2026-09-01', question_count: 20, accuracy: 0.9 }] : []
  return p
}

describe('learning path', () => {
  it('winds back and forth and repeats', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(windOffset)).toEqual([0, 56, 84, 56, 0, -56, -84, -56, 0])
  })

  it('has one stage per curriculum stage', () => {
    expect(buildPath(emptyProgress())).toHaveLength(7)
  })

  it('starts a new learner at level 1 of the first lesson, with later levels locked', () => {
    const stage = buildPath(emptyProgress())[0]
    const levels = stage.nodes.filter((n) => n.id.startsWith('note-names-'))
    expect(levels).toHaveLength(10)
    expect(levels[0].state).toBe('current')
    expect(levels[0].to).toBe('/practice/note-names/1')
    // the next lesson in the stage is open but not the one to carry on with
    expect(stage.nodes.find((n) => n.id === 'intervals-1')).toMatchObject({ state: 'open', to: '/practice/intervals/1' })
    expect(levels.slice(1).every((n) => n.state === 'locked' && n.to === undefined)).toBe(true)
    expect(stage.current).toBe(true)
  })

  it('draws a ring for the share of levels passed on the current node', () => {
    const current = buildPath(withPassed('intervals', [1, 2, 3]))[0].nodes.find((n) => n.state === 'current')!
    expect(current.ring).toBeCloseTo(0.3)
    expect(buildPath(emptyProgress())[0].nodes.find((n) => n.state === 'current')!.ring).toBe(0)
  })

  it('marks passed levels done and the next one current', () => {
    const levels = buildPath(withPassed('intervals', [1, 2, 3]))[0].nodes.filter((n) => n.id.startsWith('intervals-'))
    expect(levels.map((n) => n.state).slice(0, 5)).toEqual(['done', 'done', 'done', 'current', 'locked'])
  })

  it('leaves another lesson open but not current', () => {
    const stage3 = buildPath(emptyProgress())[2]
    const first = stage3.nodes.find((n) => n.id === 'chords-1')!
    expect(first.state).toBe('open')
    expect(first.to).toBe('/practice/chords/1')
  })

  it('carries on with the lesson practised last', () => {
    const path = buildPath(withPassed('chords', [1, 2]))
    expect(path[2].nodes.find((n) => n.state === 'current')?.id).toBe('chords-3')
    expect(path[0].nodes.some((n) => n.state === 'current')).toBe(false)
    expect(defaultStage(path)).toBe(3)
  })

  it('groups consecutive unbuilt lessons into one node', () => {
    const first = buildPath(emptyProgress())[0].nodes.find((n) => n.state === 'soon')!
    expect(first.lessons).toBe(3) // reading the staff, note values, dynamics and tempo words
    expect(first.caption).toBe('3 lessons coming soon')
    expect(first.to).toBe('/map')
  })

  it('links a single unbuilt lesson to its own page', () => {
    const stage = buildPath(emptyProgress())[0]
    const last = stage.nodes[stage.nodes.length - 1]
    expect(last).toMatchObject({ state: 'soon', caption: 'Naming a note by ear', to: '/soon/note-naming' })
  })

  it('reports ready counts per stage', () => {
    const path = buildPath(emptyProgress())
    expect(path.map((s) => s.ready)).toEqual([2, 4, 5, 4, 0, 1, 1])
    expect(path[4].nodes.every((n) => n.state === 'soon')).toBe(true) // rhythm: nothing built yet
  })

  it('opens the first stage for a new learner and when everything is finished', () => {
    expect(defaultStage(buildPath(emptyProgress()))).toBe(1)
    const all = withPassed('intervals', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const id of Object.keys(all.exercises) as ExerciseId[]) all.exercises[id].levels = all.exercises.intervals.levels
    expect(buildPath(all)[0].finished).toBe(true)
    expect(defaultStage(buildPath(all))).toBe(1)
  })

  it('gives every node a shift from the wind pattern', () => {
    buildPath(emptyProgress())[0].nodes.forEach((n, i) => expect(n.offset).toBe(windOffset(i)))
  })
})
