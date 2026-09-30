import {
  HARMONIC_MINOR_SCALE,
  KEYS_BY_FIFTHS,
  labels,
  MAJOR_SCALE,
  MAJOR_TRIAD,
  MINOR_TRIAD,
  NATURAL_MINOR_SCALE,
  noteLabel,
  pitchClass,
  relativeMinorTonic,
  spellFrom,
  tonicMidi,
  type KeyDef,
  type Note,
  type Step,
} from './spelling'

export type PracticeItem = 'warmup' | 'scale' | 'arpeggio' | 'cadence' | 'ear' | 'repertoire' | 'sightreading'

/** Keep in sync with PRACTICE_ITEMS in backend/progress/rules.py. */
export const PRACTICE_ITEMS: readonly PracticeItem[] = ['warmup', 'scale', 'arpeggio', 'cadence', 'ear', 'repertoire', 'sightreading']

export interface RoutineRow {
  id: PracticeItem
  block: string
  title: string
  minutes: number
  /** notes: the app shows and plays material. ear: links to an exercise. free: your own piece. */
  kind: 'notes' | 'ear' | 'free'
  how: string
}

export const ROUTINE: readonly RoutineRow[] = [
  { id: 'warmup', block: 'Finger pattern and scale', title: 'Warm-up pattern', minutes: 5, kind: 'notes', how: 'Play it slowly and evenly, hands together an octave apart. Keep the wrists loose and speed up only when it is clean.' },
  { id: 'scale', block: 'Finger pattern and scale', title: 'Scales', minutes: 5, kind: 'notes', how: 'Two octaves up and down, hands together. The relative minor shares the key signature, so only a few notes change.' },
  { id: 'arpeggio', block: 'Arpeggios and cadence', title: 'Arpeggios', minutes: 4, kind: 'notes', how: 'Broken triads across two octaves. Start in root position, then begin on the third and on the fifth.' },
  { id: 'cadence', block: 'Arpeggios and cadence', title: 'Cadence', minutes: 4, kind: 'notes', how: 'Left hand plays the roots, right hand the chord shapes below. Each shape shares a note with the last, so the hand hardly moves.' },
  { id: 'ear', block: 'Ear training', title: 'Ear training session', minutes: 5, kind: 'ear', how: 'One session of intervals or chord quality, whichever you practised least recently.' },
  { id: 'repertoire', block: 'Repertoire and sight reading', title: 'Repertoire', minutes: 4, kind: 'free', how: 'Work on a piece you are learning. Pick one tricky passage and repeat it slowly.' },
  { id: 'sightreading', block: 'Repertoire and sight reading', title: 'Sight reading', minutes: 3, kind: 'free', how: 'Open something you have never played and keep going without stopping, even when you slip.' },
]

export const ROUTINE_MINUTES = ROUTINE.reduce((sum, row) => sum + row.minutes, 0)

// ---- Key of the day ---------------------------------------------------------------------------

/** The user's calendar date as YYYY-MM-DD, in their own time zone. */
export function localDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function daysSinceEpoch(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** One new key each day, following the circle of fifths, so 12 days cover all 12 keys. */
export function keyForDate(dateString: string): KeyDef {
  const index = ((daysSinceEpoch(dateString) % 12) + 12) % 12
  return KEYS_BY_FIFTHS[index]
}

// ---- Material ---------------------------------------------------------------------------------

/** One sounding moment: `beat` and `beats` are in quarter-note beats. */
export interface SeqEvent {
  beat: number
  beats: number
  notes: number[]
}

export interface Section {
  id: string
  heading: string
  /** What to play, in note names. */
  lines: string[]
  events: SeqEvent[]
}

const EIGHTH = 0.5
const OCTAVE = 12

const semis = (steps: readonly Step[]): number[] => steps.map(([, s]) => s)

/** Pitch of scale degree `n` (0 = tonic), counting through octaves upward or downward. */
function degreeMidi(tonic: number, scale: readonly number[], n: number): number {
  const octave = Math.floor(n / scale.length)
  return tonic + scale[((n % scale.length) + scale.length) % scale.length] + OCTAVE * octave
}

function degreeLabel(names: readonly string[], n: number): string {
  return names[((n % names.length) + names.length) % names.length]
}

/** Hands an octave apart: the right hand plays `pitch`, the left the same an octave lower. */
const bothHands = (pitch: number): number[] => [pitch, pitch - OCTAVE]

function runEvents(pitches: readonly number[], start = 0): SeqEvent[] {
  return pitches.map((p, i) => ({ beat: start + i * EIGHTH, beats: EIGHTH, notes: bothHands(p) }))
}

/** Bars of the Hanon-style run, as scale-degree indexes. */
export function warmupBars(): { up: number[][]; down: number[][] } {
  const up = Array.from({ length: 8 }, (_, k) => [k, k + 2, k + 3, k + 4, k + 5, k + 4, k + 3, k + 2])
  const down = Array.from({ length: 8 }, (_, i) => {
    const j = 7 - i
    return [j + 5, j + 3, j + 2, j + 1, j, j + 1, j + 2, j + 3]
  })
  return { up, down }
}

export function warmupSections(key: KeyDef): Section[] {
  const tonic = tonicMidi(key.tonic)
  const scale = semis(MAJOR_SCALE)
  const names = labels(spellFrom(key.tonic, MAJOR_SCALE))
  const { up, down } = warmupBars()
  const bars = [...up, ...down]
  const events = bars.flatMap((bar, i) => runEvents(bar.map((n) => degreeMidi(tonic, scale, n)), i * 4))
  const line = (bar: number[]) => bar.map((n) => degreeLabel(names, n)).join(' ')
  return [
    {
      id: 'pattern',
      heading: `Run in ${key.label} major`,
      lines: [
        `Bar 1: ${line(up[0])}`,
        `Bar 2: ${line(up[1])}`,
        'Keep going: every bar starts one scale step higher, for 8 bars. Then play the same shape back down, from the top.',
        'Right hand as written; left hand the same an octave lower. Modelled on Hanon, The Virtuoso Pianist.',
      ],
      events,
    },
  ]
}

function scaleSection(id: string, heading: string, root: Note, steps: readonly Step[]): Section {
  const tonic = tonicMidi(root)
  const offsets = semis(steps)
  const names = labels(spellFrom(root, steps))
  const up = Array.from({ length: 15 }, (_, n) => degreeMidi(tonic, offsets, n))
  const pitches = [...up, ...up.slice(0, -1).reverse()]
  return {
    id,
    heading,
    lines: [`${names.join(' ')} ${names[0]}`, 'Continue into the second octave, then come back down.'],
    events: runEvents(pitches),
  }
}

export function scaleSections(key: KeyDef): Section[] {
  const minor = relativeMinorTonic(key)
  const minorName = noteLabel(minor)
  return [
    scaleSection('major', `${key.label} major`, key.tonic, MAJOR_SCALE),
    scaleSection('natural', `${minorName} natural minor (relative minor)`, minor, NATURAL_MINOR_SCALE),
    scaleSection('harmonic', `${minorName} harmonic minor`, minor, HARMONIC_MINOR_SCALE),
  ]
}

const INVERSION_NAME = ['root position', 'first inversion (start on the third)', 'second inversion (start on the fifth)']

function arpeggioSection(id: string, heading: string, root: Note, steps: readonly Step[], inversion: number): Section {
  const tonic = tonicMidi(root)
  const offsets = semis(steps) // [0, third, fifth]
  const chordNames = labels(spellFrom(root, steps))
  // Chord tones counted upward from the root: index n is the (n mod 3)th tone, n div 3 octaves up.
  const tone = (n: number) => degreeMidi(tonic, offsets, n)
  const climb = Array.from({ length: 7 }, (_, i) => tone(inversion + i))
  const pitches = [...climb, ...climb.slice(0, -1).reverse()]
  const order = [0, 1, 2].map((i) => chordNames[(inversion + i) % 3])
  return {
    id,
    heading: `${heading}, ${INVERSION_NAME[inversion]}`,
    lines: [`${order.join(' ')} ${order[0]}…  (up two octaves and back)`],
    events: runEvents(pitches),
  }
}

export function arpeggioSections(key: KeyDef): Section[] {
  const minor = relativeMinorTonic(key)
  const majorName = `${key.label} major`
  const minorName = `${noteLabel(minor)} minor`
  return [0, 1, 2]
    .map((i) => arpeggioSection(`major-${i}`, majorName, key.tonic, MAJOR_TRIAD, i))
    .concat([0, 1, 2].map((i) => arpeggioSection(`minor-${i}`, minorName, minor, MINOR_TRIAD, i)))
}

interface CadenceChord {
  numeral: string
  /** Root of the chord, as semitones above the key's tonic, and the letters up for spelling. */
  root: Step
  triad: readonly Step[]
  /** 0 = root position, 1 = first inversion, 2 = second inversion (right hand). */
  inversion: number
  /** Right-hand notes, in semitones above the tonic. */
  hand: number[]
}

function cadenceChords(minorKey: boolean): CadenceChord[] {
  const one: CadenceChord = { numeral: minorKey ? 'i' : 'I', root: [0, 0], triad: minorKey ? MINOR_TRIAD : MAJOR_TRIAD, inversion: 0, hand: minorKey ? [0, 3, 7] : [0, 4, 7] }
  const four: CadenceChord = { numeral: minorKey ? 'iv' : 'IV', root: [3, 5], triad: minorKey ? MINOR_TRIAD : MAJOR_TRIAD, inversion: 2, hand: minorKey ? [0, 5, 8] : [0, 5, 9] }
  const five: CadenceChord = { numeral: 'V', root: [4, 7], triad: MAJOR_TRIAD, inversion: 1, hand: [-1, 2, 7] }
  return [one, four, one, five, one]
}

function cadenceSection(id: string, heading: string, tonicNote: Note, minorKey: boolean): Section {
  const tonic = tonicMidi(tonicNote)
  const chords = cadenceChords(minorKey)
  const events: SeqEvent[] = []
  const lines: string[] = []
  chords.forEach((chord, i) => {
    const root = spellFrom(tonicNote, [chord.root])[0]
    const tones = spellFrom(root, chord.triad) // root, third, fifth
    const shown = [0, 1, 2].map((k) => tones[(chord.inversion + k) % 3])
    const bass = tonic + chord.root[1] - OCTAVE * 2
    events.push({ beat: i * 2, beats: 2, notes: [bass, ...chord.hand.map((h) => tonic + h)] })
    lines.push(`${chord.numeral}: left hand ${noteLabel(root)}, right hand ${labels(shown).join(' ')}`)
  })
  return { id, heading, lines, events }
}

export function cadenceSections(key: KeyDef): Section[] {
  const minor = relativeMinorTonic(key)
  return [
    cadenceSection('major', `${key.label} major: I, IV, I, V, I`, key.tonic, false),
    cadenceSection('minor', `${noteLabel(minor)} minor: i, iv, i, V, i`, minor, true),
  ]
}

/** The material of a notes row, or an empty list for rows without any. */
export function sectionsFor(row: PracticeItem, key: KeyDef): Section[] {
  switch (row) {
    case 'warmup': return warmupSections(key)
    case 'scale': return scaleSections(key)
    case 'arpeggio': return arpeggioSections(key)
    case 'cadence': return cadenceSections(key)
    default: return []
  }
}

/** Sounding events as seconds at a tempo (BPM = quarter notes per minute). */
export interface TimedEvent {
  time: number
  hold: number
  notes: number[]
}

export function toTimed(events: readonly SeqEvent[], bpm: number): TimedEvent[] {
  const sec = 60 / bpm
  return events.map((e) => ({ time: e.beat * sec, hold: Math.max(e.beats * sec * 1.6, 0.6), notes: e.notes }))
}

export function sectionSeconds(section: Section, bpm: number): number {
  const last = section.events[section.events.length - 1]
  return ((last.beat + last.beats) * 60) / bpm
}

// Exposed so tests can check spelling and pitch agree.
export { pitchClass }
