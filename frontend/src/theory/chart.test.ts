import { describe, expect, it } from 'vitest'
import { chartChords, chordLabel, guessKey, nashvilleLabel, parseChart, parseChord, romanLabel, transposeChart, CHORD_TYPES } from './chart'
import { zoneVoicing, ZONE } from './voicing'

describe('reading a typed chord chart', () => {
  it('reads every chord type, written the usual ways, with slash basses', () => {
    const cases: [string, number, string, number?][] = [
      ['C', 0, 'maj'], ['F#m', 6, 'min'], ['Bbmaj7', 10, 'maj7'], ['Ebm7', 3, 'm7'], ['G7', 7, '7'], ['Bdim', 11, 'dim'], ['Caug', 0, 'aug'],
      ['Dsus4', 2, 'sus4'], ['Dsus', 2, 'sus4'], ['Asus2', 9, 'sus2'], ['C6', 0, '6'], ['Am6', 9, 'm6'], ['Cadd9', 0, 'add9'], ['C2', 0, 'add9'],
      ['Bm7b5', 11, 'm7b5'], ['Bø', 11, 'm7b5'], ['C#dim7', 1, 'dim7'], ['D9', 2, '9'], ['Fmaj9', 5, 'maj9'], ['Em9', 4, 'm9'], ['A-7', 9, 'm7'], ['CΔ', 0, 'maj7'],
      ['G/B', 7, 'maj', 11], ['Am/G', 9, 'min', 7], ['D/F#', 2, 'maj', 6], ['C♯m', 1, 'min'],
    ]
    for (const [text, root, type, bass] of cases) expect(parseChord(text), text).toMatchObject({ rootPc: root, type, bassPc: bass })
  })

  it('splits sections, bars and chords, repeats bars with %, and reports what it cannot read', () => {
    const chart = parseChart('[Verse] C G/B | Am F | %\n\n[Chorus] F | G | Xyz C | Cmaj13')
    expect(chart.sections.map((s) => s.label)).toEqual(['Verse', 'Chorus'])
    expect(chart.sections[0].bars.map((b) => b.chords.map((c) => c.text).join(' '))).toEqual(['C G/B', 'Am F', 'Am F'])
    expect(chart.sections[1].bars.map((b) => b.chords.map((c) => c.text).join(' '))).toEqual(['F', 'G', 'C'])
    expect(chart.errors.map((e) => [e.line, e.token])).toEqual([[3, 'Xyz'], [3, 'Cmaj13']])
  })

  it('transposes every chord in all twelve keys and spells it in the new key', () => {
    const chart = parseChart('C G/B Am F')
    for (let k = 0; k < 12; k++) {
      const t = transposeChart(chart, k)
      expect(chartChords(t).map((c) => c.rootPc)).toEqual([0, 7, 9, 5].map((x) => (x + k) % 12))
      expect(chartChords(t)[1].bassPc).toBe((11 + k) % 12)
    }
    const inD = transposeChart(chart, 2)
    expect(chartChords(inD).map((c) => chordLabel(c, 2))).toEqual(['D', 'A/C♯', 'Bm', 'G'])
    const inEb = transposeChart(chart, 3)
    expect(chartChords(inEb).map((c) => chordLabel(c, 3))).toEqual(['E♭', 'B♭/D', 'Cm', 'A♭'])
  })

  it('guesses the key of common progressions', () => {
    const key = (t: string) => guessKey(chartChords(parseChart(t)))
    expect(key('C G Am F')).toBe(0)
    expect(key('G D Em C')).toBe(7)
    expect(key('Am F C G')).toBe(0) // vi IV I V
    expect(key('Dm7 G7 Cmaj7')).toBe(0)
    expect(key('Bb F Gm Eb')).toBe(10)
    expect(key('E B C#m A')).toBe(4)
  })

  it('writes numbers the Nashville way and numerals the Roman way', () => {
    const cs = chartChords(parseChart('G D/F# | Em7 C | Bb'))
    expect(cs.map((c) => nashvilleLabel(c, 7))).toEqual(['1', '5/7', '6-7', '4', '♭3'])
    expect(cs.map((c) => romanLabel(c, 7))).toEqual(['I', 'V/F♯', 'vi7', 'IV', '♭III'])
  })
})

describe('the chord zone', () => {
  it('puts every chord on every root in the right hand between the two Fs, with all its notes', () => {
    for (const type of Object.keys(CHORD_TYPES)) {
      for (let root = 0; root < 12; root++) {
        const v = zoneVoicing({ rootPc: root, type, text: '' })
        const wanted = new Set(CHORD_TYPES[type].stack.map((s) => (root + s) % 12))
        if (CHORD_TYPES[type].stack.length > 4) wanted.delete((root + 7) % 12) // the 5th of a 9th chord is left out
        expect(Math.min(...v.right), `${type} on ${root}`).toBeGreaterThanOrEqual(ZONE[0])
        expect(Math.max(...v.right), `${type} on ${root}`).toBeLessThanOrEqual(ZONE[1])
        expect(new Set(v.right.map((m) => m % 12))).toEqual(wanted)
        expect(v.left % 12).toBe(root)
        expect(v.left).toBeLessThan(ZONE[0])
      }
    }
  })
  it('gives the slash note to the left hand', () => {
    expect(zoneVoicing({ rootPc: 7, type: 'maj', bassPc: 11, text: 'G/B' }).left % 12).toBe(11)
  })
})
