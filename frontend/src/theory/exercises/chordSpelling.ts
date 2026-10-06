import { SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

// ---- Chords --------------------------------------------------------------------------------------

/** Ids stay plain ASCII (the server only accepts letters, digits and # b / + . _ -). */
const ascii = (label: string) => label.replaceAll('♯', '#').replaceAll('♭', 'b')

type Family = 'triad' | 'seventh' | 'ninth' | 'slash'
interface ChordType {
  type: string
  family: Family
  /** Steps above the root as [letters up, semitones up], in the order the notes are written. */
  steps: readonly Step[]
  word: string
  /** What the notes are above the root. */
  intervals: string
}

const T: ChordType[] = [
  { type: 'maj', family: 'triad', steps: [[0, 0], [2, 4], [4, 7]], word: 'major', intervals: 'major 3rd, perfect 5th' },
  { type: 'min', family: 'triad', steps: [[0, 0], [2, 3], [4, 7]], word: 'minor', intervals: 'minor 3rd, perfect 5th' },
  { type: 'dim', family: 'triad', steps: [[0, 0], [2, 3], [4, 6]], word: 'diminished', intervals: 'minor 3rd, diminished 5th' },
  { type: 'aug', family: 'triad', steps: [[0, 0], [2, 4], [4, 8]], word: 'augmented', intervals: 'major 3rd, augmented 5th' },
  { type: 'maj7', family: 'seventh', steps: [[0, 0], [2, 4], [4, 7], [6, 11]], word: 'major 7th', intervals: 'major 3rd, perfect 5th, major 7th' },
  { type: '7', family: 'seventh', steps: [[0, 0], [2, 4], [4, 7], [6, 10]], word: 'dominant 7th', intervals: 'major 3rd, perfect 5th, minor 7th' },
  { type: 'm7', family: 'seventh', steps: [[0, 0], [2, 3], [4, 7], [6, 10]], word: 'minor 7th', intervals: 'minor 3rd, perfect 5th, minor 7th' },
  { type: 'm7b5', family: 'seventh', steps: [[0, 0], [2, 3], [4, 6], [6, 10]], word: 'half-diminished 7th', intervals: 'minor 3rd, diminished 5th, minor 7th' },
  { type: 'maj9', family: 'ninth', steps: [[0, 0], [2, 4], [4, 7], [6, 11], [1, 2]], word: 'major 9th', intervals: 'major 3rd, perfect 5th, major 7th, major 9th' },
  { type: '9', family: 'ninth', steps: [[0, 0], [2, 4], [4, 7], [6, 10], [1, 2]], word: 'dominant 9th', intervals: 'major 3rd, perfect 5th, minor 7th, major 9th' },
  { type: 'm9', family: 'ninth', steps: [[0, 0], [2, 3], [4, 7], [6, 10], [1, 2]], word: 'minor 9th', intervals: 'minor 3rd, perfect 5th, minor 7th, major 9th' },
  // Slash chords: a major chord with its 3rd or its 5th in the bass, written bass first.
  { type: 'over3', family: 'slash', steps: [[2, 4], [4, 7], [0, 0]], word: 'major', intervals: '3rd' },
  { type: 'over5', family: 'slash', steps: [[4, 7], [0, 0], [2, 4]], word: 'major', intervals: '5th' },
]
const TYPE = new Map(T.map((t) => [t.type, t]))

export interface SpelledChord {
  /** The id without its s- or c- prefix, e.g. "Bbm7b5" or "C/E". */
  key: string
  root: Note
  type: ChordType
  /** Spelled notes, in the order they are written (bass first for slash chords). */
  notes: Note[]
  symbol: string
}

function build(root: Note, t: ChordType): SpelledChord {
  const notes = spellFrom(root, t.steps)
  const symbol = t.family === 'slash' ? `${noteLabel(root)}/${noteLabel(notes[0])}` : `${noteLabel(root)}${SUFFIX[t.type]}`
  return { key: ascii(symbol), root, type: t, notes, symbol }
}

const ROOTS = [...KEYS_BY_FIFTHS].map((k) => k.tonic).sort((a, b) => pitchClass(a) - pitchClass(b))
const NATURAL = ROOTS.filter((r) => r.accidental === 0)

const ALL: SpelledChord[] = T.flatMap((t) => ROOTS.map((r) => build(r, t)))
export const CHORDS = new Map(ALL.map((c) => [c.key, c]))

const spelling = (c: SpelledChord) => c.notes.map(noteLabel).join(' ')
const longName = (c: SpelledChord) =>
  c.type.family === 'slash' ? `${noteLabel(c.root)} major, ${noteLabel(c.notes[0])} in the bass` : `${noteLabel(c.root)} ${c.type.word}`

/** MIDI notes for the keyboard: the first note in the octave below middle C, each next note above the one before. */
function midiOf(c: SpelledChord): number[] {
  const out = [48 + pitchClass(c.notes[0])]
  for (const n of c.notes.slice(1)) {
    const prev = out[out.length - 1]
    const up = (((pitchClass(n) - prev) % 12) + 12) % 12
    out.push(prev + (up || 12))
  }
  return out
}

// ---- Answers -------------------------------------------------------------------------------------

const symbolItem = (c: SpelledChord): Item => ({ id: `c-${c.key}`, short: c.symbol, name: longName(c), hint: spelling(c) })
// The name shows on the answer tile, so it must not give the chord away.
const spellItem = (c: SpelledChord): Item => ({ id: `s-${c.key}`, short: spelling(c), name: `${c.notes.length} notes`, hint: `${c.symbol}, ${longName(c)}` })

const items: readonly Item[] = [...ALL.map(spellItem), ...ALL.map(symbolItem)]

// ---- Levels --------------------------------------------------------------------------------------

const pick = (types: string[], roots: readonly Note[] = ROOTS) => ALL.filter((c) => types.includes(c.type.type) && roots.includes(c.root))
const spellIds = (list: SpelledChord[]) => list.map((c) => `s-${c.key}`)
const symbolIds = (list: SpelledChord[]) => list.map((c) => `c-${c.key}`)
const both = (list: SpelledChord[]) => [...spellIds(list), ...symbolIds(list)]
const BOTH: readonly Mode[] = ['spell', 'symbol']
const RANGE: readonly [number, number] = [48, 59]

const levels: readonly Level[] = [
  { id: 1, name: 'Major and minor', blurb: 'Spell major and minor chords on the white keys. A major chord is the root, a major 3rd and a perfect 5th; a minor chord lowers the 3rd by a semitone.', items: spellIds(pick(['maj', 'min'], NATURAL)), modes: ['spell'], lowRange: RANGE },
  { id: 2, name: 'Notes to symbols', blurb: 'The other way round: read the notes and name the chord.', items: symbolIds(pick(['maj', 'min'], NATURAL)), modes: ['symbol'], lowRange: RANGE },
  { id: 3, name: 'Every root', blurb: 'Major and minor chords on all twelve roots, both ways. Each chord uses every other letter (C E G, D♭ F A♭), so the spelling follows the letters.', items: both(pick(['maj', 'min'])), modes: BOTH, lowRange: RANGE },
  { id: 4, name: 'Diminished and augmented', blurb: 'Two more triads: diminished (Cdim = C E♭ G♭) lowers the 5th of a minor chord; augmented (Caug = C E G♯) raises the 5th of a major chord.', items: both(pick(['maj', 'min', 'dim', 'aug'])), modes: BOTH, lowRange: RANGE },
  { id: 5, name: 'maj7 and 7', blurb: 'Add a 7th to a major chord: maj7 adds the note a semitone below the root (Cmaj7 = C E G B); 7 adds the note a whole tone below (C7 = C E G B♭).', items: both(pick(['maj7', '7'])), modes: BOTH, lowRange: RANGE },
  { id: 6, name: 'm7 and m7♭5', blurb: 'Minor 7th (Cm7 = C E♭ G B♭) and half-diminished (Cm7♭5 = C E♭ G♭ B♭), alongside maj7 and 7.', items: both(pick(['maj7', '7', 'm7', 'm7b5'])), modes: BOTH, lowRange: RANGE },
  { id: 7, name: '9th chords', blurb: 'Add the 9th (the 2nd, an octave up) to a 7th chord: Cmaj9 = C E G B D, C9 = C E G B♭ D, Cm9 = C E♭ G B♭ D.', items: both(pick(['maj9', '9', 'm9'])), modes: BOTH, lowRange: RANGE },
  { id: 8, name: 'Slash chords: 3rd in the bass', blurb: 'C/E means a C chord with E as the lowest note: E G C. The letter after the slash is the bass.', items: both(pick(['over3'])), modes: BOTH, lowRange: RANGE },
  { id: 9, name: 'Slash chords: 5th in the bass', blurb: 'C/G puts the 5th in the bass: G C E. Mixed with the 3rd in the bass.', items: both(pick(['over3', 'over5'])), modes: BOTH, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Triads, 7ths, 9ths and slash chords on every root, both ways.', items: items.map((i) => i.id), modes: BOTH, lowRange: RANGE },
]

// ---- Questions -----------------------------------------------------------------------------------

function shuffled<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The right answer plus up to four wrong ones of the same family: other chords on the same root first. */
function offer(id: string, pool: readonly string[], rand: () => number): string[] {
  const prefix = id.slice(0, 2)
  const answer = CHORDS.get(id.slice(2))!
  const others = pool.filter((p) => p !== id && p.startsWith(prefix) && CHORDS.get(p.slice(2))!.type.family === answer.type.family)
  const sameRoot = shuffled(others.filter((p) => CHORDS.get(p.slice(2))!.root === answer.root), rand).slice(0, 3)
  const rest = shuffled(others.filter((p) => !sameRoot.includes(p)), rand)
  return [id, ...sameRoot, ...rest].slice(0, 5)
}

function explain(c: SpelledChord): string {
  if (c.type.family === 'slash') {
    const chord = build(c.root, TYPE.get('maj')!)
    return `${c.symbol} = ${spelling(c)}: a ${noteLabel(c.root)} major chord (${spelling(chord)}) with its ${c.type.intervals}, ${noteLabel(c.notes[0])}, in the bass.`
  }
  return `${c.symbol} = ${spelling(c)}: ${c.type.intervals} above ${noteLabel(c.root)}.`
}

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  const c = CHORDS.get(item.id.slice(2))!
  const notes = midiOf(c)
  const spell = item.id.startsWith('s-')
  return {
    root: notes[0], notes, item: item.id, mode: spell ? 'spell' : 'symbol',
    prompt: spell
      ? { text: `Spell ${c.symbol}.` }
      : { text: `Which chord is ${spelling(c)}${c.type.family === 'slash' ? ' (lowest note first)' : ''}?`, lit: notes },
    choices: offer(item.id, level.items, rand),
    explain: explain(c),
  }
}

export const chordSpellingExercise: ExerciseDef = {
  id: 'chord-spelling',
  name: 'Chord spelling and symbols',
  kind: 'quiz',
  blurb: 'Spell any chord from its symbol (Fmaj7, Am7, Bdim, C/E) and name a chord from its notes, so you can play from any chord chart.',
  rangeWord: 'lowest note',
  hintLabel: 'Notes:',
  question: 'Answer the question.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { spell: 'symbol to notes', symbol: 'notes to symbol' },
  phrase: (item) => (item.id.startsWith('s-') ? `the notes ${item.short}` : `the ${item.short} chord`),
}
