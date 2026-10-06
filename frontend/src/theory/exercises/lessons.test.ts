import { describe, expect, it } from 'vitest'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../notes'
import { eventsFor } from '../playback'
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
