/**
 * Correct note spelling. A scale uses each letter name once (F♯ major is F♯ G♯ A♯ B C♯ D♯ E♯,
 * never F♯ G♯ A♯ B C♯ D♯ F), so notes are spelled from a starting note plus steps of
 * [letters up, semitones up]. MIDI numbers decide pitch; spelling is only for reading.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const

export interface Note {
  /** 0 = C ... 6 = B */
  letter: number
  /** -2 (double flat) to 2 (double sharp) */
  accidental: number
}

/** [letter names up, semitones up] from the starting note. */
export type Step = readonly [number, number]

export const MAJOR_SCALE: readonly Step[] = [[0, 0], [1, 2], [2, 4], [3, 5], [4, 7], [5, 9], [6, 11]]
export const NATURAL_MINOR_SCALE: readonly Step[] = [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 10]]
export const HARMONIC_MINOR_SCALE: readonly Step[] = [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 11]]
export const MAJOR_TRIAD: readonly Step[] = [[0, 0], [2, 4], [4, 7]]
export const MINOR_TRIAD: readonly Step[] = [[0, 0], [2, 3], [4, 7]]

export const pitchClass = (note: Note): number => (((LETTER_PC[note.letter] + note.accidental) % 12) + 12) % 12

export function noteLabel(note: Note): string {
  const mark = ['♭♭', '♭', '', '♯', '♯♯'][note.accidental + 2]
  return `${LETTERS[note.letter]}${mark}`
}

export const labels = (notes: readonly Note[]): string[] => notes.map(noteLabel)

export function spellFrom(root: Note, steps: readonly Step[]): Note[] {
  return steps.map(([letters, semitones]) => {
    const letter = (root.letter + letters) % 7
    const target = (pitchClass(root) + semitones) % 12
    // Signed distance from the natural letter to the target pitch, in -6..5.
    const accidental = ((((target - LETTER_PC[letter]) % 12) + 18) % 12) - 6
    if (Math.abs(accidental) > 2) throw new Error(`Cannot spell ${LETTERS[letter]} for pitch class ${target}`)
    return { letter, accidental }
  })
}

export interface KeyDef {
  id: string
  /** e.g. "D♭" */
  label: string
  tonic: Note
}

const key = (letter: number, accidental: number): KeyDef => {
  const tonic = { letter, accidental }
  return { id: noteLabel(tonic), label: noteLabel(tonic), tonic }
}

/** The 12 major keys in circle-of-fifths order, sharps then flats. */
export const KEYS_BY_FIFTHS: readonly KeyDef[] = [
  key(0, 0), // C
  key(4, 0), // G
  key(1, 0), // D
  key(5, 0), // A
  key(2, 0), // E
  key(6, 0), // B
  key(3, 1), // F♯
  key(1, -1), // D♭
  key(5, -1), // A♭
  key(2, -1), // E♭
  key(6, -1), // B♭
  key(3, 0), // F
]

export const getKey = (id: string): KeyDef | undefined => KEYS_BY_FIFTHS.find((k) => k.id === id)

/** Sixth degree of the major scale: the tonic of the relative minor (D major -> B minor). */
export const relativeMinorTonic = (k: KeyDef): Note => spellFrom(k.tonic, [[5, 9]])[0]

/** Where the tonic sits on the keyboard: C4 (60) up to B4 (71), so two octaves stay in easy reach. */
export const tonicMidi = (note: Note): number => 60 + pitchClass(note)

/** How many sharps (positive) or flats (negative) a major key has. */
export function signatureOf(k: KeyDef): number {
  const scale = spellFrom(k.tonic, MAJOR_SCALE)
  return scale.reduce((sum, n) => sum + n.accidental, 0)
}
