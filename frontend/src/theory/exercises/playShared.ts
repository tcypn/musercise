import { chordName, keyLabel } from '../harmony'
import { noteLabel, spellFrom, type Note, type Step } from '../spelling'
import type { Item, Question } from '../types'

/**
 * Chords to play, as spelled steps above the root. A slash answer ("maj/3") is the same chord with that chord
 * tone in the bass. Shared by "Play the chord" and "Hear it, play it".
 */
export const PLAY_CHORDS: readonly (Item & { type: string; steps: readonly Step[]; bassTone?: number })[] = [
  { id: 'maj', short: 'Major', name: 'Major triad', hint: 'Root, major 3rd, 5th', type: 'maj', steps: [[0, 0], [2, 4], [4, 7]] },
  { id: 'min', short: 'Minor', name: 'Minor triad', hint: 'Root, minor 3rd, 5th', type: 'min', steps: [[0, 0], [2, 3], [4, 7]] },
  { id: 'dim', short: 'Diminished', name: 'Diminished triad', hint: 'Root, minor 3rd, flat 5th', type: 'dim', steps: [[0, 0], [2, 3], [4, 6]] },
  { id: 'aug', short: 'Augmented', name: 'Augmented triad', hint: 'Root, major 3rd, sharp 5th', type: 'aug', steps: [[0, 0], [2, 4], [4, 8]] },
  { id: '7', short: '7', name: 'Dominant 7th', hint: 'Major triad plus a flat 7th', type: '7', steps: [[0, 0], [2, 4], [4, 7], [6, 10]] },
  { id: 'maj7', short: 'maj7', name: 'Major 7th', hint: 'Major triad plus a major 7th', type: 'maj7', steps: [[0, 0], [2, 4], [4, 7], [6, 11]] },
  { id: 'm7', short: 'm7', name: 'Minor 7th', hint: 'Minor triad plus a flat 7th', type: 'm7', steps: [[0, 0], [2, 3], [4, 7], [6, 10]] },
  { id: 'm7b5', short: 'm7♭5', name: 'Half-diminished 7th', hint: 'Diminished triad plus a flat 7th', type: 'm7b5', steps: [[0, 0], [2, 3], [4, 6], [6, 10]] },
  { id: 'maj/3', short: 'Major / 3rd', name: 'Major, 3rd in the bass', hint: '1st inversion: the 3rd lowest', type: 'maj', steps: [[0, 0], [2, 4], [4, 7]], bassTone: 1 },
  { id: 'maj/5', short: 'Major / 5th', name: 'Major, 5th in the bass', hint: '2nd inversion: the 5th lowest', type: 'maj', steps: [[0, 0], [2, 4], [4, 7]], bassTone: 2 },
  { id: 'min/3', short: 'Minor / 3rd', name: 'Minor, 3rd in the bass', hint: '1st inversion: the 3rd lowest', type: 'min', steps: [[0, 0], [2, 3], [4, 7]], bassTone: 1 },
  { id: 'min/5', short: 'Minor / 5th', name: 'Minor, 5th in the bass', hint: '2nd inversion: the 5th lowest', type: 'min', steps: [[0, 0], [2, 3], [4, 7]], bassTone: 2 },
]
export const PLAY_BY_ID = new Map(PLAY_CHORDS.map((c) => [c.id, c]))

const pcsOf = (midis: readonly number[]) => [...new Set(midis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b)
const sameSet = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i])

/** The chord's notes, its spelled symbol, and what must be played. */
export function chordToPlay(id: string, rootPc: number, spellRoot?: Note) {
  const c = PLAY_BY_ID.get(id)!
  const root = spellRoot ?? keyLabel(rootPc, 'major').tonic
  const spelled = spellFrom(root, c.steps)
  const pcs = pcsOf(c.steps.map((s) => rootPc + s[1]))
  const bass = c.bassTone !== undefined ? (rootPc + c.steps[c.bassTone][1]) % 12 : undefined
  // Close position from the bass up, around middle C.
  const start = c.bassTone ?? 0
  const order = [...c.steps.slice(start), ...c.steps.slice(0, start)].map((s) => (rootPc + s[1]) % 12)
  const notes: number[] = []
  for (const pc of order) {
    let m = 55 + ((pc - 55 + 1200) % 12)
    while (notes.length && m <= notes[notes.length - 1]) m += 12
    notes.push(m)
  }
  const symbol = chordName(root, c.type) + (c.bassTone !== undefined ? `/${noteLabel(spelled[c.bassTone])}` : '')
  return { notes, pcs, bass, symbol, spelled }
}

/** What the notes played stand for: the question's answer if they match it, another answer on the same root, or `other`. */
export function judgeChord(question: Question, midis: readonly number[], allowed: readonly string[]): string {
  if (midis.length === 0) return 'other'
  const played = pcsOf(midis)
  const lowest = Math.min(...midis) % 12
  const fits = (pcs: readonly number[], bass?: number) => sameSet(played, pcs) && (bass === undefined || bass === lowest)
  const t = question.target!
  if (fits(t.pcs, t.bass)) return question.item
  const rootPc = question.root % 12
  // Another answer of the lesson on the same root (slash answers only when that tone is in the bass).
  const other = PLAY_CHORDS.filter((c) => allowed.includes(c.id)).find((c) => {
    const p = chordToPlay(c.id, rootPc)
    return c.bassTone !== undefined ? fits(p.pcs, p.bass) : fits(p.pcs) && (c.id !== question.item)
  })
  return other?.id ?? 'other'
}
