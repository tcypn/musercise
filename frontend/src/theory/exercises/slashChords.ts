import { chordEvent, keyContext, keyLabel, SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const BASS: readonly (Item & { index: number; word: string })[] = [
  { id: 'root', short: 'Root', name: 'Root in the bass (C)', hint: 'Solid and grounded: the chord stands on its own name', index: 0, word: 'root' },
  { id: '3rd', short: '3rd', name: '3rd in the bass (C/E)', hint: 'Lighter, a little unsettled; walks bass lines up and down', index: 1, word: '3rd' },
  { id: '5th', short: '5th', name: '5th in the bass (C/G)', hint: 'Floating, wants to move on (often before V or I)', index: 2, word: '5th' },
  { id: '7th', short: '7th', name: '7th in the bass (C7/B♭)', hint: 'Unstable: the bass wants to step down', index: 3, word: '7th' },
]
const BY_ID = new Map(BASS.map((b) => [b.id, b]))
const items: readonly Item[] = BASS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Chord tones as [letters up, semitones up] from the root: root, 3rd, 5th, 7th. */
const TONES: Record<string, readonly Step[]> = {
  maj: [[0, 0], [2, 4], [4, 7]],
  min: [[0, 0], [2, 3], [4, 7]],
  '7': [[0, 0], [2, 4], [4, 7], [6, 10]],
  maj7: [[0, 0], [2, 4], [4, 7], [6, 11]],
  m7: [[0, 0], [2, 3], [4, 7], [6, 10]],
}
const TRIADS = ['maj', 'min']
const WORD: Record<string, string> = { maj: 'major', min: 'minor', '7': 'dominant 7th', maj7: 'major 7th', m7: 'minor 7th' }
const SEVENTHS = ['7', 'maj7', 'm7']

type Voicing = 'close' | 'low' | 'spread'
interface Setup {
  roots: 'few' | 'any'
  types: readonly string[]
  voicing: readonly Voicing[]
  /** Play the key first and use the chord on I, IV or V. */
  inKey?: boolean
}
const SETUP: Record<number, Setup> = {
  1: { roots: 'few', types: ['maj'], voicing: ['close'] },
  2: { roots: 'few', types: ['maj'], voicing: ['close'] },
  3: { roots: 'any', types: ['maj'], voicing: ['close'] },
  4: { roots: 'any', types: TRIADS, voicing: ['close'] },
  5: { roots: 'any', types: TRIADS, voicing: ['low'] },
  6: { roots: 'any', types: TRIADS, voicing: ['spread'] },
  7: { roots: 'any', types: SEVENTHS, voicing: ['low'] },
  8: { roots: 'any', types: TRIADS, voicing: ['low'] },
  9: { roots: 'any', types: ['maj'], voicing: ['low'], inKey: true },
  10: { roots: 'any', types: [...TRIADS, ...SEVENTHS], voicing: ['close', 'low', 'spread'] },
}

const THREE = ['root', '3rd', '5th']
const RANGE: readonly [number, number] = [36, 64]
const levels: readonly Level[] = [
  { id: 1, name: 'Root or 3rd', blurb: 'Listen to the lowest note. Is it the chord\'s own name (C) or its 3rd (C/E, said "C over E")?', items: ['root', '3rd'], modes: ['block'], lowRange: RANGE },
  { id: 2, name: 'The 5th', blurb: 'Add the 5th in the bass: C/G.', items: THREE, modes: ['block'], lowRange: RANGE },
  { id: 3, name: 'Any root', blurb: 'Major chords on all twelve roots.', items: THREE, modes: ['block'], lowRange: RANGE },
  { id: 4, name: 'Minor chords', blurb: 'Minor chords too: Am/C has the minor 3rd in the bass.', items: THREE, modes: ['block'], lowRange: RANGE },
  { id: 5, name: 'Left hand bass', blurb: 'As a pianist plays it: one bass note low in the left hand, the chord in the right.', items: THREE, modes: ['block'], lowRange: RANGE },
  { id: 6, name: 'Spread out', blurb: 'The right hand spreads the chord wider, so follow the bass, not the top.', items: THREE, modes: ['block'], lowRange: RANGE },
  { id: 7, name: '7th chords', blurb: 'Seventh chords, and the 7th in the bass (C7/B♭): the bass wants to step down.', items: ['root', '3rd', '5th', '7th'], modes: ['block'], lowRange: RANGE },
  { id: 8, name: 'Broken', blurb: 'The chord one note at a time, from the bass up.', items: THREE, modes: ['arpeggio'], lowRange: RANGE },
  { id: 9, name: 'In a key', blurb: 'Hear the key first, then I, IV or V with a bass note, as in a song.', items: THREE, modes: ['block'], lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Triads and sevenths, any voicing, together or broken.', items: ['root', '3rd', '5th', '7th'], modes: ['block', 'arpeggio'], lowRange: RANGE },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const ROOTS: readonly Note[] = KEYS_BY_FIFTHS.map((k) => k.tonic)
const FEW: readonly Note[] = ROOTS.filter((r) => ['C', 'F', 'G'].includes(noteLabel(r)))
/** The chord on I, IV or V of a major key, as [letters, semitones] above the tonic. */
const IN_KEY: readonly { numeral: string; step: Step }[] = [{ numeral: 'I', step: [0, 0] }, { numeral: 'IV', step: [3, 5] }, { numeral: 'V', step: [4, 7] }]

/** The lowest MIDI note at or above `from` with this pitch class. */
const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

function voice(pcs: readonly number[], bassIndex: number, voicing: Voicing, rand: () => number): number[] {
  const bassPc = pcs[bassIndex]
  if (voicing === 'close') {
    // The chord turned over so the bass tone is at the bottom, the others stacked just above it.
    const bass = atOrAbove(48 + Math.floor(rand() * 6), bassPc)
    const notes = [bass]
    for (let i = 1; i < pcs.length; i++) notes.push(atOrAbove(notes[notes.length - 1] + 1, pcs[(bassIndex + i) % pcs.length]))
    return notes
  }
  // A left-hand bass note low, and the whole chord in the right hand.
  const bass = atOrAbove(36, bassPc)
  const root = atOrAbove(55, pcs[0])
  if (voicing === 'low') return [bass, ...pcs.map((pc) => atOrAbove(root, pc))].sort((a, b) => a - b)
  // Spread: root, 5th, then the 3rd (and 7th) an octave up.
  const r = atOrAbove(bass + 1, pcs[0])
  const fifth = r + 7
  return [bass, r, fifth, ...pcs.slice(1).filter((_, i) => i !== 1).map((pc) => atOrAbove(fifth + 1, pc))].sort((a, b) => a - b)
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const bass = BY_ID.get(item.id)!
  const types = bass.index === 3 ? setup.types.filter((t) => SEVENTHS.includes(t)) : setup.types
  const type = pick(types, rand)

  let root: Note
  let tonicPc = 0
  let numeral = ''
  if (setup.inKey) {
    tonicPc = Math.floor(rand() * 12)
    const chord = pick(IN_KEY, rand)
    numeral = chord.numeral
    root = spellFrom(keyLabel(tonicPc, 'major').tonic, [chord.step])[0]
  } else {
    root = pick(setup.roots === 'few' ? FEW : ROOTS, rand)
  }
  const tones = spellFrom(root, TONES[type])
  const notes = voice(tones.map(pitchClass), bass.index, pick(setup.voicing, rand), rand)
  const symbol = `${noteLabel(root)}${SUFFIX[type]}${bass.index ? `/${noteLabel(tones[bass.index])}` : ''}`
  const names = notes.map((m) => noteLabel(tones.find((t) => pitchClass(t) === m % 12)!))
  const label = `${symbol} · ${names.join(' ')}`
  const rootMidi = notes.find((m) => m % 12 === pitchClass(root))!
  const explain = `${symbol}: ${'AEF'.includes(noteLabel(root)[0]) ? 'an' : 'a'} ${noteLabel(root)} ${WORD[type]} chord with its ${bass.word}, ${noteLabel(tones[bass.index])}, in the bass${numeral ? ` (the ${numeral} chord of ${keyLabel(tonicPc, 'major').label})` : ''}.`

  const base = { root: rootMidi, item: item.id, mode, notes, steps: [{ label, notes }], explain }
  if (!setup.inKey) return base
  const { events: context, end } = keyContext(48 + tonicPc, 'major', 'full')
  return { ...base, events: [...context, chordEvent(end + 0.9, 2.6, notes)], answerFrom: context.length }
}

export const slashChordsExercise: ExerciseDef = {
  id: 'slash-chords',
  name: 'Inversions and slash chords',
  blurb: 'Hear a chord and say which of its notes is in the bass: the root (C), the 3rd (C/E), the 5th (C/G) or the 7th. Slash chords make bass lines walk smoothly in pop and R&B.',
  hintLabel: 'Sounds:',
  question: 'Listen to the lowest note. Which note of the chord is in the bass?',
  partLabels: { key: 'The key', question: 'Which note is in the bass?' },
  items,
  levels,
  makeQuestion,
  playStyle: (mode) => (mode === 'arpeggio' ? { gap: 0.35, hold: 2.4 } : { gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { block: 'together', arpeggio: 'broken' },
  phrase: (item) => `the ${BY_ID.get(item.id)!.word} in the bass`,
}
