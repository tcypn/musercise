import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyProgress } from '../store/normalise'
import { getConcept } from './curriculum'
import { activeGoal, GOALS, goalProgress, setActiveGoal, subscribeGoal } from './goals'
import { buildPath } from './path'

const fakeStorage = () => {
  const data: Record<string, string> = {}
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), removeItem: (k: string) => void delete data[k] }
}

describe('goals', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists real map lessons, each once per goal', () => {
    expect(GOALS.length).toBe(4)
    for (const g of GOALS) {
      expect(new Set(g.lessons).size, g.id).toBe(g.lessons.length)
      for (const id of g.lessons) expect(getConcept(id), `${g.id}: ${id}`).toBeDefined()
    }
  })

  it('counts lessons done and finds the next one to work on, skipping coming-soon lessons', () => {
    const p = emptyProgress()
    const improvise = GOALS.find((g) => g.id === 'improvise')!
    p.exercises['scale-degrees'].levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, sessions: 1, best_accuracy: 0.9, passed: true }))
    p.exercises.pentatonic.levels = [{ level: 1, sessions: 1, best_accuracy: 0.9, passed: true }]
    const prog = goalProgress(improvise, p)
    expect(prog.done).toBe(1)
    expect(prog.lessons[0]).toMatchObject({ state: 'done', passed: 10 })
    expect(prog.lessons[1]).toMatchObject({ state: 'started', passed: 1 })
    expect(prog.next?.conceptId).toBe('pentatonic')
    expect(prog.lessons.filter((l) => l.state === 'soon').map((l) => l.conceptId)).toEqual([])
    expect(prog.ready).toBe(9)
  })

  it('remembers the goal on this device, tells everything showing it, and copes with blocked storage', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    expect(activeGoal()).toBeUndefined()
    const heard = vi.fn()
    const stop = subscribeGoal(heard)
    setActiveGoal('by-ear')
    expect(activeGoal()?.id).toBe('by-ear')
    expect(heard).toHaveBeenCalledTimes(1)
    stop()
    setActiveGoal(null)
    expect(heard).toHaveBeenCalledTimes(1)
    expect(activeGoal()).toBeUndefined()
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(() => setActiveGoal('improvise')).not.toThrow()
    expect(activeGoal()).toBeUndefined()
  })

  it('filters the path to the goal: only its lessons, no empty stages, and START on its next lesson', () => {
    const goal = GOALS.find((g) => g.id === 'chord-sheet')!
    const path = buildPath(emptyProgress(), goal)
    const lessonIds = new Set(path.flatMap((s) => s.nodes.map((n) => n.id.replace(/-\d+$/, ''))))
    for (const s of path) {
      expect(s.nodes.length).toBeGreaterThan(0)
      expect(s.total).toBe(s.stage.concepts.filter((c) => goal.lessons.includes(c.id)).length)
    }
    // every node belongs to a goal lesson
    for (const id of lessonIds) expect(goal.lessons.map((c) => getConcept(c)!.exerciseId ?? c)).toContain(id)
    const current = path.flatMap((s) => s.nodes).filter((n) => n.state === 'current')
    expect(current.map((n) => n.id)).toEqual(['chord-spelling-1'])
    // without a goal, every stage is there
    expect(buildPath(emptyProgress())).toHaveLength(7)
  })
})
