import { chordEvent, SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const ROLES: readonly (Item & { word: string })[] = [
  { id: '1', short: '1', name: 'Root', hint: 'Safe and plain: the chord\'s own name', word: 'root' },
  { id: '3', short: '3', name: 'Third (guide tone)', hint: 'Says major or minor: the most telling note', word: '3rd' },
  { id: '5', short: '5', name: 'Fifth', hint: 'Safe and open, a little neutral', word: '5th' },
  { id: '7', short: '7', name: 'Seventh (guide tone)', hint: 'Jazzy and rich: the colour of a 7th chord', word: '7th' },
  { id: '9', short: '9', name: 'Ninth (colour)', hint: 'Bright and modern, floats above the chord', word: '9th' },
  { id: 'out', short: 'Out', name: 'Not in the chord', hint: 'Rubs against the chord and wants to move a step', word: 'not in the chord' },
]
const BY_ID = new Map(ROLES.map((r) => [r.id, r]))
const items: readonly Item[] = ROLES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Chord tones as [letters up, semitones up] from the root: root, 3rd, 5th, (7th). */
const TONES: Record<string, readonly Step[]> = {
  maj: [[0, 0], [2, 4], [4, 7]],
  min: [[0, 0], [2, 3], [4, 7]],
  '7': [[0, 0], [2, 4], [4, 7], [6, 10]],
  maj7: [[0, 0], [2, 4], [4, 7], [6, 11]],
  m7: [[0, 0], [2, 3], [4, 7], [6, 10]],
}
const NINTH: Step = [1, 2]
/** Notes that clash with each chord: a semitone above the root, the 4th over a major 3rd, the major 3rd over a minor one, a major 7th over a dominant chord. */
const OUT: Record<string, readonly Step[]> = {
  maj: [[1, 1], [3, 5]],
  min: [[1, 1], [2, 4]],
  '7': [[3, 5], [6, 11]],
  maj7: [[1, 1], [3, 5]],
  m7: [[1, 1], [2, 4]],
}
const SEVENTHS = ['7', 'maj7', 'm7']
const WORD: Record<string, string> = { maj: 'major', min: 'minor', '7': 'dominant 7th', maj7: 'major 7th', m7: 'minor 7th' }

const ROOTS: readonly Note[] = KEYS_BY_FIFTHS.map((k) => k.tonic)
const named = (...labels: string[]) => ROOTS.filter((r) => labels.includes(noteLabel(r)))
const C_F_G = named('C', 'F', 'G')
const NATURALS = named('C', 'D', 'E', 'F', 'G', 'A')

interface Setup {
  roots: readonly Note[]
  types: readonly string[]
  /** Highest melody note. */
  top: number
  /** Play another chord first, so the same note is heard over two chords. */
  twoChords: 'never' | 'always' | 'sometimes'
}
const ALL_TYPES = ['maj', 'min', ...SEVENTHS]
const SETUP: Record<number, Setup> = {
  1: { roots: C_F_G, types: ['maj'], top: 76, twoChords: 'never' },
  2: { roots: NATURALS, types: ['maj', 'min'], top: 76, twoChords: 'never' },
  3: { roots: NATURALS, types: ['7'], top: 76, twoChords: 'never' },
  4: { roots: NATURALS, types: SEVENTHS, top: 76, twoChords: 'never' },
  5: { roots: NATURALS, types: SEVENTHS, top: 76, twoChords: 'never' },
  6: { roots: NATURALS, types: ALL_TYPES, top: 76, twoChords: 'never' },
  7: { roots: NATURALS, types: ALL_TYPES, top: 76, twoChords: 'never' },
  8: { roots: ROOTS, types: ALL_TYPES, top: 84, twoChords: 'never' },
  9: { roots: ROOTS, types: ['maj', 'min', '7'], top: 84, twoChords: 'always' },
  10: { roots: ROOTS, types: ALL_TYPES, top: 84, twoChords: 'sometimes' },
}

const BLOCK = ['block'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const levels: readonly Level[] = [
  { id: 1, name: 'Root, 3rd or 5th', blurb: 'Hear a chord, then one note above it. Is the note the chord\'s root (1), its 3rd or its 5th? These are the safe notes to land on when you improvise.', items: ['1', '3', '5'], modes: BLOCK, lowRange: RANGE },
  { id: 2, name: 'Minor chords', blurb: 'The same three notes over major and minor chords: the 3rd sounds darker over a minor chord.', items: ['1', '3', '5'], modes: BLOCK, lowRange: RANGE },
  { id: 3, name: 'The 7th', blurb: 'Dominant 7th chords (C7), and the 7th as a melody note.', items: ['1', '3', '5', '7'], modes: BLOCK, lowRange: RANGE },
  { id: 4, name: 'Every 7th chord', blurb: 'Over maj7, 7 and m7 chords.', items: ['1', '3', '5', '7'], modes: BLOCK, lowRange: RANGE },
  { id: 5, name: 'Guide tones', blurb: 'Only the 3rd or the 7th: the two notes that say what a chord is. Jazz and R&B lines lean on them.', items: ['3', '7'], modes: BLOCK, lowRange: RANGE },
  { id: 6, name: 'The 9th', blurb: 'Add the 9th (the 2nd, an octave up): a colour note that sounds modern over almost any chord.', items: ['1', '3', '5', '7', '9'], modes: BLOCK, lowRange: RANGE },
  { id: 7, name: 'Out of the chord', blurb: 'Some notes clash with the chord, such as the 4th over a major chord. Hear when a note is out, so you know to move it a step.', items: ROLES.map((r) => r.id), modes: BLOCK, lowRange: RANGE },
  { id: 8, name: 'Any root, any height', blurb: 'Every root, with the melody note anywhere up to C6.', items: ROLES.map((r) => r.id), modes: BLOCK, lowRange: RANGE },
  { id: 9, name: 'One note, two chords', blurb: 'The same note held over two chords in a row. Name what it is over the second one: a note changes its role when the chord changes.', items: ['1', '3', '5', '7'], modes: BLOCK, lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Every chord and every note, sometimes over two chords.', items: ROLES.map((r) => r.id), modes: BLOCK, lowRange: RANGE },
]

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

interface Chord {
  root: Note
  type: string
  tones: Note[]
  midi: number[]
  symbol: string
}
/** A left-hand bass note and the chord close above it, around C3. */
function chord(root: Note, type: string): Chord {
  const tones = spellFrom(root, TONES[type])
  const bass = atOrAbove(36, pitchClass(root))
  const start = atOrAbove(48, pitchClass(root))
  return { root, type, tones, midi: [bass, ...tones.map((t) => atOrAbove(start, pitchClass(t)))].sort((a, b) => a - b), symbol: `${noteLabel(root)}${SUFFIX[type]}` }
}
const spelled = (c: Chord) => c.tones.map(noteLabel).join(' ')

/** What a pitch class is over a chord, in words. */
function roleOf(pc: number, c: Chord): string {
  const i = c.tones.findIndex((t) => pitchClass(t) === pc)
  if (i >= 0) return ['root', '3rd', '5th', '7th'][i]
  if (pc === (pitchClass(c.root) + 2) % 12) return '9th'
  return 'not in the chord'
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const role = BY_ID.get(item.id)!
  const types = item.id === '7' ? setup.types.filter((t) => SEVENTHS.includes(t)) : setup.types
  const now = chord(pick(setup.roots, rand), pick(types, rand))

  // The melody note, spelled from the chord root.
  const step: Step =
    item.id === '9' ? NINTH : item.id === 'out' ? pick(OUT[now.type], rand) : TONES[now.type][['1', '3', '5', '7'].indexOf(item.id)]
  const note = spellFrom(now.root, [step])[0]
  const two = setup.twoChords === 'always' || (setup.twoChords === 'sometimes' && rand() < 0.4)
  // The chord before: a 4th or 5th away, so the change sounds like a song.
  const before = two ? chord(pick(ROOTS.filter((r) => [5, 7].includes((pitchClass(r) - pitchClass(now.root) + 12) % 12)), rand), pick(['maj', 'min'], rand)) : null

  // The melody note sits above every chord note, up to the level's highest note.
  const lowest = Math.max(...now.midi, ...(before?.midi ?? [])) + 1
  const options: number[] = []
  for (let m = atOrAbove(lowest, pitchClass(note)); m <= setup.top; m += 12) options.push(m)
  const melody = options.length ? pick(options, rand) : atOrAbove(lowest, pitchClass(note))

  const name = noteLabel(note)
  const steps = [
    ...(before ? [{ label: `${before.symbol} · ${spelled(before)}`, notes: before.midi }, { label: `${name} · ${roleOf(pitchClass(note), before) === 'not in the chord' ? 'not in' : `the ${roleOf(pitchClass(note), before)} of`} ${before.symbol}`, notes: [melody] }] : []),
    { label: `${now.symbol} · ${spelled(now)}`, notes: now.midi },
    { label: `${name} · ${item.id === 'out' ? 'not in' : `the ${role.word} of`} ${now.symbol}`, notes: [melody] },
  ]
  const shift = before ? 2.4 : 0
  const events = [
    ...(before ? [chordEvent(0, 2.2, before.midi), chordEvent(0.8, 1.4, [melody])] : []),
    chordEvent(shift, 3, now.midi),
    chordEvent(shift + (before ? 0 : 0.8), before ? 3 : 2.2, [melody]),
  ]
  const what = item.id === 'out' ? 'not in the chord: it rubs and wants to move a step to a chord tone' : `the ${role.word}${item.id === '3' || item.id === '7' ? ', a guide tone' : ''}`
  const explain = `${before ? `Over ${before.symbol} the ${name} was ${roleOf(pitchClass(note), before) === 'not in the chord' ? 'not in the chord' : `the ${roleOf(pitchClass(note), before)}`}; over ` : 'Over '}${now.symbol} (${noteLabel(now.root)} ${WORD[now.type]}: ${spelled(now)}) the ${name} is ${what}.`

  return { root: now.midi[0], item: item.id, mode, notes: [...now.midi, melody], events, stepOf: events.map((_, i) => i), steps, explain }
}

export const chordTonesExercise: ExerciseDef = {
  id: 'chord-tones',
  name: 'Chord tones and guide tones',
  blurb: 'Hear a chord and a melody note above it, and say what the note is in the chord: 1, 3, 5, 7, 9 or out. Landing on chord tones is what makes an improvised line sound like it fits.',
  hintLabel: 'Sounds:',
  question: 'Listen to the chord and the note above it. What is the note in the chord?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { block: 'chord and note' },
  phrase: (item) => (item.id === 'out' ? 'a note outside the chord' : `the ${BY_ID.get(item.id)!.word}`),
}
