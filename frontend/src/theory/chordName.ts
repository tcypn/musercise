import { keyLabel } from './harmony'
import { MAJOR_SCALE, noteLabel, spellFrom } from './spelling'

/**
 * Names whatever is held on the keyboard: a chord symbol (with its inversion when the bass is not the root),
 * an interval for two notes, or the note itself. With a key, chord roots are spelled in the key and the
 * chord gets its numeral.
 */

/** Chord types as semitones above the root, most common first: when one set of notes fits two names, the first wins. */
const TYPES: readonly { suffix: string; set: readonly number[]; quality: 'major' | 'minor' | 'dim' | 'aug' | 'sus' }[] = [
  { suffix: '', set: [0, 4, 7], quality: 'major' },
  { suffix: 'm', set: [0, 3, 7], quality: 'minor' },
  { suffix: '7', set: [0, 4, 7, 10], quality: 'major' },
  { suffix: 'm7', set: [0, 3, 7, 10], quality: 'minor' },
  { suffix: 'maj7', set: [0, 4, 7, 11], quality: 'major' },
  { suffix: 'dim', set: [0, 3, 6], quality: 'dim' },
  { suffix: 'm7♭5', set: [0, 3, 6, 10], quality: 'dim' },
  { suffix: 'dim7', set: [0, 3, 6, 9], quality: 'dim' },
  { suffix: 'sus4', set: [0, 5, 7], quality: 'sus' },
  { suffix: 'sus2', set: [0, 2, 7], quality: 'sus' },
  { suffix: '7sus4', set: [0, 5, 7, 10], quality: 'sus' },
  { suffix: 'aug', set: [0, 4, 8], quality: 'aug' },
  { suffix: '6', set: [0, 4, 7, 9], quality: 'major' },
  { suffix: 'm6', set: [0, 3, 7, 9], quality: 'minor' },
  { suffix: 'add9', set: [0, 2, 4, 7], quality: 'major' },
  { suffix: 'm(add9)', set: [0, 2, 3, 7], quality: 'minor' },
  { suffix: 'mMaj7', set: [0, 3, 7, 11], quality: 'minor' },
  { suffix: 'maj9', set: [0, 2, 4, 7, 11], quality: 'major' },
  { suffix: '9', set: [0, 2, 4, 7, 10], quality: 'major' },
  { suffix: 'm9', set: [0, 2, 3, 7, 10], quality: 'minor' },
  // Pianists often leave out the 5th of a 7th chord.
  { suffix: '7', set: [0, 4, 10], quality: 'major' },
  { suffix: 'm7', set: [0, 3, 10], quality: 'minor' },
  { suffix: 'maj7', set: [0, 4, 11], quality: 'major' },
]

const INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th']
const DEFAULT_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const MAJOR_PCS = [0, 2, 4, 5, 7, 9, 11]
/** Chromatic roots in a major key, named the way chord charts usually do. */
const CHROMATIC: Record<number, string> = { 1: '♭II', 3: '♭III', 6: '♯IV', 8: '♭VI', 10: '♭VII' }

export interface ChordReading {
  /** "Am7", "C/E", "major 3rd", "E" or "no chord name". */
  symbol: string
  /** "1st inversion", "root position" and so on, or "" when it does not apply. */
  detail: string
  /** "vi7 in C", when a key is given and a chord was found. */
  numeral?: string
  /** The held notes, lowest first, spelled. */
  notes: string[]
}

/** Spells pitch classes: in the key when one is given (scale notes as the key spells them), otherwise the usual names. */
function namer(keyPc: number | null): (pc: number) => string {
  if (keyPc === null) return (pc) => DEFAULT_NAMES[pc]
  const { tonic } = keyLabel(keyPc, 'major')
  const scale = new Map(spellFrom(tonic, MAJOR_SCALE).map((n, i) => [(keyPc + MAJOR_PCS[i]) % 12, noteLabel(n)]))
  return (pc) => scale.get(pc) ?? DEFAULT_NAMES[pc]
}

const INVERSION = ['root position', '1st inversion', '2nd inversion', '3rd inversion']

export function nameChord(midis: readonly number[], keyPc: number | null = null): ChordReading {
  const sorted = [...new Set(midis)].sort((a, b) => a - b)
  const name = namer(keyPc)
  const notes = sorted.map((m) => name(m % 12))
  if (sorted.length === 0) return { symbol: '', detail: '', notes }
  const pcs = [...new Set(sorted.map((m) => m % 12))]
  if (pcs.length === 1) return { symbol: name(pcs[0]), detail: sorted.length > 1 ? 'octaves' : '', notes }
  if (pcs.length === 2) {
    const [low, high] = sorted.length === 2 ? sorted : [sorted[0], sorted.find((m) => m % 12 !== sorted[0] % 12)!]
    return { symbol: INTERVALS[(high - low) % 12], detail: `${name(low % 12)} up to ${name(high % 12)}`, notes }
  }
  const bass = sorted[0] % 12
  const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x) => b.includes(x))
  // Every way the notes fit a chord type: the bass as root first, then the table's order.
  const fits = TYPES.flatMap((t, order) => pcs.filter((root) => same(pcs.map((pc) => (pc - root + 12) % 12), t.set)).map((root) => ({ t, root, order })))
  if (fits.length === 0) return { symbol: 'no chord name', detail: '', notes }
  fits.sort((a, b) => Number(b.root === bass) - Number(a.root === bass) || a.order - b.order)
  const { t, root } = fits[0]
  const symbol = `${name(root)}${t.suffix}`
  const fromRoot = (bass - root + 12) % 12
  // Which chord tone is in the bass: 3rd, 5th or 7th give the inversions; anything else is just a slash chord.
  const tone = fromRoot === 0 ? 0 : [3, 4].includes(fromRoot) ? 1 : [6, 7, 8].includes(fromRoot) ? 2 : [9, 10, 11].includes(fromRoot) && t.set.length >= 4 ? 3 : -1
  const reading: ChordReading = {
    symbol: fromRoot === 0 ? symbol : `${symbol}/${name(bass)}`,
    detail: tone >= 0 && t.quality !== 'sus' ? INVERSION[tone] : '',
    notes,
  }
  if (keyPc !== null) {
    const rel = (root - keyPc + 12) % 12
    const degree = MAJOR_PCS.indexOf(rel)
    const base = degree >= 0 ? ROMAN[degree] : CHROMATIC[rel] ?? ''
    if (base) {
      const lower = t.quality === 'minor' || t.quality === 'dim'
      const numeral = lower ? base.replace(/[IV]+/, (r) => r.toLowerCase()) : base
      const suffix = t.suffix === 'm' ? '' : t.suffix === 'dim' ? '°' : t.suffix === 'm7♭5' ? 'ø7' : t.suffix.replace(/^m(?!aj)/, '')
      reading.numeral = `${numeral}${suffix} in ${keyLabel(keyPc, 'major').label}`
    }
  }
  return reading
}
