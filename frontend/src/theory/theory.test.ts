import { describe, expect, it } from 'vitest'
import { chordById, CHORDS, stackDescription, voicing } from './exercises/chords'
import { EXERCISE_LIST, getExercise, levelItems } from './exercises'
import { INTERVALS } from './intervals'
import { article, HIGHEST_MIDI, isBlackKey, LOWEST_MIDI, noteName } from './notes'
import { buildQuestions } from './questions'
import { isPassing, isUnlocked } from './rules'

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
  it('picks a or an', () => {
    expect(article('augmented')).toBe('an')
    expect(article('major')).toBe('a')
  })
})

describe('rules', () => {
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

describe('every exercise', () => {
  for (const exercise of EXERCISE_LIST) {
    describe(exercise.id, () => {
      it('has ten levels numbered 1..N with valid items and modes', () => {
        expect(exercise.levels.map((l) => l.id)).toEqual(exercise.levels.map((_, i) => i + 1))
        const known = new Set(exercise.items.map((i) => i.id))
        for (const level of exercise.levels) {
          expect(level.items.length).toBeGreaterThan(0)
          for (const id of level.items) expect(known.has(id)).toBe(true)
          expect(levelItems(exercise, level).length).toBe(new Set(level.items).size)
          expect(level.modes.length).toBeGreaterThan(0)
        }
      })

      for (const level of exercise.levels) {
        it(`level ${level.id}: stays on the piano and in the level's rules`, () => {
          const qs = buildQuestions(exercise, level, 400, seeded(level.id))
          for (const q of qs) {
            expect(level.items).toContain(q.item)
            expect(level.modes).toContain(q.mode)
            expect(q.notes).toContain(q.root)
            for (const n of q.notes) {
              expect(n).toBeGreaterThanOrEqual(LOWEST_MIDI)
              expect(n).toBeLessThanOrEqual(HIGHEST_MIDI)
            }
            expect(Math.min(...q.notes)).toBeGreaterThanOrEqual(Math.max(level.lowRange[0], LOWEST_MIDI))
          }
        })
        it(`level ${level.id}: balanced, and no immediate repeats when there are 3+ answers`, () => {
          const qs = buildQuestions(exercise, level, 240, seeded(99))
          const counts = new Map<string, number>()
          qs.forEach((q, i) => {
            counts.set(q.item, (counts.get(q.item) ?? 0) + 1)
            if (i > 0 && level.items.length >= 3) expect(q.item).not.toBe(qs[i - 1].item)
          })
          const values = [...counts.values()]
          expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(level.items.length >= 3 ? 1 : 2)
        })
      }

      it('describes and phrases every item without throwing', () => {
        for (const level of exercise.levels) {
          for (const q of buildQuestions(exercise, level, 20, seeded(3))) {
            expect(exercise.describe(q).length).toBeGreaterThan(5)
            expect(exercise.playStyle(q.mode).hold).toBeGreaterThan(0)
          }
        }
        for (const item of exercise.items) expect(exercise.phrase(item).length).toBeGreaterThan(3)
      })
    })
  }

  it('is not predictable on two-answer levels (no strict A-B-A-B order)', () => {
    const chords = getExercise('chords')!
    const level = chords.levels[0] // major or minor
    for (const seed of [1, 2, 3, 4, 5]) {
      const qs = buildQuestions(chords, level, 20, seeded(seed))
      const repeats = qs.filter((q, i) => i > 0 && q.item === qs[i - 1].item).length
      expect(repeats, `seed ${seed}`).toBeGreaterThan(0)
      const first = qs.filter((q) => q.item === 'maj').length
      expect(first).toBeGreaterThanOrEqual(8) // still close to half and half
      expect(first).toBeLessThanOrEqual(12)
    }
  })

  it('looks exercises up by id', () => {
    expect(getExercise('chords')?.name).toBe('Chord quality')
    expect(getExercise('scales')).toBeUndefined()
  })
})

describe('intervals', () => {
  const exercise = getExercise('intervals')!
  it('has the interval math right, in both directions', () => {
    for (const level of exercise.levels) {
      for (const q of buildQuestions(exercise, level, 300, seeded(5))) {
        const [a, b] = q.notes
        expect(Math.abs(a - b)).toBe(Number(q.item))
        expect(q.root).toBe(a)
        if (q.mode === 'descending') expect(a).toBeGreaterThan(b)
        else expect(a).toBeLessThan(b)
      }
    }
  })
  it('knows all twelve intervals', () => {
    expect(INTERVALS.map((i) => i.semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('level 10 reaches both extremes of the keyboard eventually', () => {
    const notes = buildQuestions(exercise, exercise.levels[9], 4000, seeded(7)).flatMap((q) => q.notes)
    expect(Math.min(...notes)).toBeLessThan(30)
    expect(Math.max(...notes)).toBeGreaterThan(100)
  })
})

describe('chords', () => {
  const exercise = getExercise('chords')!
  const semitones = (id: string) => chordById(id).stack

  it('builds every chord from the right stack of semitones', () => {
    const expected: Record<string, number[]> = {
      maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7],
      maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10], hdim7: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
    }
    expect(CHORDS.length).toBe(Object.keys(expected).length)
    for (const [id, stack] of Object.entries(expected)) expect([...semitones(id)]).toEqual(stack)
  })

  it('describes chords by their stacked intervals', () => {
    expect(stackDescription(chordById('maj'))).toBe('major 3rd + minor 3rd')
    expect(stackDescription(chordById('min'))).toBe('minor 3rd + major 3rd')
    expect(stackDescription(chordById('dom7'))).toBe('major 3rd + minor 3rd + minor 3rd')
    expect(stackDescription(chordById('sus4'))).toBe('perfect 4th + major 2nd')
  })

  it('voices inversions by lifting the lowest notes an octave', () => {
    expect(voicing(chordById('maj'), 0)).toEqual([0, 4, 7])
    expect(voicing(chordById('maj'), 1)).toEqual([4, 7, 12])
    expect(voicing(chordById('maj'), 2)).toEqual([7, 12, 16])
  })

  it('every generated chord has exactly its pitch classes, with the right note on the bottom', () => {
    for (const level of exercise.levels) {
      for (const q of buildQuestions(exercise, level, 500, seeded(11 + level.id))) {
        const chord = chordById(q.item)
        const inversion = q.inversion ?? 0
        expect(q.notes.length).toBe(chord.stack.length)
        expect([...q.notes]).toEqual([...q.notes].sort((a, b) => a - b))
        const classes = new Set(q.notes.map((n) => (((n - q.root) % 12) + 12) % 12))
        expect(classes).toEqual(new Set(chord.stack.map((s) => s % 12)))
        // the sounding bottom note is the chord tone at position `inversion`
        expect((q.notes[0] - q.root + 1200 - chord.stack[inversion]) % 12).toBe(0)
      }
    }
  })

  it('only turns the four triads upside down, and only on levels that allow it', () => {
    const invertible = new Set(['maj', 'min', 'dim', 'aug'])
    const seen = new Set<number>()
    for (const level of exercise.levels) {
      for (const q of buildQuestions(exercise, level, 600, seeded(21 + level.id))) {
        const inversion = q.inversion ?? 0
        if (inversion > 0) {
          expect(level.inversions).toBe(true)
          expect(invertible.has(q.item)).toBe(true)
          seen.add(inversion)
        }
        if (!level.inversions) expect(inversion).toBe(0)
      }
    }
    expect(seen).toEqual(new Set([1, 2])) // both first and second inversions do occur
  })

  it('shows major and minor before anything else, then tension, and saves sevenths for later', () => {
    expect(exercise.levels[0].items).toEqual(['maj', 'min'])
    expect(exercise.levels[1].items).toContain('dim')
    expect(exercise.levels[2].items).toContain('aug')
    expect(exercise.levels[3].modes).toEqual(['arpeggio'])
    expect(exercise.levels[5].items).toContain('sus4')
    expect(exercise.levels[6].items).toEqual(['maj7', 'dom7', 'min7'])
  })

  it('level 10 reaches both extremes of the keyboard eventually', () => {
    const notes = buildQuestions(exercise, exercise.levels[9], 4000, seeded(9)).flatMap((q) => q.notes)
    expect(Math.min(...notes)).toBeLessThan(30)
    expect(Math.max(...notes)).toBeGreaterThan(100)
  })
})
