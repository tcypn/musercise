import { keyLabel } from './harmony'
import { MAJOR_SCALE, noteLabel, spellFrom } from './spelling'

/*
 * A chord chart typed as text, one section per line:
 *   [Verse] C G/B | Am F | C G | F
 * "|" separates bars, spaces separate chords inside a bar (up to four, sharing its beats), "%" repeats the bar before.
 */

/** Chord types: semitones above the root, and how the type is written after the root. */
export const CHORD_TYPES: Record<string, { stack: readonly number[]; suffix: string }> = {
  maj: { stack: [0, 4, 7], suffix: '' },
  min: { stack: [0, 3, 7], suffix: 'm' },
  dim: { stack: [0, 3, 6], suffix: 'dim' },
  aug: { stack: [0, 4, 8], suffix: 'aug' },
  sus2: { stack: [0, 2, 7], suffix: 'sus2' },
  sus4: { stack: [0, 5, 7], suffix: 'sus4' },
  '6': { stack: [0, 4, 7, 9], suffix: '6' },
  m6: { stack: [0, 3, 7, 9], suffix: 'm6' },
  add9: { stack: [0, 4, 7, 14], suffix: 'add9' },
  '7': { stack: [0, 4, 7, 10], suffix: '7' },
  maj7: { stack: [0, 4, 7, 11], suffix: 'maj7' },
  m7: { stack: [0, 3, 7, 10], suffix: 'm7' },
  m7b5: { stack: [0, 3, 6, 10], suffix: 'm7♭5' },
  dim7: { stack: [0, 3, 6, 9], suffix: 'dim7' },
  '9': { stack: [0, 4, 7, 10, 14], suffix: '9' },
  maj9: { stack: [0, 4, 7, 11, 14], suffix: 'maj9' },
  m9: { stack: [0, 3, 7, 10, 14], suffix: 'm9' },
}

/** Ways people write each type after the root. */
const SUFFIXES: [string, string][] = [
  ['', 'maj'], ['maj', 'maj'], ['M', 'maj'], ['m', 'min'], ['min', 'min'], ['-', 'min'],
  ['dim', 'dim'], ['°', 'dim'], ['o', 'dim'], ['aug', 'aug'], ['+', 'aug'],
  ['sus2', 'sus2'], ['sus4', 'sus4'], ['sus', 'sus4'], ['6', '6'], ['m6', 'm6'], ['add9', 'add9'], ['add2', 'add9'], ['2', 'add9'],
  ['7', '7'], ['maj7', 'maj7'], ['M7', 'maj7'], ['Δ', 'maj7'], ['Δ7', 'maj7'], ['m7', 'm7'], ['min7', 'm7'], ['-7', 'm7'],
  ['m7b5', 'm7b5'], ['m7♭5', 'm7b5'], ['ø', 'm7b5'], ['ø7', 'm7b5'], ['dim7', 'dim7'], ['°7', 'dim7'], ['o7', 'dim7'],
  ['9', '9'], ['maj9', 'maj9'], ['M9', 'maj9'], ['m9', 'm9'], ['min9', 'm9'], ['-9', 'm9'],
]
const SUFFIX_TYPE = new Map(SUFFIXES)

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export interface ChordSym {
  rootPc: number
  type: string
  /** A different bass note, for slash chords. */
  bassPc?: number
  /** As typed, for the editor. */
  text: string
}
export interface ChartBar { chords: ChordSym[] }
export interface ChartSection { label: string; bars: ChartBar[] }
export interface ChartError { line: number; token: string; message: string }
export interface Chart { sections: ChartSection[]; errors: ChartError[] }

function notePc(s: string): number | null {
  const m = s.match(/^([A-G])([#♯b♭]?)$/)
  if (!m) return null
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0
  return (LETTER_PC[m[1]] + acc + 12) % 12
}

/** One chord symbol ("F#m7", "G/B", "Bbmaj7"), or a reason it cannot be read. */
export function parseChord(token: string): ChordSym | string {
  const m = token.match(/^([A-G][#♯b♭]?)([^/]*)(?:\/([A-G][#♯b♭]?))?$/)
  if (!m) return 'A chord starts with a capital letter A to G'
  const rootPc = notePc(m[1])!
  const type = SUFFIX_TYPE.get(m[2])
  if (!type) return `"${m[2]}" is not a chord type this page knows`
  const bassPc = m[3] ? notePc(m[3])! : undefined
  return { rootPc, type, bassPc: bassPc === rootPc ? undefined : bassPc, text: token }
}

export function parseChart(text: string): Chart {
  const sections: ChartSection[] = []
  const errors: ChartError[] = []
  text.split('\n').forEach((raw, i) => {
    let line = raw.trim()
    if (!line) return
    let label = ''
    const head = line.match(/^\[([^\]]*)\]\s*/)
    if (head) {
      label = head[1].trim()
      line = line.slice(head[0].length)
    }
    const bars: ChartBar[] = []
    for (const cell of line.split('|')) {
      const tokens = cell.trim().split(/\s+/).filter(Boolean)
      if (tokens.length === 0) continue
      if (tokens.length === 1 && tokens[0] === '%') {
        const before = bars[bars.length - 1] ?? sections[sections.length - 1]?.bars.at(-1)
        if (before) bars.push({ chords: [...before.chords] })
        else errors.push({ line: i + 1, token: '%', message: 'There is no bar before to repeat' })
        continue
      }
      if (tokens.length > 4) errors.push({ line: i + 1, token: tokens.join(' '), message: 'At most four chords in a bar' })
      const chords: ChordSym[] = []
      for (const t of tokens.slice(0, 4)) {
        const c = parseChord(t)
        if (typeof c === 'string') errors.push({ line: i + 1, token: t, message: c })
        else chords.push(c)
      }
      if (chords.length) bars.push({ chords })
    }
    if (bars.length) sections.push({ label: label || `Line ${sections.length + 1}`, bars })
  })
  return { sections, errors }
}

export const chartChords = (chart: Chart): ChordSym[] => chart.sections.flatMap((s) => s.bars.flatMap((b) => b.chords))

/** Every chord moved by `semis` half steps. */
export function transposeChart(chart: Chart, semis: number): Chart {
  const t = (pc: number) => (((pc + semis) % 12) + 12) % 12
  return {
    errors: chart.errors,
    sections: chart.sections.map((s) => ({ ...s, bars: s.bars.map((b) => ({ chords: b.chords.map((c) => ({ ...c, rootPc: t(c.rootPc), bassPc: c.bassPc === undefined ? undefined : t(c.bassPc) })) })) })),
  }
}

const MAJOR_PCS = [0, 2, 4, 5, 7, 9, 11]
/** The triad each scale step of a major key carries. */
const DIATONIC = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']
const family = (type: string) => (['min', 'm7', 'm6', 'm9'].includes(type) ? 'min' : ['dim', 'm7b5', 'dim7'].includes(type) ? 'dim' : 'maj')

/** The major key the chords most likely come from: chords that belong to it score, and starting or ending on I scores extra. */
export function guessKey(chords: readonly ChordSym[]): number {
  if (chords.length === 0) return 0
  let best = 0
  let bestScore = -Infinity
  for (let key = 0; key < 12; key++) {
    let score = 0
    for (const c of chords) {
      const step = MAJOR_PCS.indexOf((c.rootPc - key + 12) % 12)
      if (step >= 0 && DIATONIC[step] === family(c.type)) score += 2
      else if (step >= 0) score += 0.5
    }
    const isI = (c: ChordSym) => c.rootPc === key && family(c.type) === 'maj'
    if (isI(chords[0])) score += 3
    if (isI(chords[chords.length - 1])) score += 2
    if (score > bestScore) {
      bestScore = score
      best = key
    }
  }
  return best
}

const FLAT_KEYS = [5, 10, 3, 8, 1, 6]
/** A note's name in a key: the key's own spelling for its scale notes, sharps or flats to match the key otherwise. */
export function noteNameIn(pc: number, keyPc: number): string {
  const { tonic } = keyLabel(keyPc, 'major')
  const scale = spellFrom(tonic, MAJOR_SCALE)
  const i = MAJOR_PCS.indexOf((pc - keyPc + 12) % 12)
  if (i >= 0) return noteLabel(scale[i])
  return (FLAT_KEYS.includes(keyPc) ? ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] : ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'])[pc]
}

export const chordLabel = (c: ChordSym, keyPc: number) => `${noteNameIn(c.rootPc, keyPc)}${CHORD_TYPES[c.type].suffix}${c.bassPc === undefined ? '' : `/${noteNameIn(c.bassPc, keyPc)}`}`

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const CHROMATIC: Record<number, [string, number]> = { 1: ['♭', 1], 3: ['♭', 2], 6: ['♯', 3], 8: ['♭', 5], 10: ['♭', 6] }

/** Nashville number: the scale step, "-" for minor, then the rest of the type ("6-", "57", "4/5"). */
export function nashvilleLabel(c: ChordSym, keyPc: number): string {
  const num = (pc: number) => {
    const rel = (pc - keyPc + 12) % 12
    const i = MAJOR_PCS.indexOf(rel)
    return i >= 0 ? String(i + 1) : `${CHROMATIC[rel][0]}${CHROMATIC[rel][1] + 1}`
  }
  const fam = family(c.type)
  const rest = c.type === 'maj' || c.type === 'min' ? '' : c.type === 'm7' ? '7' : c.type === 'm6' ? '6' : c.type === 'm9' ? '9' : CHORD_TYPES[c.type].suffix
  return `${num(c.rootPc)}${fam === 'min' ? '-' : ''}${rest}${c.bassPc === undefined ? '' : `/${num(c.bassPc)}`}`
}

/** Roman numeral: upper case for major, lower for minor and diminished. */
export function romanLabel(c: ChordSym, keyPc: number): string {
  const rel = (c.rootPc - keyPc + 12) % 12
  const i = MAJOR_PCS.indexOf(rel)
  const base = i >= 0 ? ROMAN[i] : `${CHROMATIC[rel][0]}${ROMAN[CHROMATIC[rel][1]]}`
  const fam = family(c.type)
  const numeral = fam === 'maj' ? base : base.toLowerCase()
  const rest = c.type === 'maj' || c.type === 'min' ? '' : c.type === 'dim' ? '°' : c.type === 'm7' ? '7' : c.type === 'm6' ? '6' : c.type === 'm9' ? '9' : c.type === 'm7b5' ? 'ø7' : CHORD_TYPES[c.type].suffix
  return `${numeral}${rest}${c.bassPc === undefined ? '' : `/${noteNameIn(c.bassPc, keyPc)}`}`
}
