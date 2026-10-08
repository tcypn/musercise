import { describe, expect, it } from 'vitest'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../notes'
import { eventsFor, stepFor } from '../playback'
import { buildQuestions, sameSetting } from '../questions'
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

  it.skipIf(exercise.kind === 'quiz')('can play any other answer of the level in the same key as a question', () => {
    const rand = seeded(91)
    for (const level of exercise.levels) {
      const others = level.items
      if (others.length < 2) continue
      for (const q of buildQuestions(exercise, level, 12, rand)) {
        for (const id of others.filter((x) => x !== q.item)) {
          const alt = sameSetting(exercise, level, q, id, rand)
          expect(alt, `${exercise.id} level ${level.id}: ${q.item} -> ${id}`).not.toBeNull()
          expect(alt!.item).toBe(id)
          const home = (x: typeof q) => (x.answerFrom !== undefined && x.events ? Math.min(...x.events[0].notes) % 12 : x.root)
          expect(home(alt!) % 12).toBe(home(q) % 12)
        }
      }
    }
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

  it.skipIf(exercise.kind === 'quiz')('lights the keyboard with what is sounding: every sound belongs to a step, every step sounds', () => {
    const rand = seeded(17)
    for (const level of exercise.levels) {
      for (const q of buildQuestions(exercise, level, 30, rand)) {
        if (!q.steps || !q.events) continue
        if (q.stepOf) expect(q.stepOf.length, `${exercise.id} level ${level.id}`).toBe(q.events.length)
        const reached = new Set<number>()
        let matching = 0, mapped = 0
        q.events.forEach((e, i) => {
          const s = stepFor(q, 'all', i)
          if (s === null) return
          expect(s).toBeGreaterThanOrEqual(0)
          expect(s).toBeLessThan(q.steps!.length)
          reached.add(s)
          mapped++
          const pcs = new Set(q.steps![s].notes.map((m) => m % 12))
          if (e.notes.every((m) => pcs.has(m % 12))) matching++
        })
        expect(reached.size, `${exercise.id} level ${level.id}`).toBe(q.steps.length)
        // passing notes are the only sounds outside their step
        expect(matching / mapped, `${exercise.id} level ${level.id}`).toBeGreaterThanOrEqual(0.7)
      }
    }
  })

  it('builds a fair session: every answer of a level shows up', () => {
    const rand = seeded(11)
    for (const level of exercise.levels) {
      const draws = QUESTIONS_PER_SESSION * 3
      const asked = new Set(buildQuestions(exercise, level, draws, rand).map((q) => q.item))
      // a level with more answers than draws can only show as many different ones as there are draws
      expect(asked.size).toBe(Math.min(level.items.length, draws))
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

describe('chord function', () => {
  const lesson = EXERCISES['chord-function']
  // Written out here, not taken from the lesson: which chord on which step of the key does which job.
  const MAJOR = { 0: ['tonic', 'maj'], 2: ['sub', 'min'], 4: ['tonic', 'min'], 5: ['sub', 'maj'], 7: ['dom', 'maj'], 9: ['tonic', 'min'], 11: ['dom', 'dim'] } as const
  const MINOR = { 0: ['tonic', 'min'], 5: ['sub', 'min'], 7: ['dom', 'maj'], 8: ['tonic', 'maj'] } as const
  const QUALITY: Record<string, string> = { '0,4,7': 'maj', '0,3,7': 'min', '0,3,6': 'dim', '0,4,7,11': 'maj', '0,3,7,10': 'min', '0,4,7,10': 'maj', '0,3,6,10': 'dim' }

  it('plays a chord whose job in the key is the answer', () => {
    const rand = seeded(41)
    let seen = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        const home = Math.min(...q.events![0].notes)
        const chord = q.events![q.events!.length - 1].notes
        const step = (((chord[0] - home) % 12) + 12) % 12
        const table: Record<number, readonly string[]> = q.mode === 'minor' ? MINOR : MAJOR
        const entry = table[step]
        expect(entry, `level ${level.id}: chord on step ${step}`).toBeDefined()
        expect(entry[0], `level ${level.id} step ${step}`).toBe(q.item)
        const stack = chord.map((n) => n - chord[0]).join(',')
        expect(QUALITY[stack], `level ${level.id} stack ${stack}`).toBe(entry[1])
        // sevenths only where the level allows them
        if (level.id <= 5 || level.id === 7 || level.id === 8) expect(chord).toHaveLength(3)
        if (level.id === 6) expect(chord).toHaveLength(4)
        seen++
      }
    }
    expect(seen).toBeGreaterThan(1500)
  })

  it('sets up the key first, with the whole cadence or just the home chord as the level says', () => {
    const rand = seeded(42)
    for (const level of lesson.levels) {
      const q = buildQuestions(lesson, level, 1, rand)[0]
      expect(q.events!.length).toBe(level.help === 'light' ? 2 : 5)
      const last = q.events![q.events!.length - 1]
      for (const e of q.events!.slice(0, -1)) expect(last.time).toBeGreaterThan(e.time + e.hold - 0.01)
    }
  })

  it('asks every job at every level, and only the jobs that level can produce', () => {
    const jobs = lesson.levels.map((l) => l.items.join(','))
    expect(jobs[0]).toBe('tonic,dom')
    expect(jobs[1]).toBe('tonic,sub,dom')
    expect(jobs[7]).toBe('tonic,sub,dom')
  })

  it('explains the job, and names the tritone in dominant chords with the notes that move', () => {
    const find = (id: number, predicate: (q: ReturnType<typeof buildQuestions>[number]) => boolean) =>
      buildQuestions(lesson, lesson.levels[id - 1], 400, seeded(43 + id)).find(predicate)!
    // V7 in C major is G7: B and F, leaning to C and E.
    const v7 = find(6, (q) => q.events![q.events!.length - 1].notes.length === 4 && q.item === 'dom' && lesson.describe(q).startsWith('G7 is the V chord in C major'))
    expect(lesson.describe(v7)).toContain('a tension (dominant function) chord')
    expect(lesson.describe(v7)).toContain('Its B and F form a tritone')
    expect(lesson.describe(v7)).toContain('B up to C, F down to E')
    const home = find(1, (q) => lesson.describe(q).startsWith('C is the I chord in C major'))
    expect(lesson.describe(home)).toBe('C is the I chord in C major: a home (tonic function) chord. It feels settled, like arriving.')
    const minor = find(8, (q) => q.item === 'dom' && lesson.describe(q).includes('in A minor'))
    expect(lesson.describe(minor)).toContain('E is the V chord in A minor')
    expect(lesson.describe(minor)).toContain('resolve home to the i chord')
  })
})

describe('chords on each scale note', () => {
  const lesson = EXERCISES['diatonic-chords']
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const
  /** The notes of a major scale, spelled with each letter once. Independent of the lesson. */
  const scale = (tonic: string): string[] => {
    const start = letters.indexOf(tonic[0])
    const acc = tonic.slice(1) === '♯' ? 1 : tonic.slice(1) === '♭' ? -1 : 0
    const tonicPc = (natural[tonic[0] as keyof typeof natural] + acc + 12) % 12
    return [0, 2, 4, 5, 7, 9, 11].map((step, i) => {
      const letter = letters[(start + i) % 7]
      const diff = ((((tonicPc + step) % 12) - natural[letter as keyof typeof natural] + 18) % 12) - 6
      return letter + (diff === 0 ? '' : diff > 0 ? '♯' : '♭')
    })
  }
  const TRIAD = ['', 'm', 'm', '', '', 'm', 'dim']
  const SEVENTH = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7♭5']
  const NUM = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
  const NUM7 = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']
  const chord = (tonic: string, degree: number, seventh: boolean) => scale(tonic)[degree] + (seventh ? SEVENTH : TRIAD)[degree]
  const short = (id: string) => lesson.items.find((i) => i.id === id)!.short

  it('names the chord on the step asked for, in the key asked for', () => {
    const rand = seeded(51)
    let n = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode !== 'chord' && !(q.mode === 'seventh' && q.item.startsWith('c-'))) continue
        const m = /^In (.+) major, what is the (.+) chord\?$/.exec(q.prompt!.text)!
        const seventh = q.mode === 'seventh'
        const degree = (seventh ? NUM7 : NUM).indexOf(m[2])
        expect(degree, q.prompt!.text).toBeGreaterThanOrEqual(0)
        expect(chord(m[1], degree, seventh), q.prompt!.text).toBe(short(q.item))
        n++
      }
    }
    expect(n).toBeGreaterThan(400)
  })

  it('gives the numeral of the chord asked about', () => {
    const rand = seeded(52)
    let n = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (!q.item.startsWith('r')) continue
        const m = /^In (.+) major, which number is the chord (.+)\?$/.exec(q.prompt!.text)!
        const seventh = q.item.startsWith('r7-')
        const degree = [0, 1, 2, 3, 4, 5, 6].find((d) => chord(m[1], d, seventh) === m[2])!
        expect(degree, q.prompt!.text).toBeDefined()
        expect(short(q.item), q.prompt!.text).toBe((seventh ? NUM7 : NUM)[degree])
        n++
      }
    }
    expect(n).toBeGreaterThan(400)
  })

  it('finds the key from a chord and its numeral', () => {
    const rand = seeded(53)
    let n = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        if (q.mode !== 'key') continue
        const m = /^(.+) is the (.+) chord of which major key\?$/.exec(q.prompt!.text)!
        const tonic = short(q.item).replace(' major', '')
        expect(chord(tonic, NUM.indexOf(m[2]), false), q.prompt!.text).toBe(m[1])
        n++
      }
    }
    expect(n).toBeGreaterThan(150)
  })

  it('teaches the major, minor, minor, major, major, minor, diminished pattern', () => {
    const rand = seeded(54)
    const want: Record<string, string> = { 'q-maj': 'I IV V', 'q-min': 'ii iii vi', 'q-dim': 'vii°' }
    let n = 0
    for (const q of buildQuestions(lesson, lesson.levels[0], 100, rand)) {
      const ordinal = /built on the (\d)/.exec(q.prompt!.text)![1]
      const numeral = NUM[Number(ordinal) - 1]
      expect(want[q.item].split(' '), q.prompt!.text).toContain(numeral)
      n++
    }
    expect(n).toBe(100)
  })

  it('offers the right answer and never two chords that sound the same', () => {
    const rand = seeded(55)
    const sound = (id: string) => {
      const name = short(id)
      const m = /^([A-G])([♯♭]?)(.*)$/.exec(name)
      if (!m) return id
      const pc = (natural[m[1] as keyof typeof natural] + (m[2] === '♯' ? 1 : m[2] === '♭' ? -1 : 0) + 12) % 12
      return `${pc}${m[3]}`
    }
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 150, rand)) {
        if (!q.choices) continue
        expect(q.choices).toContain(q.item)
        if (q.item.startsWith('c-')) {
          const isSeventh = (id: string) => /7/.test(short(id))
          for (const c of q.choices) expect(isSeventh(c), `level ${level.id}: ${q.prompt!.text} offers ${short(c)}`).toBe(isSeventh(q.item))
        }
        if (q.item.startsWith('c-') || q.item.startsWith('k-')) {
          const sounds = q.choices.map((id) => (q.item.startsWith('k-') ? short(id) : sound(id)))
          expect(new Set(sounds).size, `level ${level.id}: ${q.choices.map(short).join(' ')}`).toBe(sounds.length)
        }
      }
    }
  })

  it('has the expected chords in the early levels', () => {
    const names = (level: number) => lesson.levels[level - 1].items.map(short)
    expect(names(1)).toEqual(['major', 'minor', 'dim.'])
    expect(names(2).sort()).toEqual(['Am', 'B♭', 'Bdim', 'Bm', 'C', 'D', 'Dm', 'Edim', 'Em', 'F', 'F♯dim', 'G', 'Gm'].sort())
    expect(names(3)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(names(8)).toHaveLength(12)
  })

  it('explains with the whole key and the notes of the chord', () => {
    const q = buildQuestions(lesson, lesson.levels[5], 400, seeded(56)).find((x) => x.prompt!.text === 'In A♭ major, what is the IV chord?')!
    expect(lesson.describe(q)).toBe('A♭ major: A♭ B♭m Cm D♭ E♭ Fm Gdim. The IV chord is D♭ (D♭ F A♭).')
    const s = buildQuestions(lesson, lesson.levels[8], 600, seeded(57)).find((x) => x.prompt!.text === 'In C major, what is the V7 chord?')!
    expect(lesson.describe(s)).toBe('C major: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5. The V7 chord is G7 (G B D F).')
  })
})

describe('common progressions', () => {
  const lesson = EXERCISES.progressions
  // Written out here, not taken from the lesson: the chords of a key, by root and kind.
  const MAJOR: Record<number, string> = { 0: 'I', 2: 'ii', 4: 'iii', 5: 'IV', 7: 'V', 9: 'vi' }
  const MINOR: Record<number, string> = { 0: 'i', 3: 'III', 5: 'iv', 7: 'V', 8: 'VI', 10: 'VII' }
  const KIND_OF: Record<string, string> = { 'I': 'maj', ii: 'min', iii: 'min', IV: 'maj', V: 'maj', vi: 'min', i: 'min', III: 'maj', iv: 'min', VI: 'maj', VII: 'maj' }
  const kind = (relative: number[]) => {
    const key = [...new Set(relative)].sort((a, b) => a - b).join(',') // the root sounds in the bass and above it
    return ({ '0,4,7': 'maj', '0,3,7': 'min', '0,4,7,11': 'maj7', '0,3,7,10': 'min7', '0,4,7,10': 'dom7' } as Record<string, string>)[key]
  }
  const triad = (k: string) => (k === 'maj7' || k === 'dom7' ? 'maj' : k === 'min7' ? 'min' : k)

  /** What the question actually plays, read back from its notes: the numerals of the chords after the key. */
  const decode = (q: ReturnType<typeof buildQuestions>[number]) => {
    const home = Math.min(...q.events![0].notes)
    const minor = q.events![0].notes.slice().sort((a, b) => a - b)[1] - home === 3
    const chords = q.events!.slice(q.answerFrom)
    const numerals = chords.map((e) => {
      const bass = Math.min(...e.notes)
      const root = (((bass - home) % 12) + 12) % 12
      const numeral = (minor ? MINOR : MAJOR)[root]
      const k = kind(e.notes.map((n) => (((n - bass) % 12) + 12) % 12))
      return { numeral, kind: k }
    })
    return { minor, numerals }
  }

  it('plays exactly the chords the answer names, in the key it sets up', () => {
    const rand = seeded(61)
    let n = 0
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 120, rand)) {
        const { minor, numerals } = decode(q)
        expect(numerals.map((x) => x.numeral).join('-'), `level ${level.id}`).toBe(q.item)
        expect(minor).toBe(q.mode === 'minor')
        for (const x of numerals) expect(triad(x.kind), `${q.item} ${x.numeral}`).toBe(KIND_OF[x.numeral])
        n++
      }
    }
    expect(n).toBe(1200)
  })

  it('shows every chord of the progression after the answer, the same notes that were played', () => {
    const rand = seeded(63)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 40, rand)) {
        const played = q.events!.slice(q.answerFrom!)
        expect(q.steps, q.item).toHaveLength(q.item.split('-').length)
        expect(q.steps!.map((s) => s.notes)).toEqual(played.map((e) => e.notes))
        expect(q.steps!.map((s) => s.label.split(' · ')[0]).join('-')).toBe(q.item)
      }
    }
  })

  it('uses seventh chords only on the sevenths level, and mixes them at the end', () => {
    const rand = seeded(62)
    const sevenths = (level: number) => buildQuestions(lesson, lesson.levels[level - 1], 80, rand).map((q) => decode(q).numerals.some((x) => /7/.test(x.kind)))
    expect(sevenths(1).every((s) => !s)).toBe(true)
    expect(sevenths(8).every((s) => s)).toBe(true)
    const mixed = sevenths(10)
    expect(mixed.some((s) => s) && mixed.some((s) => !s)).toBe(true)
  })

  it('has the right dominant, tonic and subdominant qualities in the seventh chords', () => {
    const q = buildQuestions(lesson, lesson.levels[7], 80, seeded(63)).find((x) => x.item === 'ii-V-I')!
    expect(decode(q).numerals.map((x) => x.kind)).toEqual(['min7', 'dom7', 'maj7'])
  })

  it('voices chords smoothly: a bass note below, and the other notes close to the last chord', () => {
    const rand = seeded(64)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 60, rand)) {
        const chords = q.events!.slice(q.answerFrom).map((e) => [...e.notes].sort((a, b) => a - b))
        chords.forEach((c, i) => {
          expect(c[0], `${q.item} chord ${i}`).toBeLessThanOrEqual(47) // bass is low
          expect(c[1] - c[0], `${q.item} chord ${i}`).toBeGreaterThan(5) // and well below the rest
          const upper = c.slice(1)
          expect(upper[upper.length - 1] - upper[0]).toBeLessThanOrEqual(14) // a hand's width
        })
        for (let i = 1; i < chords.length; i++) {
          const a = chords[i - 1].slice(1)
          const b = chords[i].slice(1)
          const top = Math.abs(a[a.length - 1] - b[b.length - 1])
          expect(top, `${q.item} step ${i}`).toBeLessThanOrEqual(7) // the top voice never leaps
        }
      }
    }
  })

  it('plays the chords evenly after a clear pause, and holds the last one longer', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 1, seeded(65))[0]
    const key = q.events!.slice(0, q.answerFrom)
    const chords = q.events!.slice(q.answerFrom)
    expect(chords).toHaveLength(4)
    const gaps = chords.slice(1).map((c, i) => +(c.time - chords[i].time).toFixed(2))
    expect(new Set(gaps).size).toBe(1)
    expect(chords[0].time - Math.max(...key.map((e) => e.time + e.hold))).toBeGreaterThanOrEqual(0.85)
    expect(chords[3].hold).toBeGreaterThan(chords[2].hold)
  })

  it('has the eight-chord canon progression and keeps rotations as separate answers', () => {
    const shorts = lesson.items.map((i) => i.short)
    expect(shorts).toContain('I–V–vi–iii–IV–I–IV–V')
    expect(shorts).toContain('vi–IV–I–V')
    expect(shorts).toContain('IV–I–V–vi')
    expect(lesson.levels[8].items).toContain('I-V-vi-iii-IV-I-IV-V')
    expect(lesson.levels[6].items).toEqual(['i-iv-V-i', 'i-VI-III-VII', 'i-VII-VI-V'])
  })

  it('explains with the chord names in the key', () => {
    const find = (id: string, text: string, level = 1) => buildQuestions(lesson, lesson.levels[level - 1], 400, seeded(66)).find((x) => x.item === id && lesson.describe(x).includes(text))!
    const q = find('I-V-vi-IV', ' in G major: G D Em C.')
    expect(lesson.describe(q)).toBe('I–V–vi–IV in G major: G D Em C. Bright and open, with a wistful turn on the minor vi.')
    const m = find('i-VII-VI-V', ' in A minor: Am G F E.', 7)
    expect(lesson.describe(m)).toContain('i–VII–VI–V in A minor: Am G F E.')
    const s = find('ii-V-I', ' in B♭ major: Cm7 F7 B♭maj7.', 8)
    expect(lesson.describe(s)).toContain('ii–V–I in B♭ major: Cm7 F7 B♭maj7.')
  })
})

describe('chord spelling and symbols', () => {
  const lesson = EXERCISES['chord-spelling']
  const short = (id: string) => lesson.items.find((i) => i.id === id)!.short
  // Independent theory: a chord is the root plus notes [letters up, semitones up]; a 9th is a 2nd an octave up.
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const TABLE: Record<string, [number, number][]> = {
    '': [[0, 0], [2, 4], [4, 7]],
    m: [[0, 0], [2, 3], [4, 7]],
    dim: [[0, 0], [2, 3], [4, 6]],
    aug: [[0, 0], [2, 4], [4, 8]],
    maj7: [[0, 0], [2, 4], [4, 7], [6, 11]],
    '7': [[0, 0], [2, 4], [4, 7], [6, 10]],
    m7: [[0, 0], [2, 3], [4, 7], [6, 10]],
    'm7♭5': [[0, 0], [2, 3], [4, 6], [6, 10]],
    maj9: [[0, 0], [2, 4], [4, 7], [6, 11], [1, 14]],
    '9': [[0, 0], [2, 4], [4, 7], [6, 10], [1, 14]],
    m9: [[0, 0], [2, 3], [4, 7], [6, 10], [1, 14]],
  }
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12
  function note(root: string, letters: number, semis: number): string {
    const letter = LETTERS[(LETTERS.indexOf(root[0]) + letters) % 7]
    const acc = ((((pcOf(root) + semis - NATURAL[letter]) % 12) + 18) % 12) - 6
    return letter + (acc > 0 ? '♯'.repeat(acc) : '♭'.repeat(-acc))
  }
  /** The notes a symbol stands for, written as the lesson should write them. */
  function expected(symbol: string): string {
    const [, root, rest] = symbol.match(/^([A-G][♯♭]*)(.*)$/)!
    if (rest.startsWith('/')) {
      const [r, third, fifth] = TABLE[''].map(([l, s]) => note(root, l, s))
      const bass = rest.slice(1)
      expect([third, fifth], symbol).toContain(bass)
      return (bass === third ? [third, fifth, r] : [fifth, r, third]).join(' ')
    }
    expect(TABLE[rest], symbol).toBeDefined()
    return TABLE[rest].map(([l, s]) => note(root, l, s)).join(' ')
  }

  it('spells every chord right, in both answer sets', () => {
    const keys = lesson.items.filter((i) => i.id.startsWith('c-')).map((i) => i.id.slice(2))
    expect(keys.length).toBe(12 * 13)
    for (const key of keys) expect(short(`s-${key}`), key).toBe(expected(short(`c-${key}`)))
  })

  it('asks a fair question every time: the right prompt, choices of one kind, the keys in order', () => {
    const rand = seeded(23)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 200, rand)) {
        const key = q.item.slice(2)
        const symbol = short(`c-${key}`)
        const notes = expected(symbol)
        if (q.mode === 'spell') {
          expect(q.item.startsWith('s-')).toBe(true)
          expect(q.prompt!.text).toBe(`Spell ${symbol}.`)
        } else {
          expect(q.item.startsWith('c-')).toBe(true)
          expect(q.prompt!.text).toContain(notes)
          const lit = q.prompt!.lit!
          expect(lit.map((m) => m % 12)).toEqual(notes.split(' ').map(pcOf))
          for (let i = 1; i < lit.length; i++) expect(lit[i]).toBeGreaterThan(lit[i - 1])
        }
        expect(q.choices!.every((c) => c.slice(0, 2) === q.item.slice(0, 2))).toBe(true)
        expect(q.choices!.length).toBeLessThanOrEqual(5)
        expect(q.explain).toContain(`${symbol} = ${notes}`)
      }
    }
  })

  it('never names the chord on a spelling tile', () => {
    for (const item of lesson.items.filter((i) => i.id.startsWith('s-'))) expect(item.name).toMatch(/^\d notes$/)
  })

  it('offers several choices from level 1 on', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 20, seeded(5))
    for (const x of q) expect(x.choices!.length).toBeGreaterThanOrEqual(4)
  })

  it('explains in plain words', () => {
    const level = (n: number, id: string) => buildQuestions(lesson, lesson.levels[n - 1], 400, seeded(4)).find((x) => x.item === id)!
    expect(lesson.describe(level(5, 's-Fmaj7'))).toBe('Fmaj7 = F A C E: major 3rd, perfect 5th, major 7th above F.')
    expect(lesson.describe(level(8, 'c-C/E'))).toBe('C/E = E G C: a C major chord (C E G) with its 3rd, E, in the bass.')
    expect(short('s-Dbm7b5')).toBe('D♭ F♭ A♭♭ C♭')
    expect(short('s-F#aug')).toBe('F♯ A♯ C♯♯')
  })
})

describe('pentatonic', () => {
  const lesson = EXERCISES.pentatonic
  // Independent theory: the scales as semitones above home, and each degree's letter step and semitones.
  const MAJOR_PENT = [0, 2, 4, 7, 9]
  const MINOR_PENT = [0, 3, 5, 7, 10]
  const BLUES = [0, 3, 5, 6, 7, 10]
  const DEGREE: Record<string, [number, number]> = { '1': [0, 0], '2': [1, 2], b3: [2, 3], '3': [2, 4], '4': [3, 5], b5: [4, 6], '5': [4, 7], '6': [5, 9], b7: [6, 10] }
  const SHORT: Record<string, string> = { '1': '1', '2': '2', b3: '♭3', '3': '3', '4': '4', b5: '♭5', '5': '5', '6': '6', b7: '♭7' }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12

  it('plays only scale notes, ends on the answer, and shows every note with its number and name', () => {
    const rand = seeded(31)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 150, rand)) {
        const tonicPc = Math.min(...q.events![0].notes) % 12
        const scale = q.mode === 'major' ? MAJOR_PENT : level.id >= 9 ? BLUES : MINOR_PENT
        const tune = q.events!.slice(q.answerFrom).map((e) => e.notes[0])
        expect(q.events!.slice(q.answerFrom).every((e) => e.notes.length === 1)).toBe(true)
        expect(tune.length).toBeGreaterThanOrEqual(3)
        expect(tune.length).toBeLessThanOrEqual(5)
        if (level.id <= 4) expect(tonicPc).toBe(0)
        for (const m of tune) expect(scale, `level ${level.id}`).toContain((m - tonicPc + 120) % 12)
        expect((tune[tune.length - 1] - tonicPc + 120) % 12).toBe(DEGREE[q.item][1])
        const tonicName = q.explain!.match(/^In ([A-G][♯♭]*) (major|minor):/)!
        expect(pcOf(tonicName[1])).toBe(tonicPc)
        expect(tonicName[2]).toBe(q.mode)
        expect(q.steps!.map((s) => s.notes)).toEqual(tune.map((m) => [m]))
        q.steps!.forEach((s, i) => {
          const [num, note] = s.label.split(' · ')
          const id = Object.keys(SHORT).find((k) => SHORT[k] === num)!
          expect((tune[i] - tonicPc + 120) % 12).toBe(DEGREE[id][1])
          expect(pcOf(note)).toBe(tune[i] % 12)
          expect(note[0]).toBe(LETTERS[(LETTERS.indexOf(tonicName[1][0]) + DEGREE[id][0]) % 7])
        })
        // one note at a time: each note stops before or as the next starts
        const ev = q.events!.slice(q.answerFrom)
        for (let i = 1; i < ev.length; i++) expect(ev[i - 1].time + ev[i - 1].hold).toBeLessThanOrEqual(ev[i].time)
      }
    }
  })

  it('explains in plain words', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 60, seeded(2)).find((x) => x.item === '1')!
    expect(lesson.describe(q)).toMatch(/^In C major: ([A-G] ){2,}C\. The tune ended on C, the home note \(1\)\.$/)
  })
})

describe('cadences', () => {
  const lesson = EXERCISES.cadences
  // Independent theory: chord tones as semitones above the tonic.
  const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
  const MINOR_NOTES = [0, 2, 3, 5, 7, 8, 10, 11] // natural minor plus the raised 7th of V
  const triad = (root: number, minor: boolean) => [root, root + (minor ? 3 : 4), root + 7].map((x) => x % 12).sort((a, b) => a - b)
  const dom7 = (root: number) => [root, root + 4, root + 7, root + 10].map((x) => x % 12).sort((a, b) => a - b)
  /** The last two chords each cadence must end with, as [root, minor?] above the tonic (null = any chord). */
  const ENDINGS: Record<string, Record<string, [[number, boolean] | null, [number, boolean]]>> = {
    major: { perfect: [[7, false], [0, false]], plagal: [[5, false], [0, false]], half: [null, [7, false]], deceptive: [[7, false], [9, true]] },
    minor: { perfect: [[7, false], [0, true]], plagal: [[5, true], [0, true]], half: [null, [7, false]], deceptive: [[7, false], [8, false]] },
  }

  it('ends every phrase with the cadence it names, using only chords of the key', () => {
    const rand = seeded(41)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 120, rand)) {
        const tonicPc = Math.min(...q.events![0].notes) % 12
        if (level.id <= 4) expect(tonicPc).toBe(0)
        const chords = q.events!.slice(q.answerFrom).map((e) => e.notes)
        expect(chords.length).toBeGreaterThanOrEqual(3)
        expect(chords.length).toBeLessThanOrEqual(5)
        const rel = (notes: number[]) => [...new Set(notes.map((m) => (m - tonicPc + 120) % 12))].sort((a, b) => a - b)
        const bass = (notes: number[]) => (Math.min(...notes) - tonicPc + 120) % 12
        for (let i = 1; i < chords.length; i++) expect(rel(chords[i])).not.toEqual(rel(chords[i - 1]))
        const scale = q.mode === 'major' ? MAJOR_SCALE : MINOR_NOTES
        for (const c of chords) for (const pc of rel(c)) expect(scale, `level ${level.id} ${q.item}`).toContain(pc)
        const [pre, last] = ENDINGS[q.mode][q.item]
        const lastChord = chords[chords.length - 1]
        expect(bass(lastChord)).toBe(last[0])
        expect(rel(lastChord)).toEqual(triad(last[0], last[1]))
        if (pre) {
          const p = chords[chords.length - 2]
          expect(bass(p)).toBe(pre[0])
          expect([triad(pre[0], pre[1]), ...(pre[0] === 7 ? [dom7(7)] : [])]).toContainEqual(rel(p))
        }
        expect(q.steps!.map((s) => s.notes)).toEqual(chords)
      }
    }
  })

  it('explains in plain words', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 40, seeded(1)).find((x) => x.item === 'perfect')!
    expect(lesson.describe(q)).toBe('Perfect cadence (V–I) in C major: C G C. A full stop: the tension of V resolves home.')
    expect(q.steps!.map((s) => s.label)).toEqual(['I · C', 'V · G', 'I · C'])
  })
})

describe('inversions and slash chords', () => {
  const lesson = EXERCISES['slash-chords']
  // Independent theory: chord tones as semitones above the root, and the tone each answer puts in the bass.
  const CHORDS: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] }
  const TONE: Record<string, number> = { root: 0, '3rd': 1, '5th': 2, '7th': 3 }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12

  it('puts the answer\'s chord tone in the bass and plays the whole chord above it', () => {
    const rand = seeded(53)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 120, rand)) {
        const notes = q.answerFrom !== undefined ? q.events![q.answerFrom].notes : q.notes
        expect(q.steps!.map((s) => s.notes)).toEqual([notes])
        const [symbol, spelled] = q.steps![0].label.split(' · ')
        const [, rootName, suffix, bassName] = symbol.match(/^([A-G][♯♭]*)(m7|maj7|7|m|)(?:\/([A-G][♯♭]*))?$/)!
        const stack = CHORDS[suffix].map((s) => (pcOf(rootName) + s) % 12)
        const bassPc = stack[TONE[q.item]]
        const low = Math.min(...notes)
        expect(low % 12, `level ${level.id} ${symbol}`).toBe(bassPc)
        expect(notes[0]).toBe(low)
        expect(new Set(notes.map((m) => m % 12))).toEqual(new Set(stack))
        if (q.item === 'root') expect(bassName).toBeUndefined()
        else {
          expect(pcOf(bassName)).toBe(bassPc)
          // the bass is spelled as the chord tone: the 3rd two letters above the root, the 5th four, the 7th six
          expect(bassName[0]).toBe(LETTERS[(LETTERS.indexOf(rootName[0]) + 2 * TONE[q.item]) % 7])
        }
        expect(spelled.split(' ').map(pcOf)).toEqual(notes.map((m) => m % 12))
      }
    }
  })

  it('explains in plain words', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 40, seeded(8)).find((x) => x.item === '3rd' && x.steps![0].label.startsWith('C/E'))!
    expect(lesson.describe(q)).toBe('C/E: a C major chord with its 3rd, E, in the bass.')
    expect(q.steps![0].label).toBe('C/E · E G C')
    const f = buildQuestions(lesson, lesson.levels[0], 60, seeded(9)).find((x) => x.item === '3rd' && x.steps![0].label.startsWith('F/A'))!
    expect(lesson.describe(f)).toBe('F/A: an F major chord with its 3rd, A, in the bass.')
  })
})

describe('chord tones and guide tones', () => {
  const lesson = EXERCISES['chord-tones']
  // Independent theory: chord tones as semitones above the root, and each answer's letter step.
  const CHORDS: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] }
  const LETTER_STEP: Record<string, number> = { '1': 0, '3': 2, '5': 4, '7': 6, '9': 1 }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12

  it('plays the named chord and a melody note above it that is the answer', () => {
    const rand = seeded(61)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 150, rand)) {
        const events = q.events!
        expect(q.steps!.map((s) => s.notes)).toEqual(events.map((e) => e.notes))
        const chordNotes = events[events.length - 2].notes
        const melody = events[events.length - 1].notes[0]
        const [symbol, spelled] = q.steps![q.steps!.length - 2].label.split(' · ')
        const [, rootName, suffix] = symbol.match(/^([A-G][♯♭]*)(m7|maj7|7|m|)$/)!
        const rootPc = pcOf(rootName)
        expect(Math.min(...chordNotes) % 12).toBe(rootPc)
        const stack = CHORDS[suffix].map((s) => (rootPc + s) % 12)
        expect(new Set(chordNotes.map((m) => m % 12))).toEqual(new Set(stack))
        expect(spelled.split(' ').map(pcOf)).toEqual(stack)
        for (const e of events.slice(0, -1)) if (e.notes.length > 1) expect(melody).toBeGreaterThan(Math.max(...e.notes))
        const interval = (melody - rootPc + 120) % 12
        const noteName = q.steps![q.steps!.length - 1].label.split(' · ')[0]
        expect(pcOf(noteName)).toBe(melody % 12)
        if (q.item === 'out') {
          expect(stack).not.toContain(melody % 12)
          expect(interval).not.toBe(2)
        } else {
          const want = q.item === '9' ? 2 : CHORDS[suffix][['1', '3', '5', '7'].indexOf(q.item)]
          expect(interval, `level ${level.id} ${symbol} ${q.item}`).toBe(want)
          expect(noteName[0]).toBe(LETTERS[(LETTERS.indexOf(rootName[0]) + LETTER_STEP[q.item]) % 7])
        }
        if (level.id === 9) expect(events.length).toBe(4)
      }
    }
  })

  it('explains in plain words', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 60, seeded(4)).find((x) => x.item === '3' && x.steps![0].label.startsWith('C ·'))!
    expect(lesson.describe(q)).toBe('Over C (C major: C E G) the E is the 3rd, a guide tone.')
    expect(q.steps!.map((s) => s.label)).toEqual(['C · C E G', 'E · the 3rd of C'])
  })
})

describe('ii-V-I', () => {
  const lesson = EXERCISES['two-five-one']
  // Independent theory: chord shapes as semitones above the root, which shapes fit each place of a ii-V-I,
  // and how far above home each target lands.
  const SHAPES: Record<string, number[]> = {
    min: [0, 3, 7], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 2], dim: [0, 3, 6], m7b5: [0, 3, 6, 10],
    maj: [0, 4, 7], '7': [0, 4, 7, 10], '9': [0, 4, 7, 10, 2], '13': [0, 4, 10, 2, 9], maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 2],
  }
  const FITS = {
    major: [['min', 'm7', 'm9'], ['maj', '7', '9', '13'], ['maj', 'maj7', 'maj9']],
    minor: [['dim', 'm7b5'], ['maj', '7', '9', '13'], ['min', 'm7', 'm9']],
  }
  const TARGET: Record<string, [number, 'major' | 'minor']> = { major: [0, 'major'], minor: [0, 'minor'], 'to-IV': [5, 'major'], 'to-V': [7, 'major'], 'to-vi': [9, 'minor'], 'to-ii': [2, 'minor'] }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12
  const shapeOf = (notes: number[]) => {
    const bass = Math.min(...notes)
    const rel = [...new Set(notes.map((m) => (m - bass + 120) % 12))].sort((a, b) => a - b)
    return Object.keys(SHAPES).filter((k) => JSON.stringify([...new Set(SHAPES[k].map((x) => x % 12))].sort((a, b) => a - b)) === JSON.stringify(rel))
  }

  it('plays ii, V and the target a 5th apart, with the right chords, landing where the answer says', () => {
    const rand = seeded(71)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 120, rand)) {
        const chords = q.events!.slice(q.answerFrom ?? 0).map((e) => e.notes)
        expect(q.steps!.map((s) => s.notes)).toEqual(chords)
        expect([3, 6]).toContain(chords.length)
        const tonic = q.answerFrom !== undefined ? Math.min(...q.events![0].notes) % 12 : level.id === 1 ? 0 : null
        for (let k = 0; k < chords.length; k += 3) {
          const three = chords.slice(k, k + 3)
          const bass = three.map((c) => Math.min(...c) % 12)
          expect((bass[1] - bass[0] + 12) % 12).toBe(5)
          expect((bass[2] - bass[1] + 12) % 12).toBe(5)
          const last = k + 3 === chords.length
          const kind = last ? TARGET[q.item][1] : FITS.major[0].some((s) => shapeOf(three[0]).includes(s)) ? 'major' : 'minor'
          three.forEach((c, i) => expect(FITS[kind][i].some((s) => shapeOf(c).includes(s)), `level ${level.id} ${q.item} chord ${k + i}`).toBe(true))
          if (last && tonic !== null) expect((bass[2] - tonic + 12) % 12).toBe(TARGET[q.item][0])
        }
        q.steps!.forEach((s, i) => {
          const name = s.label.split(' · ')[1]
          expect(pcOf(name.match(/^[A-G][♯♭]*/)![0])).toBe(Math.min(...chords[i]) % 12)
        })
      }
    }
  })

  it('explains in plain words', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 40, seeded(3)).find((x) => x.item === 'major')!
    expect(lesson.describe(q)).toBe('Dm G C. A major ii-V-I: minor ii, major V, settling home on a major chord.')
    expect(q.steps!.map((s) => s.label)).toEqual(['ii · Dm', 'V · G', 'I · C'])
  })
})

describe('finding the chords by ear', () => {
  const lesson = EXERCISES['by-ear']

  it('"hear yours" plays the same loop with only the asked chord changed', () => {
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 20, seeded(5))) {
        const other = level.items.find((i) => i !== q.item)!
        const alt = sameSetting(lesson, level, q, other)!
        const at = Number(q.prompt!.text.match(/([1-4])/)![1]) - 1
        expect(alt.item).toBe(other)
        expect(alt.prompt).toEqual(q.prompt)
        q.steps!.forEach((s, i) => (i === at ? expect(alt.steps![i].label).not.toBe(s.label) : expect(alt.steps![i].label.split(' · ')[0]).toBe(s.label.split(' · ')[0])))
      }
    }
  })
  // Independent theory: each numeral's root above the tonic and its quality in a major key.
  const NUMERAL: Record<string, [number, boolean]> = { I: [0, false], ii: [2, true], iii: [4, true], IV: [5, false], V: [7, false], vi: [9, true], bVII: [10, false] }
  const SHORT: Record<string, string> = { I: 'I', ii: 'ii', iii: 'iii', IV: 'IV', V: 'V', vi: 'vi', bVII: '♭VII' }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12
  const triad = (root: number, minor: boolean) => new Set([root, root + (minor ? 3 : 4), root + 7].map((x) => x % 12))

  it('plays a loop of real chords of the key, every note in the chord of its bar, and asks for the right one', () => {
    const rand = seeded(83)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 80, rand)) {
        const at = Number(q.prompt!.text.match(/^Which chord is number ([1-4])\?$/)![1]) - 1
        expect(q.steps!.length).toBe(4)
        const numerals = q.steps!.map((s) => Object.keys(SHORT).find((k) => SHORT[k] === s.label.split(': ')[1].split(' · ')[0])!)
        expect(numerals[at]).toBe(q.item)
        for (const n of numerals) expect(level.items).toContain(n)
        const song = q.events!.slice(q.answerFrom ?? 0)
        // home: from the key when it is played, else from the I chord's bass, else from any chord's bass and its numeral
        const tonic = (Math.min(...q.steps![0].notes) - NUMERAL[numerals[0]][0] + 120) % 12
        if (q.answerFrom !== undefined) expect(Math.min(...q.events![0].notes) % 12).toBe(tonic)
        q.steps!.forEach((s, i) => {
          const [root, minor] = NUMERAL[numerals[i]]
          const want = triad(tonic + root, minor)
          expect(new Set(s.notes.map((m) => m % 12))).toEqual(want)
          expect(Math.min(...s.notes) % 12).toBe((tonic + root) % 12)
          expect(pcOf(s.label.split(' · ')[1].match(/^[A-G][♯♭]*/)![0])).toBe((tonic + root) % 12)
        })
        // every note sounds over the chord of its bar: two passes of four bars, each bar starting with a bass note (below C3)
        const bassTimes = [...new Set(song.filter((e) => e.notes.some((m) => m < 48)).map((e) => e.time))].sort((x, y) => x - y)
        expect([8, 16]).toContain(bassTimes.length)
        const barStarts = bassTimes.filter((_, i) => i % (bassTimes.length / 8) === 0)
        for (const e of song) {
          const barIndex = barStarts.filter((t) => t <= e.time + 1e-9).length - 1
          expect(barIndex).toBeGreaterThanOrEqual(0)
          const chordPcs = new Set(q.steps![barIndex % 4].notes.map((m) => m % 12))
          for (const m of e.notes) expect(chordPcs.has(m % 12), `level ${level.id} bar ${barIndex}`).toBe(true)
        }
      }
    }
  })
})

describe('minor scales', () => {
  const lesson = EXERCISES['minor-scales']
  // Independent theory: each scale as semitones above home.
  const SEMIS: Record<string, number[]> = { major: [0, 2, 4, 5, 7, 9, 11], natural: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], melodic: [0, 2, 3, 5, 7, 9, 11] }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12

  it('plays the named scale in order from home, spelled with each letter once', () => {
    const rand = seeded(97)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 100, rand)) {
        const run = q.events!.slice(q.answerFrom ?? 0).map((e) => e.notes[0])
        const home = q.root
        const scale = [...SEMIS[q.item], 12]
        const rel = run.map((m) => m - home)
        for (const r of rel) expect(scale, `level ${level.id} ${q.item}`).toContain(r)
        // a straight run: each note the next or previous scale step
        const idx = rel.map((r) => scale.indexOf(r))
        for (let i = 1; i < idx.length; i++) expect(Math.abs(idx[i] - idx[i - 1])).toBe(1)
        if (level.id === 6) expect(idx).toEqual([4, 5, 6, 7])
        else expect(idx.includes(0) && idx.includes(7)).toBe(true)
        if (level.id <= 3) expect(home % 12).toBe(0)
        expect(q.steps!.map((s) => s.notes[0])).toEqual(run)
        const names = q.steps!.map((s) => s.label.split(' · ')[1])
        names.forEach((n, i) => expect(pcOf(n)).toBe(run[i] % 12))
        const homeLetter = LETTERS.indexOf(names[idx.indexOf(Math.min(...idx))][0]) - Math.min(...idx)
        names.forEach((n, i) => expect(n[0]).toBe(LETTERS[(((homeLetter + idx[i]) % 7) + 7) % 7]))
        const other = level.items.find((x) => x !== q.item)!
        const alt = sameSetting(lesson, level, q, other)!
        expect(alt.root).toBe(q.root)
        expect(alt.events!.length).toBe(q.events!.length)
      }
    }
  })
})

describe('modes', () => {
  const lesson = EXERCISES.modes
  // Independent theory: the modes as the major scale started from each of its notes.
  const MAJOR = [0, 2, 4, 5, 7, 9, 11]
  const START: Record<string, number> = { ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, aeolian: 5, locrian: 6 }
  const modeSemis = (id: string) => MAJOR.map((_, i) => (MAJOR[(i + START[id]) % 7] - MAJOR[START[id]] + 12) % 12)
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12

  it('plays the named mode over its home note, spelled with each letter once, and any vamp stays in the mode', () => {
    const rand = seeded(101)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 100, rand)) {
        const semis = [...modeSemis(q.item), 12]
        const home = q.root
        const drone = q.events!.find((e) => e.notes.length === 1 && e.notes[0] === home - 24)!
        expect(drone).toBeDefined()
        const run = q.events!.filter((e) => e.time > drone.time && e.notes.length === 1).map((e) => e.notes[0])
        const idx = run.map((m) => semis.indexOf(m - home))
        expect(idx.every((i) => i >= 0), `level ${level.id} ${q.item}`).toBe(true)
        for (let i = 1; i < idx.length; i++) expect(Math.abs(idx[i] - idx[i - 1])).toBe(1)
        expect(idx.includes(0) && idx.includes(7)).toBe(true)
        if (level.id <= 5) expect(home % 12).toBe(0)
        const vamp = q.events!.filter((e) => e.notes.length > 1)
        for (const e of vamp) for (const m of e.notes) expect(semis.map((s) => s % 12)).toContain((m - home + 120) % 12)
        if (vamp.length) expect(Math.min(...vamp[0].notes) % 12).toBe(home % 12)
        const runSteps = q.steps!.slice(q.steps!.findIndex((s) => s.label.startsWith('Home')) + 1)
        expect(runSteps.map((s) => s.notes[0])).toEqual(run)
        const names = runSteps.map((s) => s.label.split(' · ')[1])
        names.forEach((n, i) => expect(pcOf(n)).toBe(run[i] % 12))
        const homeLetter = LETTERS.indexOf(names[idx.indexOf(0)][0])
        names.forEach((n, i) => expect(n[0]).toBe(LETTERS[(homeLetter + idx[i]) % 7]))
        const other = level.items.find((x) => x !== q.item)!
        const alt = sameSetting(lesson, level, q, other)!
        expect(alt.root).toBe(q.root)
        expect(alt.events!.length).toBe(q.events!.length)
      }
    }
  })
})

describe('comping patterns', () => {
  const lesson = EXERCISES.comping
  // Independent description of each pattern, in beats: when the bass root itself sounds, and the last onset of a bar.
  const ROOT_ON: Record<string, number[]> = { block: [0, 1, 2, 3], basic: [0], ballad: [0, 2], push: [0, 2], arpeggio: [0], rnb: [0, 3], gospel: [0, 2], waltz: [0] }
  const LAST: Record<string, number> = { block: 3, basic: 3, ballad: 3.5, push: 3, arpeggio: 3.5, rnb: 3, gospel: 3, waltz: 2 }
  const BEATS: Record<string, number> = { waltz: 3 }
  const TRIADS: Record<string, [number, boolean]> = { I: [0, false], ii: [2, true], IV: [5, false], V: [7, false], vi: [9, true] }

  it('plays the named pattern: its beats, its bass, and only notes of each bar\'s chord', () => {
    const rand = seeded(113)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 60, rand)) {
        const events = q.events!
        expect(q.steps!.length).toBe(4)
        const tonic = q.root % 12
        const numerals = q.steps!.map((s) => s.label.split(' · ')[0])
        const chordPcs = numerals.map((n) => {
          const [r, minor] = TRIADS[n]
          return new Set([r, r + (minor ? 3 : 4), r + 7].map((x) => (tonic + x) % 12))
        })
        const beats = BEATS[q.item] ?? 4
        // 8 bars (the loop twice); the last onset sits LAST beats into bar 8
        const bar = Math.max(...events.map((e) => e.time)) / (7 + LAST[q.item] / beats)
        const beat = bar / beats
        const bassOf = q.steps!.map((s) => Math.min(...s.notes))
        const rootOnsets = new Set<number>()
        for (const e of events) {
          const b = Math.floor((e.time + 1e-6) / bar)
          expect(b).toBeLessThan(8)
          for (const m of e.notes) expect(chordPcs[b % 4].has(m % 12), `${q.item} bar ${b}`).toBe(true)
          const offset = Math.round(((e.time - b * bar) / beat) * 2) / 2
          if (e.notes.includes(bassOf[b % 4])) rootOnsets.add(offset)
        }
        expect([...rootOnsets].sort((x, y) => x - y), q.item).toEqual(ROOT_ON[q.item])
        const other = level.items.find((x) => x !== q.item)!
        const alt = sameSetting(lesson, level, q, other)!
        expect(alt.steps!.map((s) => s.label)).toEqual(q.steps!.map((s) => s.label))
        expect(alt.item).toBe(other)
      }
    }
  })
})

describe('voice leading', () => {
  const lesson = EXERCISES['voice-leading']
  const short = (id: string) => lesson.items.find((i) => i.id === id)!.short
  // Independent theory: chord shapes, and the hand movement between two close-position chords.
  const SHAPES: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10] }
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12
  /** Stack these pitch classes upward from a bottom note, and find the bottom note (within an octave either way) that moves least. */
  function best(pcs: number[], current: number[]): number {
    let least = Infinity
    for (let bottom = current[0] - 12; bottom <= current[0] + 12; bottom++) {
      if (((bottom % 12) + 12) % 12 !== pcs[0]) continue
      const notes = [bottom]
      for (const pc of pcs.slice(1)) {
        let m = notes[notes.length - 1] + 1
        while (((m % 12) + 12) % 12 !== pc) m++
        notes.push(m)
      }
      least = Math.min(least, notes.reduce((s, m, i) => s + Math.abs(m - current[i]), 0))
    }
    return least
  }

  it('offers every inversion of the next chord, and the answer is the only one that moves least', () => {
    const rand = seeded(127)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 80, rand)) {
        const [, symbol] = q.prompt!.text.match(/Next: ([A-G][♯♭]*(?:maj7|m7|7|m)?)\./)!
        const [, rootName, suffix] = symbol.match(/^([A-G][♯♭]*)(maj7|m7|7|m|)$/)!
        const chord = new Set(SHAPES[suffix].map((s) => (pcOf(rootName) + s) % 12))
        expect(q.choices!.length).toBe(chord.size)
        const current = q.prompt!.lit!
        const moves = q.choices!.map((id) => {
          const pcs = short(id).split(' ').map(pcOf)
          expect(new Set(pcs)).toEqual(chord)
          return best(pcs, current)
        })
        const mine = moves[q.choices!.indexOf(q.item)]
        expect(moves.filter((m) => m === mine).length, `level ${level.id} ${q.prompt!.text}`).toBe(1)
        expect(Math.min(...moves)).toBe(mine)
        expect(q.explain).toContain(`(${mine} semitone`)
        expect(new Set(current.map((m) => m % 12)).size).toBe(current.length)
      }
    }
  })

  it('explains a move in plain words', () => {
    const q = buildQuestions(lesson, lesson.levels[0], 60, seeded(2)).find((x) => x.prompt!.text.startsWith('You are on C (C E G). Next: G.'))!
    expect(q.explain).toBe('C E G → B D G: C down to B, E down to D, G stays (3 semitones in all). Try it: play the two chords this way with your right hand, then keep going round the loop.')
  })
})

describe('left-hand patterns', () => {
  const lesson = EXERCISES['left-hand']
  // Independent description: each pattern as (beat, notes above the bass), with t = the chord's 3rd (3 or 4).
  const PATTERN: Record<string, (t: number) => [number, number[]][]> = {
    root: () => [[0, [0]]],
    'root-5th': () => [[0, [0]], [2, [7]]],
    octave: () => [[0, [0, 12]], [2, [0, 12]]],
    broken: () => [[0, [0]], [1, [7]], [2, [12]], [3, [7]]],
    alberti: (t) => [0, 7, t, 7, 0, 7, t, 7].map((x, i) => [i / 2, [x]] as [number, number[]]),
    stride: (t) => [[0, [0]], [1, [t, 7, 12]], [2, [0]], [3, [t, 7, 12]]],
    walk: (t) => [[0, [0]], [1, [2]], [2, [t]], [3, [7]]],
  }
  const MINOR = new Set(['ii', 'iii', 'vi'])

  it('plays the named left-hand pattern under a held right-hand chord', () => {
    const rand = seeded(131)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 50, rand)) {
        const events = q.events!
        const numerals = q.steps!.map((s) => s.label.split(' · ')[0])
        const rhTimes = q.steps!.flatMap((s) => events.filter((e) => JSON.stringify(e.notes) === JSON.stringify(s.notes.slice(1))).map((e) => e.time))
        const bar = [...new Set(rhTimes)].sort((a, b) => a - b)[1]
        const beat = bar / 4
        for (let b = 0; b < 8; b++) {
          const step = q.steps![b % 4]
          const bass = step.notes[0]
          const lh = events
            .filter((e) => e.time >= b * bar - 1e-6 && e.time < (b + 1) * bar - 1e-6 && JSON.stringify(e.notes) !== JSON.stringify(step.notes.slice(1)))
            .map((e) => [Math.round(((e.time - b * bar) / beat) * 2) / 2, e.notes.map((m) => m - bass).sort((x, y) => x - y)])
          const want = PATTERN[q.item](MINOR.has(numerals[b % 4]) ? 3 : 4).map(([t, n]) => [t, [...n].sort((x, y) => x - y)])
          expect(lh, `level ${level.id} ${q.item} bar ${b}`).toEqual(want)
        }
        const other = level.items.find((x) => x !== q.item)!
        expect(sameSetting(lesson, level, q, other)!.steps).toEqual(q.steps)
      }
    }
  })
})

describe('bass lines', () => {
  const lesson = EXERCISES['bass-lines']
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : -1), 0) + 24) % 12
  const SHAPE: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7] }

  it('plays the named bass line: right notes, right beats, and a real walk-down', () => {
    const rand = seeded(137)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 60, rand)) {
        const song = q.events!.slice(q.answerFrom ?? 0)
        const chords = q.steps!.map((s) => {
          const [, root, suffix] = s.label.split(' · ')[0].match(/^([A-G][♯♭]*)(m?)/)!
          return { root: pcOf(root), pcs: SHAPE[suffix].map((x) => (pcOf(root) + x) % 12), upper: s.notes.filter((m) => m >= 48 && s.notes.indexOf(m) > 0 && song.some((e) => e.notes.length > 1 && e.notes.includes(m))) }
        })
        // bar starts: the first right-hand chord of each run of the same chord
        const rh = song.filter((e) => e.notes.length > 1)
        const starts = rh.filter((e, i) => i === 0 || JSON.stringify(e.notes) !== JSON.stringify(rh[i - 1].notes)).map((e) => e.time)
        expect(starts.length).toBe(8)
        const bar = starts[1] - starts[0]
        const bassOf = (b: number) => song
          .filter((e) => e.notes.length === 1 && e.time >= starts[b] - 1e-6 && e.time < starts[b] + bar - 1e-6)
          .map((e) => [Math.round((e.time - starts[b]) / (bar / 4)), e.notes[0]] as [number, number])
        const lines = [0, 1, 2, 3, 4, 5, 6, 7].map(bassOf)
        const pcs = (b: number) => lines[b].map(([, m]) => m % 12)
        for (let b = 0; b < 8; b++) {
          const c = chords[b % 4]
          const next = chords[(b + 1) % 4]
          if (q.item === 'roots') expect(lines[b].map(([t]) => t).concat(pcs(b))).toEqual([0, c.root])
          if (q.item === 'root-5th') expect(lines[b].map(([t]) => t).concat(pcs(b))).toEqual([0, 2, c.root, (c.root + 7) % 12])
          if (q.item === 'walk-up') {
            expect(lines[b].map(([t]) => t)).toEqual([0, 3])
            expect(pcs(b)).toEqual([c.root, (next.root + 11) % 12])
          }
          if (q.item === 'pedal') expect(pcs(b)).toEqual(pcs(0))
          if (q.item === 'walk-down') {
            expect(lines[b].length).toBe(1)
            expect(c.pcs).toContain(pcs(b)[0])
            if (b % 4 === 0) expect(pcs(b)[0]).toBe(c.root)
            else {
              const prev = lines[b - 1][0][1], now = lines[b][0][1]
              expect(now).toBeLessThan(prev)
              for (let m = now + 1; m < prev; m++) expect(c.pcs).not.toContain(m % 12)
            }
          }
        }
        if (q.item === 'pedal' && q.answerFrom !== undefined) expect(pcs(0)[0]).toBe(Math.min(...q.events![0].notes) % 12)
        if (q.item === 'walk-down') expect([0, 1, 2, 3].filter((b) => pcs(b)[0] !== chords[b].root).length).toBeGreaterThanOrEqual(1)
        // the shown bass names are the notes heard
        q.steps!.forEach((s, b) => expect(s.label.split(' · bass ')[1].split(' ').map(pcOf)).toEqual(pcs(b)))
        const other = level.items.find((x) => x !== q.item)!
        expect(sameSetting(lesson, level, q, other)!.steps!.map((s) => s.notes.slice(-3))).toEqual(q.steps!.map((s) => s.notes.slice(-3)))
      }
    }
  })
})

describe('reading lead sheets and chord charts', () => {
  const lesson = EXERCISES['lead-sheets']
  const short = (id: string) => lesson.items.find((i) => i.id === id)!.short
  interface RefBar { tokens: string[]; open: string; close: string }
  /** Read the chart exactly as shown on screen. */
  function parse(text: string) {
    const lines = text.split('\n')
    const meter = Number(lines[0][0])
    const jumpLine = lines.find((l) => l.startsWith('D.'))
    const body = lines.slice(1).filter((l) => !l.startsWith('D.')).join(' ')
    const parts = body.split(/(\|\|:|:\|\||\|\||\|)/).map((p) => p.trim())
    const bars: RefBar[] = []
    for (let i = 0; i < parts.length; i++) {
      if (/^(\|\|:|:\|\||\|\||\|)$/.test(parts[i]) || parts[i] === '') continue
      bars.push({ tokens: parts[i].replace('[To Coda]', '[ToCoda]').split(/\s+/), open: parts[i - 1] ?? '|', close: parts[i + 1] ?? '|' })
    }
    const jump = jumpLine ? { dc: jumpLine.startsWith('D.C.'), after: Number(jumpLine.match(/after bar (\d+)/)![1]) - 1 } : undefined
    return { meter, bars, jump }
  }
  const has = (b: RefBar, t: string) => b.tokens.includes(t)
  const chordsOf = (b: RefBar) => b.tokens.filter((t) => !t.startsWith('[') && !/^[12]\.$/.test(t))
  /** Playing order by the usual rules: repeats twice, 2nd ending on the way back, no repeats after D.C./D.S., Fine stops, To Coda jumps. */
  function order(c: ReturnType<typeof parse>): number[] {
    const out: number[] = []
    const done = new Set<number>()
    let i = 0, back = false, second = false
    for (let guard = 0; guard < 200 && i < c.bars.length; guard++) {
      const b = c.bars[i]
      if (second && has(b, '1.')) { i = c.bars.findIndex((x) => has(x, '2.')); second = false; continue }
      if (has(b, '[Coda]') && !back) break
      out.push(i)
      if (back && has(b, '[Fine]')) break
      if (back && has(b, '[ToCoda]')) { i = c.bars.findIndex((x) => has(x, '[Coda]')); continue }
      if (b.close === ':||' && !back && !done.has(i)) { done.add(i); second = true; let s = i; while (s > 0 && c.bars[s].open !== '||:') s--; i = s; continue }
      if (c.jump && c.jump.after === i && !back) { back = true; i = c.jump.dc ? 0 : c.bars.findIndex((x) => has(x, '[Segno]')); continue }
      i++
    }
    return out
  }
  const heard = (c: ReturnType<typeof parse>, i: number): string => {
    let k = i
    while (chordsOf(c.bars[k])[0] === '%') k--
    return chordsOf(c.bars[k])[0]
  }
  const slots = (c: ReturnType<typeof parse>, b: RefBar) => {
    const t = chordsOf(b)
    if (t.includes('/')) return t
    return t.flatMap((x) => [x, ...Array(c.meter / t.length - 1).fill('/')])
  }

  it('every answer matches the chart as written, read with the usual rules', () => {
    const rand = seeded(139)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 80, rand)) {
        const c = parse(q.prompt!.chart!)
        const text = q.prompt!.text
        const ord = order(c)
        let want: string
        let m: RegExpMatchArray | null
        if (text === 'How many bars are written?') want = `${c.bars.length} bars`
        else if (text === 'How many bars do you play in all?') want = `${ord.length} bars`
        else if (text === 'How many beats are in each bar?') want = `${c.meter} beats`
        else if ((m = text.match(/^Which chord do you play in bar (\d+)\?$/))) want = heard(c, Number(m[1]) - 1)
        else if ((m = text.match(/^You start at bar 1\. What is the (\d+)\w\w bar you play\?$/))) want = heard(c, ord[Number(m[1]) - 1])
        else if ((m = text.match(/^In bar (\d+), how many beats does (\S+) get\?$/))) {
          const s = slots(c, c.bars[Number(m[1]) - 1])
          const start = s.indexOf(m[2])
          let n = 1
          while (s[start + n] === '/') n++
          want = `${n} beat${n === 1 ? '' : 's'}`
        } else if ((m = text.match(/^In bar (\d+), which chord do you play on beat (\d)\?$/))) {
          const s = slots(c, c.bars[Number(m[1]) - 1])
          let k = Number(m[2]) - 1
          while (s[k] === '/') k--
          want = s[k]
        } else throw new Error(`unknown question: ${text}`)
        expect(short(q.item), `level ${level.id}: ${text}\n${q.prompt!.chart}`).toBe(want)
        expect(q.choices!.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('shows a chart a band would recognise', () => {
    const q = buildQuestions(lesson, lesson.levels[4], 30, seeded(4))[0]
    expect(q.prompt!.chart).toMatch(/\|\|:/)
    expect(q.prompt!.chart).toMatch(/1\. \S+ :\|\|/)
    expect(q.prompt!.chart).toMatch(/2\. \S+/)
  })
})

describe('transposition', () => {
  const lesson = EXERCISES.transposition
  const short = (id: string) => lesson.items.find((i) => i.id === id)!.short
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const LETTERS = 'CDEFGAB'
  const pcOf = (label: string) => (NATURAL[label[0]] + [...label.slice(1)].reduce((s, ch) => s + (ch === '♯' ? 1 : ch === '♭' ? -1 : 0), 0) + 24) % 12
  /** Move a note name by letters and semitones, spelled by letter. */
  function move(name: string, letters: number, semis: number): string {
    const letter = LETTERS[(LETTERS.indexOf(name[0]) + letters + 7) % 7]
    const acc = ((((pcOf(name) + semis - NATURAL[letter]) % 12) + 18) % 12) - 6
    return letter + (acc > 0 ? '♯'.repeat(acc) : '♭'.repeat(-acc))
  }
  /** Transpose a chord symbol from one key to another: every note keeps its distance and its letter step from the key note. */
  function transpose(symbol: string, from: string, to: string): string {
    const letters = (LETTERS.indexOf(to[0]) - LETTERS.indexOf(from[0]) + 7) % 7
    const semis = (pcOf(to) - pcOf(from) + 12) % 12
    return symbol.replace(/[A-G][♯♭]*/g, (n) => move(n, letters, semis))
  }

  it('every answer is the right transposition, worked out independently', () => {
    const rand = seeded(149)
    for (const level of lesson.levels) {
      for (const q of buildQuestions(lesson, level, 80, rand)) {
        const t = q.prompt!.text
        let m: RegExpMatchArray | null
        let want: string
        if ((m = t.match(/^Move (\S+) (up|down) a whole step/))) {
          const [, chord, dir] = m
          want = chord.replace(/^[A-G][♯♭]*/, (n) => move(n, dir === 'up' ? 1 : -1, dir === 'up' ? 2 : -2))
        } else if ((m = t.match(/^(.+) is \S+ in (\S+) major\. In (\S+) major, what does (\S+) become\?$/))) {
          const [, chords, from, to, chord] = m
          expect(chords.split(' ')).toContain(chord)
          want = transpose(chord, from, to)
        } else if ((m = t.match(/^A guitarist plays (\S+)-shape chords with a capo on fret (\d)\. What key do you hear\?$/))) {
          want = short(q.item)
          expect(pcOf(want)).toBe((pcOf(m[1]) + Number(m[2])) % 12)
        } else if ((m = t.match(/^The song is in (\S+) major\. The guitarist puts a capo on fret (\d)\. Which chord shapes do they play\?$/))) {
          want = short(q.item)
          expect(pcOf(want)).toBe((pcOf(m[1]) - Number(m[2]) + 12) % 12)
          expect(['C', 'G', 'D', 'A', 'E']).toContain(want)
        } else throw new Error(`unknown question: ${t}`)
        expect(short(q.item), `level ${level.id}: ${t}`).toBe(want)
        // no two tiles that sound the same
        const sound = (s: string) => s.replace(/[A-G][♯♭]*/g, (n) => `<${pcOf(n)}>`)
        const sounds = q.choices!.map((c) => sound(short(c)))
        expect(new Set(sounds).size).toBe(sounds.length)
      }
    }
  })
})
