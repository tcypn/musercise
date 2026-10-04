import { describe, expect, it } from 'vitest'
import type { Progress } from '../api/types'
import { emptyProgress } from '../store/normalise'
import { EXERCISES } from './exercises'
import { weakSpot, weakSpots } from './mistakes'

const withItems = (id: keyof Progress['exercises'], items: Progress['exercises'][typeof id]['items'], extra: Partial<Progress['exercises'][typeof id]> = {}): Progress => {
  const p = emptyProgress()
  p.exercises[id] = { ...p.exercises[id], items, ...extra }
  return p
}

describe('weak spots', () => {
  const intervals = EXERCISES.intervals

  it('is empty until an answer has been asked enough times and is wrong often enough', () => {
    expect(weakSpot(intervals, emptyProgress())).toBeNull()
    expect(weakSpot(intervals, withItems('intervals', [{ item: '7', asked: 2, correct: 0 }]))).toBeNull() // too few
    expect(weakSpot(intervals, withItems('intervals', [{ item: '7', asked: 10, correct: 9 }]))).toBeNull() // 90% is fine
    expect(weakSpot(intervals, withItems('intervals', [{ item: '7', asked: 10, correct: 7 }]))).not.toBeNull()
  })

  it('lists the worst answers first, at most four, and offers at least two answers', () => {
    const items = ['1', '2', '3', '4', '5', '6'].map((item, i) => ({ item, asked: 10, correct: i })) // 0% .. 50%
    const everyLevelOpen = Array.from({ length: 9 }, (_, i) => ({ level: i + 1, sessions: 1, best_accuracy: 0.9, passed: true }))
    const spot = weakSpot(intervals, withItems('intervals', items, { levels: everyLevelOpen }))!
    expect(spot.weak.map((w) => w.item)).toEqual(['1', '2', '3', '4'])
    expect(spot.items.length).toBeGreaterThanOrEqual(2)
    expect(spot.items.length).toBeLessThanOrEqual(5)
    const one = weakSpot(intervals, withItems('intervals', [{ item: '7', asked: 10, correct: 2 }]))!
    expect(one.items.length).toBeGreaterThanOrEqual(2)
    expect(one.items).toContain('7')
  })

  it('adds the answer it is most often mixed up with', () => {
    const spot = weakSpot(intervals, withItems('intervals', [{ item: '7', asked: 10, correct: 3 }], {
      levels: Array.from({ length: 9 }, (_, i) => ({ level: i + 1, sessions: 1, best_accuracy: 0.9, passed: true })),
      confusions: [{ asked: '7', answered: '5', count: 4 }, { asked: '7', answered: '6', count: 1 }],
    }))!
    expect(spot.items).toContain('5')
    expect(spot.items).not.toContain('6')
  })

  it('plays at a level you have open that contains every answer offered', () => {
    const items = EXERCISES.progressions.items.slice(0, 11).map((i) => ({ item: i.id, asked: 8, correct: 2 }))
    const progress = withItems('progressions', items, { levels: [{ level: 1, sessions: 1, best_accuracy: 0.9, passed: true }, { level: 2, sessions: 1, best_accuracy: 0.9, passed: true }] })
    const spot = weakSpot(EXERCISES.progressions, progress)!
    expect(spot.level.id).toBeLessThanOrEqual(3) // levels 1 and 2 passed: 3 is the highest open
    for (const id of spot.items) expect(spot.level.items).toContain(id)
    expect(spot.items.length).toBeGreaterThanOrEqual(2)
  })

  it('never offers a level that is still locked, and works for every lesson', () => {
    for (const exercise of Object.values(EXERCISES)) {
      const items = exercise.levels[0].items.map((id) => ({ item: id, asked: 10, correct: 1 }))
      const spot = weakSpot(exercise, withItems(exercise.id, items))!
      expect(spot.level.id, exercise.id).toBe(1) // nothing passed: only level 1 is open
      expect(spot.items.every((id) => spot.level.items.includes(id)), exercise.id).toBe(true)
      expect(spot.items.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('sorts lessons with the most mistakes first', () => {
    const p = withItems('intervals', [{ item: '7', asked: 10, correct: 1 }])
    p.exercises.chords = { ...p.exercises.chords, items: [{ item: 'maj', asked: 10, correct: 1 }, { item: 'min', asked: 10, correct: 2 }] }
    expect(weakSpots(p).map((s) => s.exercise.id)).toEqual(['chords', 'intervals'])
  })
})
