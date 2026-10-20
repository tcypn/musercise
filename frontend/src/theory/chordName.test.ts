import { describe, expect, it } from 'vitest'
import { nameChord } from './chordName'

// Independent: the usual chord recipes, and the names a chord chart uses with no key.
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const RECIPES: [string, number[]][] = [['', [0, 4, 7]], ['m', [0, 3, 7]], ['dim', [0, 3, 6]], ['7', [0, 4, 7, 10]], ['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]], ['m7♭5', [0, 3, 6, 10]]]
const POSITION = ['root position', '1st inversion', '2nd inversion', '3rd inversion']

describe('naming what is held', () => {
  it('names every triad and 7th chord on every root, in every inversion, with the bass after a slash', () => {
    for (let root = 0; root < 12; root++) {
      for (const [suffix, recipe] of RECIPES) {
        for (let inv = 0; inv < recipe.length; inv++) {
          // stack the chord from the inversion's bass upward, around middle C
          const tones = [...recipe.slice(inv), ...recipe.slice(0, inv).map((x) => x + 12)]
          const midis = tones.map((x) => 48 + root + x)
          const bassName = NAMES[(root + recipe[inv]) % 12]
          const r = nameChord(midis)
          // m7 and m7♭5 with the 3rd in the bass are also 6 and m6 chords on that bass (E♭ G B♭ C = Cm7/E♭ = E♭6):
          // the name with its root in the bass is given, in root position
          const sixth = inv === 1 && (suffix === 'm7' || suffix === 'm7♭5') ? `${bassName}${suffix === 'm7' ? '6' : 'm6'}` : null
          if (sixth) {
            expect(r).toMatchObject({ symbol: sixth, detail: 'root position' })
            continue
          }
          expect(r.symbol, `${NAMES[root]}${suffix} inv ${inv}`).toBe(inv === 0 ? `${NAMES[root]}${suffix}` : `${NAMES[root]}${suffix}/${bassName}`)
          expect(r.detail).toBe(POSITION[inv])
        }
      }
    }
  })

  it('reads spread voicings and doubled notes the same way', () => {
    expect(nameChord([36, 43, 48, 52, 55, 60]).symbol).toBe('C') // C G C E G C
    expect(nameChord([45, 60, 64, 67]).symbol).toBe('Am7') // A low, C E G above
    expect(nameChord([40, 55, 60]).symbol).toBe('C/E')
  })

  it('names one note, octaves and two-note intervals', () => {
    expect(nameChord([60])).toMatchObject({ symbol: 'C', detail: '' })
    expect(nameChord([48, 60])).toMatchObject({ symbol: 'C', detail: 'octaves' })
    expect(nameChord([60, 64]).symbol).toBe('major 3rd')
    expect(nameChord([64, 72]).symbol).toBe('minor 6th')
    expect(nameChord([60, 66]).symbol).toBe('tritone')
  })

  it('knows sus, 6, add9 and 9th chords, and says when nothing fits', () => {
    expect(nameChord([60, 65, 67]).symbol).toBe('Csus4')
    expect(nameChord([60, 62, 67]).symbol).toBe('Csus2')
    expect(nameChord([60, 64, 67, 69]).symbol).toBe('C6') // the bass decides: C6, not Am7/C
    expect(nameChord([57, 60, 64, 67]).symbol).toBe('Am7')
    expect(nameChord([60, 62, 64, 67]).symbol).toBe('Cadd9')
    expect(nameChord([48, 64, 67, 70, 74]).symbol).toBe('C9')
    expect(nameChord([60, 61, 62]).symbol).toBe('no chord name')
    expect(nameChord([]).symbol).toBe('')
  })

  it('gives the numeral in a key and spells roots the key\'s way', () => {
    expect(nameChord([57, 60, 64, 67], 0).numeral).toBe('vi7 in C major')
    expect(nameChord([55, 59, 62, 65], 0).numeral).toBe('V7 in C major')
    expect(nameChord([59, 62, 65], 0).numeral).toBe('vii° in C major')
    expect(nameChord([56, 60, 63], 0).numeral).toBe('♭VI in C major')
    expect(nameChord([54, 58, 61], 6).symbol).toBe('F♯') // in F♯ major
    expect(nameChord([54, 58, 61], 1).symbol).toBe('G♭') // in D♭ major
  })
})
