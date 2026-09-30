import { describe, expect, it } from 'vitest'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../notes'
import { eventsFor } from '../playback'
import { buildQuestions } from '../questions'
import { QUESTIONS_PER_SESSION } from '../rules'
import { DEGREE_SEMITONES } from '../harmony'
import { EXERCISE_LIST, EXERCISES, levelItems } from './index'
import { EXTENDED } from './extensions'
import { chordById } from './chords'

/** A seeded random number generator, so a failing case can be replayed. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe.each(EXERCISE_LIST.map((e) => [e.id, e] as const))('lesson %s', (_id, exercise) => {
  it('has ten levels, numbered 1 to 10, with unique answers', () => {
    expect(exercise.levels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const ids = exercise.items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    const shorts = exercise.items.map((i) => i.short)
    expect(new Set(shorts).size).toBe(shorts.length)
  })

  it('only uses answers that exist, and uses every answer somewhere', () => {
    const known = new Set(exercise.items.map((i) => i.id))
    const used = new Set<string>()
    for (const level of exercise.levels) {
      expect(level.items.length).toBeGreaterThanOrEqual(2)
      for (const id of level.items) {
        expect(known.has(id), `${id} in level ${level.id}`).toBe(true)
        used.add(id)
      }
    }
    expect([...known].filter((id) => !used.has(id))).toEqual([])
  })

  it('keeps answers short enough for the server (letters, digits, # b / + . _ -, 24 at most)', () => {
    for (const item of exercise.items) expect(item.id).toMatch(/^[A-Za-z0-9#b/+._-]{1,24}$/)
    for (const level of exercise.levels) for (const mode of level.modes) expect(mode).toMatch(/^[a-z0-9-]{1,24}$/)
  })

  it('asks only what the level allows, keeps every sound on the piano, and can describe the answer', () => {
    const rand = seeded(7)
    for (const level of exercise.levels) {
      const allowed = new Set(levelItems(exercise, level).map((i) => i.id))
      for (const q of buildQuestions(exercise, level, 120, rand)) {
        expect(allowed.has(q.item), `level ${level.id} asked ${q.item}`).toBe(true)
        expect(level.modes).toContain(q.mode)
        const sounding = [...q.notes, ...(q.lit ?? []), ...eventsFor(exercise, q).flatMap((e) => e.notes)]
        for (const midi of sounding) {
          expect(Number.isInteger(midi)).toBe(true)
          expect(midi, `level ${level.id} ${q.item}`).toBeGreaterThanOrEqual(LOWEST_MIDI)
          expect(midi, `level ${level.id} ${q.item}`).toBeLessThanOrEqual(HIGHEST_MIDI)
        }
        expect(q.notes).toContain(q.root)
        expect(exercise.describe(q).length).toBeGreaterThan(5)
        const events = eventsFor(exercise, q)
        expect(events.length).toBeGreaterThan(0)
        expect(eventsFor(exercise, q, true).length).toBe(events.length)
      }
    }
  })

  it('builds a fair session: every answer of a level shows up', () => {
    const rand = seeded(11)
    for (const level of exercise.levels) {
      const asked = new Set(buildQuestions(exercise, level, QUESTIONS_PER_SESSION * 3, rand).map((q) => q.item))
      expect(asked.size).toBe(level.items.length)
    }
  })
})

describe('scale degrees', () => {
  const lesson = EXERCISES['scale-degrees']

  it('plays the note that the answer says, measured from the home note of the key it sets up', () => {
    const rand = seeded(3)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        const events = q.events!
        const home = Math.min(...events[0].notes) // the lowest note of the first chord is the home note
        const target = events[events.length - 1].notes[0]
        expect(target).toBe(q.root)
        expect(((target - home) % 12 + 12) % 12, `level ${level.id} item ${q.item}`).toBe(DEGREE_SEMITONES[q.item])
        // the lit home note is the same pitch class as the key
        expect(((q.lit![1] - home) % 12 + 12) % 12).toBe(0)
      }
    }
  })

  it('sets up a major or minor key by the third of the home chord', () => {
    const rand = seeded(5)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 100, rand)) {
        const chord = q.events![0].notes
        expect(chord[1] - chord[0]).toBe(q.mode === 'major' ? 4 : 3)
        expect(chord[2] - chord[0]).toBe(7)
      }
    }
  })

  it('plays the full cadence before the note unless the level gives less help', () => {
    const rand = seeded(9)
    for (const level of lesson.levels) {
      const q = buildQuestions(lesson, level, 1, rand)[0]
      expect(q.events!.length).toBe(level.help === 'light' ? 2 : 5)
      // the note comes after every chord has finished
      const target = q.events![q.events!.length - 1]
      for (const chord of q.events!.slice(0, -1)) expect(target.time).toBeGreaterThan(chord.time + chord.hold - 0.01)
    }
  })

  it('names the note in the key, spelled correctly', () => {
    const at = (item: string, mode: 'major' | 'minor', tonicPc: number) => {
      const tonic = 48 + tonicPc
      return lesson.describe({ root: 60 + ((tonicPc + DEGREE_SEMITONES[item]) % 12), item, mode, notes: [60], events: [{ time: 0, hold: 1, notes: [tonic, tonic + 4, tonic + 7] }] })
    }
    expect(at('3', 'major', 7)).toBe('In G major: the note was B, the 3rd.')
    expect(at('b3', 'minor', 4)).toBe('In E minor: the note was G, the flat 3rd.')
    expect(at('7', 'major', 6)).toBe('In F♯ major: the note was E♯, the 7th.')
    expect(at('#4', 'major', 1)).toBe('In D♭ major: the note was G, the sharp 4th.')
    expect(at('1', 'major', 0)).toBe('In C major: the note was C, the home note.')
  })
})

describe('9ths, 6ths and added notes', () => {
  const lesson = EXERCISES.extensions
  const stackOf = (id: string) => EXTENDED.find((c) => c.id === id)?.stack ?? chordById(id).stack

  it('plays the chord it names, in root position, as root plus the stack', () => {
    const rand = seeded(2)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 120, rand)) {
        expect(q.notes.map((n) => n - q.notes[0])).toEqual([...stackOf(q.item)])
        expect(q.root).toBe(q.notes[0])
      }
    }
  })

  it('defines each added-note chord by the usual recipe', () => {
    const recipe: Record<string, number[]> = {
      '6': [0, 4, 7, 9],
      m6: [0, 3, 7, 9],
      add9: [0, 4, 7, 14],
      maj9: [0, 4, 7, 11, 14],
      dom9: [0, 4, 7, 10, 14],
      m9: [0, 3, 7, 10, 14],
      m11: [0, 3, 7, 10, 14, 17],
      dom13: [0, 4, 7, 10, 14, 21],
    }
    expect(Object.fromEntries(EXTENDED.map((c) => [c.id, [...c.stack]]))).toEqual(recipe)
  })

  it('never asks two chords that are the same notes from the same root at one level', () => {
    for (const level of lesson.levels) {
      const stacks = level.items.map((id) => stackOf(id).join(','))
      expect(new Set(stacks).size, `level ${level.id}`).toBe(stacks.length)
    }
  })
})
