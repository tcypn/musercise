import { describe, expect, it } from 'vitest'
import {
  arpeggioSections,
  cadenceSections,
  daysSinceEpoch,
  keyForDate,
  localDateString,
  PRACTICE_ITEMS,
  ROUTINE,
  ROUTINE_MINUTES,
  scaleSections,
  sectionSeconds,
  sectionsFor,
  toTimed,
  warmupBars,
  warmupSections,
  type Section,
} from './practice'
import {
  getKey,
  HARMONIC_MINOR_SCALE,
  KEYS_BY_FIFTHS,
  labels,
  MAJOR_SCALE,
  NATURAL_MINOR_SCALE,
  noteLabel,
  relativeMinorTonic,
  signatureOf,
  spellFrom,
  tonicMidi,
} from './spelling'

const key = (id: string) => getKey(id)!

describe('spelling', () => {
  it('has the real key signature for each of the 12 major keys', () => {
    const expected: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F♯': 6, 'D♭': -5, 'A♭': -4, 'E♭': -3, 'B♭': -2, F: -1 }
    for (const k of KEYS_BY_FIFTHS) expect(signatureOf(k), k.id).toBe(expected[k.id])
    expect(KEYS_BY_FIFTHS.map((k) => k.id)).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'])
  })

  it('spells major scales with each letter once, in the way a musician writes them', () => {
    const spell = (id: string) => labels(spellFrom(key(id).tonic, MAJOR_SCALE)).join(' ')
    expect(spell('F♯')).toBe('F♯ G♯ A♯ B C♯ D♯ E♯')
    expect(spell('D♭')).toBe('D♭ E♭ F G♭ A♭ B♭ C')
    expect(spell('B')).toBe('B C♯ D♯ E F♯ G♯ A♯')
    expect(spell('F')).toBe('F G A B♭ C D E')
    for (const k of KEYS_BY_FIFTHS) {
      const letters = spellFrom(k.tonic, MAJOR_SCALE).map((n) => n.letter)
      expect(new Set(letters).size, k.id).toBe(7)
    }
  })

  it('finds the relative minor on the sixth degree and spells its scales', () => {
    const pairs: Record<string, string> = { C: 'A', G: 'E', D: 'B', A: 'F♯', E: 'C♯', B: 'G♯', 'F♯': 'D♯', 'D♭': 'B♭', 'A♭': 'F', 'E♭': 'C', 'B♭': 'G', F: 'D' }
    for (const k of KEYS_BY_FIFTHS) expect(noteLabel(relativeMinorTonic(k)), k.id).toBe(pairs[k.id])
    const natural = (id: string) => labels(spellFrom(relativeMinorTonic(key(id)), NATURAL_MINOR_SCALE)).join(' ')
    const harmonic = (id: string) => labels(spellFrom(relativeMinorTonic(key(id)), HARMONIC_MINOR_SCALE)).join(' ')
    expect(natural('D♭')).toBe('B♭ C D♭ E♭ F G♭ A♭')
    expect(harmonic('D♭')).toBe('B♭ C D♭ E♭ F G♭ A')
    expect(harmonic('B')).toBe('G♯ A♯ B C♯ D♯ E F♯♯') // a double sharp is the correct spelling here
    expect(harmonic('F♯')).toBe('D♯ E♯ F♯ G♯ A♯ B C♯♯')
  })

  it('puts every tonic between C4 and B4', () => {
    for (const k of KEYS_BY_FIFTHS) {
      expect(tonicMidi(k.tonic)).toBeGreaterThanOrEqual(60)
      expect(tonicMidi(k.tonic)).toBeLessThanOrEqual(71)
    }
    expect(tonicMidi(key('C').tonic)).toBe(60)
    expect(tonicMidi(key('D').tonic)).toBe(62)
  })
})

describe('key of the day', () => {
  it('counts days from 1970-01-01', () => {
    expect(daysSinceEpoch('1970-01-01')).toBe(0)
    expect(daysSinceEpoch('1970-01-02')).toBe(1)
    expect(daysSinceEpoch('2026-09-30')).toBe(20_726)
  })

  it('moves one step round the circle of fifths each day and covers all 12 keys in 12 days', () => {
    const days = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
    const keys = days.map((d) => keyForDate(d).id)
    expect(new Set(keys).size).toBe(12)
    const start = KEYS_BY_FIFTHS.findIndex((k) => k.id === keys[0])
    keys.forEach((id, i) => expect(id).toBe(KEYS_BY_FIFTHS[(start + i) % 12].id))
    expect(keyForDate('2026-10-13').id).toBe(keys[0]) // and round again
  })

  it('does not depend on the time zone: the same date string gives the same key', () => {
    expect(keyForDate('2026-03-08').id).toBe(keyForDate('2026-03-08').id)
    expect(keyForDate('2026-03-31').id).not.toBe(keyForDate('2026-04-01').id)
  })

  it('formats the local date as YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 8, 5, 23, 59))).toBe('2026-09-05')
    expect(localDateString(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })
})

describe('routine', () => {
  it('is 30 minutes across the seven rows the server knows', () => {
    expect(ROUTINE_MINUTES).toBe(30)
    expect(ROUTINE.map((r) => r.id)).toEqual(['warmup', 'scale', 'arpeggio', 'cadence', 'ear', 'repertoire', 'sightreading'])
    expect([...PRACTICE_ITEMS]).toEqual(ROUTINE.map((r) => r.id))
    expect(ROUTINE.filter((r) => r.kind === 'notes').map((r) => r.minutes)).toEqual([5, 5, 4, 4])
  })
})

const allSections = (id: string): Section[] => {
  const k = key(id)
  return [...warmupSections(k), ...scaleSections(k), ...arpeggioSections(k), ...cadenceSections(k)]
}

describe('material for every key', () => {
  it('stays on the piano and plays in order', () => {
    for (const k of KEYS_BY_FIFTHS) {
      for (const section of allSections(k.id)) {
        let previous = -1
        for (const e of section.events) {
          expect(e.beat, `${k.id} ${section.id}`).toBeGreaterThanOrEqual(previous)
          previous = e.beat
          expect(e.beats).toBeGreaterThan(0)
          for (const n of e.notes) {
            expect(n, `${k.id} ${section.id}`).toBeGreaterThanOrEqual(21)
            expect(n, `${k.id} ${section.id}`).toBeLessThanOrEqual(108)
          }
        }
        expect(section.lines.length).toBeGreaterThan(0)
        expect(sectionSeconds(section, 60)).toBeGreaterThan(0)
      }
    }
  })

  it('never shows an impossible note name', () => {
    for (const k of KEYS_BY_FIFTHS) {
      const text = allSections(k.id).flatMap((s) => [s.heading, ...s.lines]).join(' ')
      expect(text).not.toMatch(/undefined|NaN|♯♯♯|♭♭♭/)
    }
  })
})

describe('warm-up pattern', () => {
  it('follows the pattern: each bar starts one scale step higher', () => {
    const c = warmupSections(key('C'))[0]
    expect(c.lines[0]).toBe('Bar 1: C E F G A G F E')
    expect(c.lines[1]).toBe('Bar 2: D F G A B A G F')
    const { up, down } = warmupBars()
    expect(up).toHaveLength(8)
    expect(down).toHaveLength(8)
    expect(up[0]).toEqual([0, 2, 3, 4, 5, 4, 3, 2])
    expect(up[7]).toEqual([7, 9, 10, 11, 12, 11, 10, 9])
    expect(down[0]).toEqual([12, 10, 9, 8, 7, 8, 9, 10]) // the mirror image, from the top
    expect(down[7]).toEqual([5, 3, 2, 1, 0, 1, 2, 3])
  })

  it('plays bar 1 in C as the right notes, with the left hand an octave lower', () => {
    const events = warmupSections(key('C'))[0].events
    expect(events).toHaveLength(16 * 8)
    expect(events.slice(0, 8).map((e) => e.notes[0])).toEqual([60, 64, 65, 67, 69, 67, 65, 64])
    expect(events.slice(0, 8).map((e) => e.notes[1])).toEqual([48, 52, 53, 55, 57, 55, 53, 52])
    expect(events[8].notes[0]).toBe(62) // bar 2 starts on D
  })

  it('uses the key signature: F♯ major bar 1 is F♯ A♯ B C♯ D♯ C♯ B A♯', () => {
    expect(warmupSections(key('F♯'))[0].lines[0]).toBe('Bar 1: F♯ A♯ B C♯ D♯ C♯ B A♯')
  })
})

describe('scales', () => {
  it('play the right pitches for each scale, up two octaves and back', () => {
    const major = [0, 2, 4, 5, 7, 9, 11]
    const natural = [0, 2, 3, 5, 7, 8, 10]
    const harmonic = [0, 2, 3, 5, 7, 8, 11]
    for (const k of KEYS_BY_FIFTHS) {
      const [maj, nat, har] = scaleSections(k)
      const minorTonic = tonicMidi(relativeMinorTonic(k))
      const expectUp = (s: Section, tonic: number, formula: number[]) => {
        const up = s.events.slice(0, 15).map((e) => e.notes[0])
        const want = Array.from({ length: 15 }, (_, n) => tonic + formula[n % 7] + 12 * Math.floor(n / 7))
        expect(up, `${k.id} ${s.id}`).toEqual(want)
        const all = s.events.map((e) => e.notes[0])
        expect(all).toHaveLength(29)
        expect(all.slice(14)).toEqual([...want].reverse()) // turns round at the top and comes back
      }
      expectUp(maj, tonicMidi(k.tonic), major)
      expectUp(nat, minorTonic, natural)
      expectUp(har, minorTonic, harmonic)
    }
  })

  it('labels them correctly, e.g. B harmonic minor spelled with F♯♯', () => {
    const [, , harmonic] = scaleSections(key('B'))
    expect(harmonic.heading).toBe('G♯ harmonic minor')
    expect(harmonic.lines[0]).toBe('G♯ A♯ B C♯ D♯ E F♯♯ G♯')
  })
})

describe('arpeggios', () => {
  it('start on the right chord tone and climb two octaves', () => {
    const sections = arpeggioSections(key('C'))
    expect(sections.map((s) => s.id)).toEqual(['major-0', 'major-1', 'major-2', 'minor-0', 'minor-1', 'minor-2'])
    const up = (s: Section) => s.events.slice(0, 7).map((e) => e.notes[0])
    expect(up(sections[0])).toEqual([60, 64, 67, 72, 76, 79, 84]) // C E G C E G C
    expect(up(sections[1])).toEqual([64, 67, 72, 76, 79, 84, 88]) // starts on the third
    expect(up(sections[2])).toEqual([67, 72, 76, 79, 84, 88, 91]) // starts on the fifth
    expect(up(sections[3])).toEqual([69, 72, 76, 81, 84, 88, 93]) // A minor: A C E A C E A
    expect(sections[3].heading).toBe('A minor, root position')
    expect(sections[1].lines[0]).toContain('E G C E')
    expect(sections[0].events).toHaveLength(13) // up 7, back down 6
  })

  it('spell the notes for awkward keys', () => {
    const fSharp = arpeggioSections(key('F♯'))
    expect(fSharp[0].lines[0]).toContain('F♯ A♯ C♯')
    expect(fSharp[3].heading).toContain('D♯ minor')
    expect(fSharp[3].lines[0]).toContain('D♯ F♯ A♯')
    expect(arpeggioSections(key('D♭'))[3].lines[0]).toContain('B♭ D♭ F')
  })
})

describe('cadence', () => {
  it('links the chords through common notes so the hand hardly moves', () => {
    for (const k of KEYS_BY_FIFTHS) {
      for (const section of cadenceSections(k)) {
        const hands = section.events.map((e) => e.notes.slice(1)) // right hand; note 0 is the bass
        expect(hands).toHaveLength(5)
        for (let i = 1; i < hands.length; i++) {
          const shared = hands[i].filter((n) => hands[i - 1].includes(n))
          expect(shared.length, `${k.id} ${section.id} chord ${i}`).toBeGreaterThanOrEqual(1)
          const span = Math.max(...hands[i]) - Math.min(...hands[i])
          expect(span).toBeLessThanOrEqual(9)
        }
        for (const bass of section.events.map((e) => e.notes[0])) expect(bass).toBeLessThan(hands[0][0])
      }
    }
  })

  it('spells the chords: D major, and the double sharp in D♯ minor', () => {
    const [major, minor] = cadenceSections(key('D'))
    expect(major.heading).toBe('D major: I, IV, I, V, I')
    expect(major.lines).toEqual([
      'I: left hand D, right hand D F♯ A',
      'IV: left hand G, right hand D G B',
      'I: left hand D, right hand D F♯ A',
      'V: left hand A, right hand C♯ E A',
      'I: left hand D, right hand D F♯ A',
    ])
    expect(minor.heading).toBe('B minor: i, iv, i, V, i')
    expect(minor.lines[1]).toBe('iv: left hand E, right hand B E G')
    expect(minor.lines[3]).toBe('V: left hand F♯, right hand A♯ C♯ F♯')
    const dSharpMinor = cadenceSections(key('F♯'))[1]
    expect(dSharpMinor.lines[3]).toBe('V: left hand A♯, right hand C♯♯ E♯ A♯')
  })

  it('plays right-hand notes that agree with the spelled names', () => {
    const [major] = cadenceSections(key('C'))
    expect(major.events.map((e) => e.notes.slice(1))).toEqual([
      [60, 64, 67], [60, 65, 69], [60, 64, 67], [59, 62, 67], [60, 64, 67],
    ])
    expect(major.events.map((e) => e.notes[0])).toEqual([36, 41, 36, 43, 36]) // C, F, C, G, C in the bass
  })
})

describe('sectionsFor and timing', () => {
  it('has material for the four note rows and none for the rest', () => {
    const k = key('G')
    for (const id of ['warmup', 'scale', 'arpeggio', 'cadence'] as const) expect(sectionsFor(id, k).length).toBeGreaterThan(0)
    for (const id of ['ear', 'repertoire', 'sightreading'] as const) expect(sectionsFor(id, k)).toEqual([])
  })

  it('turns beats into seconds at the chosen tempo', () => {
    const events = [{ beat: 0, beats: 0.5, notes: [60] }, { beat: 2, beats: 2, notes: [60, 64] }]
    const slow = toTimed(events, 60)
    expect(slow.map((e) => e.time)).toEqual([0, 2])
    const fast = toTimed(events, 120)
    expect(fast.map((e) => e.time)).toEqual([0, 1])
    for (const e of [...slow, ...fast]) expect(e.hold).toBeGreaterThanOrEqual(0.6)
    const section: Section = { id: 'x', heading: 'x', lines: ['x'], events }
    expect(sectionSeconds(section, 60)).toBe(4)
    expect(sectionSeconds(section, 120)).toBe(2)
  })
})
