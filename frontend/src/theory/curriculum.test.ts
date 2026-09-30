import { describe, expect, it } from 'vitest'
import { emptyProgress } from '../store/merge'
import { ALL_CONCEPTS, getConcept, STAGES, SUGGESTED_ROUTE } from './curriculum'
import { EXERCISES } from './exercises'
import { conceptStatus, summariseMap } from './mapProgress'

describe('curriculum map', () => {
  it('has unique ids and only refers to concepts that exist', () => {
    const ids = ALL_CONCEPTS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of ALL_CONCEPTS) for (const b of c.before ?? []) expect(getConcept(b), `${c.id} -> ${b}`).toBeDefined()
    for (const id of SUGGESTED_ROUTE) expect(getConcept(id), id).toBeDefined()
  })

  it('never lists a concept as needing itself first', () => {
    for (const c of ALL_CONCEPTS) expect(c.before ?? []).not.toContain(c.id)
  })

  it('has seven stages with every concept explained', () => {
    expect(STAGES.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
    for (const c of ALL_CONCEPTS) {
      expect(c.blurb.length, c.id).toBeGreaterThan(20)
      expect(c.why.length, c.id).toBeGreaterThan(20)
    }
  })

  it('links a built exercise to exactly one concept, and every registered lesson is on the map', () => {
    const built = ALL_CONCEPTS.filter((c) => c.exerciseId)
    expect(built.map((c) => c.exerciseId).sort()).toEqual(Object.keys(EXERCISES).sort())
    for (const c of built) expect(EXERCISES[c.exerciseId!]).toBeDefined()
  })
})

describe('map progress', () => {
  it('starts with every built lesson open, nothing mastered, and points at intervals', () => {
    const map = summariseMap(emptyProgress())
    expect(map.openCount).toBe(Object.keys(EXERCISES).length)
    expect(map.masteredCount).toBe(0)
    expect(map.percent).toBe(0)
    expect(map.here).toBe('intervals')
    expect(map.conceptCount).toBe(ALL_CONCEPTS.length)
  })

  it('marks a concept in progress, then mastered, and reports partial progress', () => {
    const progress = emptyProgress()
    progress.exercises.chords.levels = [
      { level: 1, sessions: 2, best_accuracy: 0.9, passed: true },
      { level: 2, sessions: 1, best_accuracy: 0.5, passed: false },
    ]
    progress.history = [{ id: 1, exercise: 'chords', level: 2, ended_at: '2026-09-30T10:00:00Z', question_count: 20, accuracy: 0.5 }]
    const chords = getConcept('chord-quality')!
    expect(conceptStatus(chords, progress)).toMatchObject({ state: 'progress', passed: 1, total: 10 })
    const map = summariseMap(progress)
    expect(map.here).toBe('chord-quality') // continue where you practised last
    expect(map.percent).toBeCloseTo(0.1 / ALL_CONCEPTS.length)

    progress.exercises.chords.levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, sessions: 1, best_accuracy: 1, passed: true }))
    expect(conceptStatus(chords, progress).state).toBe('mastered')
    expect(summariseMap(progress).here).toBe('intervals') // chords finished: fall back to the first unfinished
    expect(summariseMap(progress).masteredCount).toBe(1)
  })

  it('marks unbuilt concepts as coming soon', () => {
    expect(conceptStatus(getConcept('progressions')!, emptyProgress())).toMatchObject({ state: 'soon', total: 0 })
  })

  it('has no continue target once everything that is built is mastered', () => {
    const progress = emptyProgress()
    for (const id of Object.keys(EXERCISES) as (keyof typeof EXERCISES)[]) {
      progress.exercises[id].levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, sessions: 1, best_accuracy: 1, passed: true }))
    }
    expect(summariseMap(progress).here).toBeNull()
  })
})
