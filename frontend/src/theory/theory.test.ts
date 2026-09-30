import { describe, expect, it } from 'vitest'
import { INTERVALS } from './intervals'
import { HIGHEST_MIDI, LOWEST_MIDI, isBlackKey, noteName } from './notes'
import { buildQuestions } from './questions'
import { INTERVAL_LEVELS, isPassing, isUnlocked, levelIntervals } from './roadmap'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('notes', () => {
  it('names the ends of the piano and middle C', () => {
    expect(noteName(LOWEST_MIDI)).toBe('A0')
    expect(noteName(HIGHEST_MIDI)).toBe('C8')
    expect(noteName(60)).toBe('C4')
  })
  it('has 52 white and 36 black keys', () => {
    let black = 0
    for (let m = LOWEST_MIDI; m <= HIGHEST_MIDI; m++) if (isBlackKey(m)) black++
    expect(black).toBe(36)
    expect(HIGHEST_MIDI - LOWEST_MIDI + 1 - black).toBe(52)
  })
})

describe('roadmap', () => {
  it('has strictly growing or equal difficulty ids 1..N', () => {
    expect(INTERVAL_LEVELS.map((l) => l.id)).toEqual(INTERVAL_LEVELS.map((_, i) => i + 1))
  })
  it('only uses known intervals', () => {
    const known = new Set(INTERVALS.map((i) => i.semitones))
    for (const level of INTERVAL_LEVELS) {
      for (const s of level.semitones) expect(known.has(s)).toBe(true)
      expect(levelIntervals(level).length).toBe(new Set(level.semitones).size)
    }
  })
  it('passes at 80% over 20 questions, not before', () => {
    expect(isPassing(20, 16)).toBe(true)
    expect(isPassing(20, 15)).toBe(false)
    expect(isPassing(10, 10)).toBe(false)
  })
  it('unlocks a level only after the previous one is passed', () => {
    expect(isUnlocked(1, new Set())).toBe(true)
    expect(isUnlocked(2, new Set())).toBe(false)
    expect(isUnlocked(2, new Set([1]))).toBe(true)
    expect(isUnlocked(3, new Set([1]))).toBe(false)
  })
})

describe('buildQuestions', () => {
  for (const level of INTERVAL_LEVELS) {
    it(`level ${level.id}: stays on the piano, in range, with correct interval math`, () => {
      const qs = buildQuestions(level, 400, seeded(level.id))
      for (const q of qs) {
        const [a, b] = q.notes
        expect(Math.abs(a - b)).toBe(q.semitones)
        expect(Math.min(a, b)).toBeGreaterThanOrEqual(Math.max(level.lowRange[0], LOWEST_MIDI))
        expect(Math.max(a, b)).toBeLessThanOrEqual(HIGHEST_MIDI)
        expect(level.semitones).toContain(q.semitones)
        expect(level.modes).toContain(q.mode)
        expect(q.root).toBe(a)
        if (q.mode === 'descending') expect(a).toBeGreaterThan(b)
        else expect(a).toBeLessThan(b)
      }
    })
    it(`level ${level.id}: balanced, no immediate repeats`, () => {
      const qs = buildQuestions(level, 240, seeded(99))
      const counts = new Map<number, number>()
      qs.forEach((q, i) => {
        counts.set(q.semitones, (counts.get(q.semitones) ?? 0) + 1)
        if (i > 0 && level.semitones.length > 1) expect(q.semitones).not.toBe(qs[i - 1].semitones)
      })
      const values = [...counts.values()]
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
    })
  }
  it('level 10 reaches both extremes of the keyboard eventually', () => {
    const level = INTERVAL_LEVELS[9]
    const notes = buildQuestions(level, 4000, seeded(7)).flatMap((q) => q.notes)
    expect(Math.min(...notes)).toBeLessThan(30)
    expect(Math.max(...notes)).toBeGreaterThan(100)
  })
})
