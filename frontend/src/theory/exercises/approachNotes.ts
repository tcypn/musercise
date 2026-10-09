import { chordEvent, chordName, keyLabel, STACK, voiceProgression } from '../harmony'
import type { TimedEvent } from '../practice'
import { SCALES } from '../scales'
import { noteLabel, pitchClass, spellFrom, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** How a melody reaches its target note. */
const WAYS: readonly (Item & { how: string })[] = [
  { id: 'direct', short: 'Direct', name: 'Straight to it', hint: 'No decoration: it just arrives', how: 'goes straight to the target.' },
  { id: 'below', short: 'From below', name: 'From a half step below', hint: 'A chromatic lean up into the note', how: 'leans into the target from a half step below: a chromatic approach note.' },
  { id: 'above', short: 'From above', name: 'From the scale note above', hint: 'Steps down onto the note', how: 'steps down onto the target from the scale note above.' },
  { id: 'enclosure', short: 'Enclosure', name: 'Enclosure (above, then below)', hint: 'Circles the note before landing', how: 'circles the target: the scale note above, then a half step below, then the target. Jazz players call it an enclosure.' },
  { id: 'grace', short: 'Grace note', name: 'Grace note', hint: 'A quick flick up into the note', how: 'flicks into the target from a half step below, so quickly it is almost part of it: a grace note, as in R&B and gospel.' },
]
const BY_ID = new Map(WAYS.map((w) => [w.id, w]))
const items: readonly Item[] = WAYS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const TONES: Record<string, readonly Step[]> = {
  maj: [[0, 0], [2, 4], [4, 7]],
  '7': [[0, 0], [2, 4], [4, 7], [6, 10]],
  maj7: [[0, 0], [2, 4], [4, 7], [6, 11]],
}
const TONE_WORD = ['root', '3rd', '5th', '7th']

interface Setup {
  anyKey: boolean
  /** Which chord tones can be the target (0 root, 1 3rd, 2 5th, 3 7th). */
  targets: readonly number[]
  types: readonly string[]
  twice: boolean
  /** Seconds between figure notes. */
  gap: number
}
const S = (anyKey: boolean, targets: number[], types: string[], twice: boolean, gap: number): Setup => ({ anyKey, targets, types, twice, gap })
const SETUP: Record<number, Setup> = {
  1: S(false, [0], ['maj'], false, 0.45), 2: S(false, [0], ['maj'], false, 0.45), 3: S(false, [0], ['maj'], false, 0.45),
  4: S(false, [0], ['maj'], false, 0.45), 5: S(false, [1, 2], ['maj'], false, 0.45), 6: S(true, [0, 1, 2], ['maj'], false, 0.45),
  7: S(true, [0, 1, 2, 3], ['7', 'maj7'], false, 0.45), 8: S(true, [0, 1, 2], ['maj'], true, 0.45), 9: S(true, [0, 1, 2], ['maj', '7'], false, 0.3),
  10: S(true, [0, 1, 2, 3], ['maj', '7', 'maj7'], false, 0.35),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const upTo = (n: number) => WAYS.slice(0, n).map((w) => w.id)
const LEVEL_TEXT: [string, string, number][] = [
  ['Straight or from below', 'Hear a chord, then a short line that lands on the chord\'s root. Does it go straight there, or lean in from a half step below?', 2],
  ['From above', 'Add a landing from the scale note above.', 3],
  ['Enclosure', 'Add the enclosure: above, then below, then the target. It circles the note before landing.', 4],
  ['Grace note', 'Add the grace note: a quick flick from a half step below, almost part of the note.', 5],
  ['Other targets', 'Now the line lands on the 3rd or the 5th of the chord.', 5],
  ['Any key', 'Every approach, any key, any chord tone.', 5],
  ['Over 7th chords', 'Over 7 and maj7 chords, and the 7th can be the target too.', 5],
  ['Two in a row', 'Two short lines, one after the other. Name how the second one lands.', 5],
  ['Faster', 'Quicker lines, as in a real solo.', 5],
  ['Everything', 'Every approach, chord and target.', 5],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, n], i) => ({ id: i + 1, name, blurb, items: upTo(n), modes: MAJ, lowRange: RANGE }))

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

interface Figure {
  /** The notes, with their spelling, role and time offset in gaps (the grace note sits just before the target). */
  notes: { midi: number; name: string; role: string; at: number; hold: number }[]
}

/** A short line ending on `target`, starting from another chord tone, decorated the given way. */
function figure(way: string, target: { midi: number; note: Note }, chordTones: { midi: number; note: Note }[], keyTonic: Note, rand: () => number): Figure {
  const scale = spellFrom(keyTonic, SCALES.major)
  // The scale note just above the target (a half or whole step).
  const aboveNote = scale.find((n) => [1, 2].includes((((pitchClass(n) - pitchClass(target.note)) % 12) + 12) % 12))!
  const above = target.midi + ((((pitchClass(aboveNote) - pitchClass(target.note)) % 12) + 12) % 12)
  const belowNote = spellFrom(target.note, [[6, 11]])[0]
  const below = target.midi - 1
  // Start on a chord tone at least a minor 3rd away, so the start is never mistaken for an approach note.
  const starts = chordTones.flatMap((t) => [t.midi - 12, t.midi, t.midi + 12].map((m) => ({ midi: m, note: t.note }))).filter((t) => Math.abs(t.midi - target.midi) >= 3 && Math.abs(t.midi - target.midi) <= 9)
  const start = pick(starts, rand)
  const n = (midi: number, note: Note, role: string, at: number, hold = 0.9) => ({ midi, name: noteLabel(note), role, at, hold })
  const t = (at: number) => n(target.midi, target.note, 'target', at, 3)
  switch (way) {
    case 'direct': {
      // A second chord tone on the way, also at least a minor 3rd from the target.
      const mid = pick(starts.filter((s) => s.midi !== start.midi), rand) ?? start
      return { notes: [n(start.midi, start.note, 'start', 0), n(mid.midi, mid.note, 'chord tone', 1), t(2)] }
    }
    case 'below':
      return { notes: [n(start.midi, start.note, 'start', 0), n(below, belowNote, 'approach', 1), t(2)] }
    case 'above':
      return { notes: [n(start.midi, start.note, 'start', 0), n(above, aboveNote, 'approach', 1), t(2)] }
    case 'enclosure':
      return { notes: [n(start.midi, start.note, 'start', 0), n(above, aboveNote, 'above', 1), n(below, belowNote, 'below', 2), t(3)] }
    default:
      // grace: a very short note right before the target
      return { notes: [n(start.midi, start.note, 'start', 0), n(below, belowNote, 'grace note', 1.8, 0.15), t(2)] }
  }
}

function build(setup: Setup, way: string, mode: Mode, tonicPc: number, type: string, targetIndex: number, seed: number): Question {
  let x = Math.floor(seed * 2147483646) + 1
  const rand = () => (x = (x * 48271) % 2147483647) / 2147483647
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const tones = spellFrom(tonic, TONES[type])
  const [v] = voiceProgression([{ rootPc: tonicPc, stack: STACK[type] }])
  const chordMidi = [v.bass, ...v.upper]
  const top = Math.max(...v.upper)
  // Melody notes above the chord, around the octave above middle C.
  const placed = tones.map((note) => ({ note, midi: atOrAbove(Math.max(top + 3, 66), pitchClass(note)) }))
  const target = placed[targetIndex]
  const symbol = chordName(tonic, type)

  const events: TimedEvent[] = [chordEvent(0, 99, chordMidi)]
  const steps: { label: string; notes: number[] }[] = [{ label: `${symbol} · ${tones.map(noteLabel).join(' ')}`, notes: chordMidi }]
  const stepOf: number[] = [0]
  const figures = setup.twice ? [pick(WAYS.filter((w) => w.id !== way), rand).id, way] : [way]
  let t = 0.9
  for (const [k, w] of figures.entries()) {
    const f = figure(w, k === figures.length - 1 ? target : pick(placed.filter((p) => p !== target), rand), placed, tonic, rand)
    for (const note of f.notes) {
      events.push(chordEvent(t + note.at * setup.gap, note.role === 'target' ? 1.6 : Math.min(note.hold, 0.95) * setup.gap, [note.midi]))
      steps.push({ label: `${note.role} · ${note.name}${note.role === 'target' ? ` (${TONE_WORD[TONES[type].findIndex((s) => pitchClass(spellFrom(tonic, [s])[0]) === note.midi % 12)]} of ${symbol})` : ''}`, notes: [note.midi] })
      stepOf.push(steps.length - 1)
    }
    t += (Math.max(...f.notes.map((n) => n.at)) + 1) * setup.gap + 1.4
  }
  // The chord rings under the whole line.
  events[0] = chordEvent(0, t + 0.6, chordMidi)
  const w = BY_ID.get(way)!
  return {
    root: 48 + tonicPc, item: way, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `Over ${symbol} in ${label}, the ${setup.twice ? 'second ' : ''}line lands on ${target.note ? noteLabel(target.note) : ''}, the ${TONE_WORD[targetIndex]}: it ${w.how} Try it: hold ${symbol} and play the line, then try the same approach on another chord tone.`,
    swap: (other) => build(setup, other, mode, tonicPc, type, targetIndex, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const type = pick(setup.types, rand)
  const targets = setup.targets.filter((i) => i < TONES[type].length)
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, type, pick(targets, rand), rand())
}

export const approachNotesExercise: ExerciseDef = {
  id: 'approach-notes',
  name: 'Approach notes and embellishments',
  blurb: 'Hear a short line land on a chord tone and name how it got there: straight, from a half step below, from the scale note above, an enclosure around it, or a quick grace note. These little moves make improvised lines sound like music instead of scales.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the line. How does it reach the note it lands on?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'approach' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
  tip: 'Aim for a chord tone (the 3rd is the strongest) and decorate the arrival: a half step below, the scale note above, or both. Any note sounds fine for a moment if it resolves to a chord tone.',
}
