import { describe, expect, it } from 'vitest'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../notes'
import { eventsFor } from '../playback'
import { buildQuestions } from '../questions'
import { QUESTIONS_PER_SESSION } from '../rules'
import { DEGREE_SEMITONES } from '../harmony'
import { EXERCISE_LIST, EXERCISES, levelItems } from './index'
import { EXTENDED } from './extensions'
import { HIGHEST_MIDI as TOP } from '../notes'
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
        const sounding = [...q.notes, ...(q.lit ?? []), ...(q.prompt?.lit ?? []), ...eventsFor(exercise, q).flatMap((e) => e.notes)]
        for (const midi of sounding) {
          expect(Number.isInteger(midi)).toBe(true)
          expect(midi, `level ${level.id} ${q.item}`).toBeGreaterThanOrEqual(LOWEST_MIDI)
          expect(midi, `level ${level.id} ${q.item}`).toBeLessThanOrEqual(HIGHEST_MIDI)
        }
        expect(q.notes).toContain(q.root)
        expect(exercise.describe(q).length).toBeGreaterThan(5)
        if (exercise.kind === 'quiz') {
          expect(q.prompt?.text.length, `level ${level.id}`).toBeGreaterThan(5)
          if (q.choices) {
            expect(q.choices).toContain(q.item)
            expect(new Set(q.choices).size).toBe(q.choices.length)
            expect(q.choices.length).toBeGreaterThanOrEqual(2)
            for (const c of q.choices) expect(allowed.has(c) || level.items.includes(c), `choice ${c}`).toBe(true)
          }
        }
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

describe('keyboard map and note names', () => {
  const lesson = EXERCISES['note-names']
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]

  it('lights the key it names (name questions) and the C it numbers (octave questions)', () => {
    const rand = seeded(21)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 150, rand)) {
        const lit = q.prompt!.lit!
        expect(lit).toHaveLength(1)
        if (q.mode === 'name') expect(NAMES[lit[0] % 12]).toBe(q.item)
        if (q.mode === 'octave') expect(q.item).toBe(`C${Math.floor(lit[0] / 12) - 1}`)
      }
    }
  })

  it('answers half- and whole-step questions from a natural note, in the right direction', () => {
    const rand = seeded(22)
    for (const level of lesson.levels.filter((l) => l.modes.includes('half') || l.modes.includes('whole'))) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode !== 'half' && q.mode !== 'whole') continue
        const start = q.prompt!.lit![0] % 12
        expect(WHITE_PCS, `start of "${q.prompt!.text}"`).toContain(start)
        const size = q.mode === 'half' ? 1 : 2
        const answer = NAMES.indexOf(q.item)
        const above = q.prompt!.text.includes(' above ')
        expect(((start + (above ? size : -size)) % 12 + 12) % 12, q.prompt!.text).toBe(answer)
      }
    }
  })

  it('only asks half and whole steps that have a natural starting note', () => {
    const half = lesson.levels[6].items
    const whole = lesson.levels[7].items
    expect(half).not.toContain('D')
    expect(half).not.toContain('G')
    expect(half).not.toContain('A')
    expect(whole).not.toContain('G#')
    expect(half).toHaveLength(9)
    expect(whole).toHaveLength(11)
  })

  it('numbers the Cs the standard way: middle C is C4 (MIDI 60), the top C is C8', () => {
    const rand = seeded(23)
    const level = lesson.levels[8]
    const seen = new Map<string, number>()
    for (const q of buildQuestions(lesson, level, 200, rand)) seen.set(q.item, q.root)
    expect(seen.get('C4')).toBe(60)
    expect(seen.get('C1')).toBe(24)
    expect(seen.get('C8')).toBe(TOP)
  })

  it('gives the explanation with the answer in it', () => {
    const rand = seeded(24)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 60, rand)) {
        const short = lesson.items.find((i) => i.id === q.item)!.short
        expect(lesson.describe(q), q.prompt!.text).toContain(short)
      }
    }
  })
})

describe('major scale and key signatures', () => {
  const lesson = EXERCISES['major-scale']
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  /** Independent of the lesson: a major scale from a tonic, each letter once, with the standard steps. */
  const scale = (tonic: string): { label: string; pc: number }[] => {
    const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const
    const start = letters.indexOf(tonic[0])
    const acc = tonic.slice(1) === '♯' ? 1 : tonic.slice(1) === '♭' ? -1 : 0
    const tonicPc = (natural[tonic[0] as keyof typeof natural] + acc + 12) % 12
    return [0, 2, 4, 5, 7, 9, 11].map((step, i) => {
      const letter = letters[(start + i) % 7]
      const pc = (tonicPc + step) % 12
      const diff = ((pc - natural[letter as keyof typeof natural] + 18) % 12) - 6
      return { label: letter + (diff === 0 ? '' : diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff)), pc }
    })
  }
  const short = (id: string) => lesson.items.find((i) => i.id === id)!.short

  it('names the scale note asked for, spelled with each letter once', () => {
    const rand = seeded(31)
    let asked = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode !== 'note') continue
        const m = /the (\d)(?:st|nd|rd|th) note of (.+) major\?/.exec(q.prompt!.text)!
        expect(scale(m[2])[Number(m[1]) - 1].label, q.prompt!.text).toBe(short(q.item))
        asked++
      }
    }
    expect(asked).toBeGreaterThan(300)
  })

  it('counts the sharps or flats of the key asked about, and of the key named from a count', () => {
    const rand = seeded(32)
    const count = (tonic: string) => scale(tonic).reduce((sum, n) => sum + (n.label.includes('♯') ? 1 : n.label.includes('♭') ? -1 : 0), 0)
    const sigWords = (n: number) => (n === 0 ? 'no sharps or flats' : `${Math.abs(n)} ${n > 0 ? 'sharp' : 'flat'}${Math.abs(n) === 1 ? '' : 's'}`)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode === 'signature') {
          const tonic = /does (.+) major have/.exec(q.prompt!.text)![1]
          expect(sigWords(count(tonic)), q.prompt!.text).toBe(lesson.items.find((i) => i.id === q.item)!.name.toLowerCase())
        }
        if (q.mode === 'key') {
          const words = /Which major key has (.+)\?/.exec(q.prompt!.text)![1]
          const tonic = short(q.item).replace(' major', '')
          expect(sigWords(count(tonic)), q.prompt!.text).toBe(words)
        }
      }
    }
  })

  it('lights exactly the notes of the scale it names, tonic to octave', () => {
    const rand = seeded(33)
    let lit = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode !== 'scale') continue
        const tonic = short(q.item).replace(' major', '')
        const expected = scale(tonic).map((n) => n.pc)
        const pcs = q.prompt!.lit!.slice(0, 7).map((m) => m % 12)
        expect(pcs, q.prompt!.text).toEqual(expected)
        expect(q.prompt!.lit![7] - q.prompt!.lit![0]).toBe(12)
        lit++
      }
    }
    expect(lit).toBeGreaterThan(100)
  })

  it('asks whole and half steps on the keys that show them (C major: half steps are E-F and B-C)', () => {
    const rand = seeded(34)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode !== 'steps') continue
        const [a, b] = q.prompt!.lit!
        expect(b - a).toBe(q.item === 'half' ? 1 : 2)
        const m = /from note (\d) to note (\d)/.exec(q.prompt!.text)!
        expect(Number(m[2]) - Number(m[1])).toBe(1)
      }
    }
    // Level 1 only asks three of the steps.
    const first = new Set(buildQuestions(lesson, lesson.levels[0], 100, seeded(35)).map((q) => q.prompt!.text))
    expect(first.size).toBe(3)
  })

  it('never offers two spellings of the same key, and always includes the right answer', () => {
    const rand = seeded(36)
    const pcOf = (id: string) => {
      const m = /^n-([A-G])(#|b)?$/.exec(id)
      if (!m) return null
      return ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
    }
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (!q.choices) continue
        expect(q.choices).toContain(q.item)
        const pcs = q.choices.map(pcOf).filter((p) => p !== null).map((p) => ((p! % 12) + 12) % 12)
        expect(new Set(pcs).size, `level ${level.id}: ${q.choices.join(' ')}`).toBe(pcs.length)
      }
    }
  })

  it('has the expected answers for the early levels', () => {
    const names = (level: number) => lesson.levels[level - 1].items.map(short)
    expect(names(3)).toEqual(['C', 'D', 'E', 'F', 'F♯', 'G', 'A', 'B♭', 'B'])
    expect(names(5)).toEqual(['0', '1♯', '2♯', '1♭'])
    expect(names(6)).toHaveLength(12)
    expect(names(7)).toHaveLength(12)
  })

  it('explains the answer in words', () => {
    const rand = seeded(37)
    const q = buildQuestions(lesson, lesson.levels[5], 40, rand).find((x) => x.item === 'sig2s')!
    expect(lesson.describe(q)).toBe('D major has 2 sharps: F♯ and C♯.')
    const c = buildQuestions(lesson, lesson.levels[5], 40, rand).find((x) => x.item === 'sig0')!
    expect(lesson.describe(c)).toBe('C major has no sharps or flats: all white keys.')
  })
})
