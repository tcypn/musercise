import { SUFFIX } from '../harmony'
import { KEYS_BY_FIFTHS, noteLabel, pitchClass, spellFrom, type KeyDef, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

// ---- Chords of a major key ------------------------------------------------------------------------

/** The chords used here: root step from the tonic, and the triad or 7th built on it. */
const DEGREES: Record<string, { step: Step; triad: string; seventh: string }> = {
  I: { step: [0, 0], triad: 'maj', seventh: 'maj7' },
  ii: { step: [1, 2], triad: 'min', seventh: 'm7' },
  iii: { step: [2, 4], triad: 'min', seventh: 'm7' },
  IV: { step: [3, 5], triad: 'maj', seventh: 'maj7' },
  V: { step: [4, 7], triad: 'maj', seventh: '7' },
  vi: { step: [5, 9], triad: 'min', seventh: 'm7' },
}
const TONES: Record<string, readonly Step[]> = {
  maj: [[0, 0], [2, 4], [4, 7]],
  min: [[0, 0], [2, 3], [4, 7]],
  maj7: [[0, 0], [2, 4], [4, 7], [6, 11]],
  m7: [[0, 0], [2, 3], [4, 7], [6, 10]],
  '7': [[0, 0], [2, 4], [4, 7], [6, 10]],
}
const POSITION = ['root position', '1st inversion', '2nd inversion', '3rd inversion']

const ascii = (s: string) => s.replaceAll('♯', '#').replaceAll('♭', 'b')

interface Chord {
  symbol: string
  tones: Note[]
}
function chordOf(key: KeyDef, numeral: string, seventh: boolean): Chord {
  const d = DEGREES[numeral]
  const root = spellFrom(key.tonic, [d.step])[0]
  const type = seventh ? d.seventh : d.triad
  return { symbol: `${noteLabel(root)}${SUFFIX[type]}`, tones: spellFrom(root, TONES[type]) }
}

const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)

/** A chord in close position with tone `inv` at the bottom, lowest note at or above `from`. */
function place(c: Chord, inv: number, from: number): number[] {
  const n = c.tones.length
  const out = [atOrAbove(from, pitchClass(c.tones[inv]))]
  for (let i = 1; i < n; i++) out.push(atOrAbove(out[i - 1] + 1, pitchClass(c.tones[(inv + i) % n])))
  return out
}
/** Semitones the hand moves: each finger (lowest to lowest, next to next...) to its new note. */
const movement = (a: number[], b: number[]) => a.reduce((s, m, i) => s + Math.abs(m - b[i]), 0)

/** Where an inversion of the next chord lands nearest the current one, and how far the hand moves. */
function nearest(c: Chord, inv: number, current: number[]): { notes: number[]; moved: number } {
  let best = { notes: [] as number[], moved: Infinity }
  for (let from = current[0] - 12; from <= current[0] + 12; from++) {
    const notes = place(c, inv, from)
    if (notes[0] !== from) continue
    const moved = movement(current, notes)
    if (moved < best.moved) best = { notes, moved }
  }
  return best
}

// ---- Questions, worked out once for every level -------------------------------------------------

interface Config {
  key: KeyDef
  from: Chord
  fromInv: number
  to: Chord
  answer: number
  current: number[]
  options: { notes: number[]; moved: number }[]
}
const answerId = (c: Chord, inv: number) => `${ascii(c.symbol)}-${inv}`

function configsFor(keys: readonly KeyDef[], pairs: readonly [string, string][], seventh: boolean): Config[] {
  const out: Config[] = []
  for (const key of keys) {
    for (const [a, b] of pairs) {
      const from = chordOf(key, a, seventh)
      const to = chordOf(key, b, seventh)
      for (let fromInv = 0; fromInv < from.tones.length; fromInv++) {
        // The current chord sits around middle C.
        const current = place(from, fromInv, 55)
        const options = to.tones.map((_, inv) => nearest(to, inv, current))
        const least = Math.min(...options.map((o) => o.moved))
        const winners = options.flatMap((o, inv) => (o.moved === least ? [inv] : []))
        if (winners.length === 1) out.push({ key, from, fromInv, to, answer: winners[0], current, options })
      }
    }
  }
  return out
}

const keysNamed = (...labels: string[]) => KEYS_BY_FIFTHS.filter((k) => labels.includes(noteLabel(k.tonic)))
const C = keysNamed('C')
const G_F = keysNamed('G', 'F')
const loopPairs = (...loops: string[][]) => loops.flatMap((l) => l.map((n, i) => [n, l[(i + 1) % l.length]] as [string, string]))
const POP = ['I', 'V', 'vi', 'IV']
const OTHER_LOOPS = [['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['I', 'IV', 'V', 'I']]
const ALL_PAIRS: [string, string][] = Object.keys(DEGREES).flatMap((a) => Object.keys(DEGREES).filter((b) => b !== a).map((b) => [a, b] as [string, string]))
const SEVENTH_LOOPS = [['I', 'vi', 'ii', 'V'], ['ii', 'V', 'I', 'vi'], ['I', 'IV', 'iii', 'vi']]

const LEVEL_CONFIGS: Record<number, Config[]> = {
  1: configsFor(C, [['I', 'V'], ['I', 'IV'], ['I', 'vi']], false),
  2: configsFor(C, loopPairs(POP), false),
  3: configsFor(C, loopPairs(...OTHER_LOOPS), false),
  4: configsFor(G_F, loopPairs(POP, ...OTHER_LOOPS), false),
  5: configsFor(KEYS_BY_FIFTHS, loopPairs(POP, ...OTHER_LOOPS), false),
  6: configsFor(KEYS_BY_FIFTHS, ALL_PAIRS, false),
  7: configsFor(C, loopPairs(...SEVENTH_LOOPS), true),
  8: configsFor(KEYS_BY_FIFTHS, loopPairs(...SEVENTH_LOOPS), true),
  9: configsFor(KEYS_BY_FIFTHS, [['ii', 'V'], ['V', 'I']], true),
  10: [...configsFor(KEYS_BY_FIFTHS, ALL_PAIRS, false), ...configsFor(KEYS_BY_FIFTHS, ALL_PAIRS, true)],
}

const byAnswer = new Map<number, Map<string, Config[]>>()
const itemInfo = new Map<string, Item>()
for (const [level, all] of Object.entries(LEVEL_CONFIGS)) {
  // Every inversion offered is also asked somewhere, so keep only next chords where each inversion can be the answer.
  const reachable = new Map<string, Set<number>>()
  for (const c of all) reachable.set(c.to.symbol, (reachable.get(c.to.symbol) ?? new Set()).add(c.answer))
  const configs = all.filter((c) => reachable.get(c.to.symbol)!.size === c.to.tones.length)
  const map = new Map<string, Config[]>()
  for (const c of configs) {
    const id = answerId(c.to, c.answer)
    map.set(id, [...(map.get(id) ?? []), c])
    // Every inversion of the next chord is offered, so every one needs an answer tile.
    c.to.tones.forEach((t, inv) => {
      const notes = c.to.tones.map((_, i) => noteLabel(c.to.tones[(inv + i) % c.to.tones.length]))
      itemInfo.set(answerId(c.to, inv), { id: answerId(c.to, inv), short: notes.join(' '), name: `${c.to.symbol}, ${POSITION[inv]}`, hint: `${noteLabel(t)} at the bottom` })
    })
  }
  byAnswer.set(Number(level), map)
}
const items: readonly Item[] = [...itemInfo.values()]

const LEVEL_TEXT: [string, string][] = [
  ['C to G, F or Am', 'Your right hand is on a C chord. Pick the inversion of the next chord that moves your fingers least: keep shared notes, move the others a step.'],
  ['The pop loop', 'Along I–V–vi–IV (C G Am F), from any inversion.'],
  ['Other loops', 'I–vi–IV–V, vi–IV–I–V and I–IV–V–I.'],
  ['G and F major', 'The same loops in G and F.'],
  ['Any key', 'The loops in every major key.'],
  ['With ii and iii', 'Any two chords of the key, ii and iii too.'],
  ['7th chords', 'Four notes: four inversions to choose from. In C.'],
  ['7th chords, any key', '7th-chord loops in every key.'],
  ['ii-V-I', 'Dm7 → G7 → Cmaj7 in every key: the smoothest move in jazz and R&B.'],
  ['Everything', 'Triads and 7ths, any two chords, any key.'],
]
const QUIZ = ['chord'] as const satisfies readonly Mode[]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({
  id: i + 1, name, blurb, items: [...byAnswer.get(i + 1)!.keys()], modes: QUIZ, lowRange: [48, 72] as const,
}))

// ---- One question ----------------------------------------------------------------------------------

/** "C down to B, E down to D, G stays" */
function moves(c: Config): string {
  const target = c.options[c.answer].notes
  const name = (m: number, chord: Chord) => noteLabel(chord.tones.find((t) => pitchClass(t) === m % 12)!)
  return c.current
    .map((m, i) => {
      const d = target[i] - m
      if (d === 0) return `${name(m, c.from)} stays`
      return `${name(m, c.from)} ${d > 0 ? 'up' : 'down'} to ${name(target[i], c.to)}`
    })
    .join(', ')
}

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  const options = byAnswer.get(level.id)!.get(item.id)!
  const c = options[Math.floor(rand() * options.length)]
  const spelled = (chord: Chord, inv: number) => chord.tones.map((_, i) => noteLabel(chord.tones[(inv + i) % chord.tones.length])).join(' ')
  const moved = c.options[c.answer].moved
  return {
    root: c.current[0], item: item.id, mode: 'chord', notes: c.current,
    prompt: { text: `You are on ${c.from.symbol} (${spelled(c.from, c.fromInv)}). Next: ${c.to.symbol}. Which ${c.to.symbol} moves your hand least?`, lit: c.current },
    choices: c.to.tones.map((_, inv) => answerId(c.to, inv)),
    explain: `${spelled(c.from, c.fromInv)} → ${spelled(c.to, c.answer)}: ${moves(c)} (${moved} semitone${moved === 1 ? '' : 's'} in all). Try it: play the two chords this way with your right hand, then keep going round the loop.`,
  }
}

export const voiceLeadingExercise: ExerciseDef = {
  id: 'voice-leading',
  name: 'Voice leading',
  kind: 'quiz',
  blurb: 'Move from chord to chord with your right hand barely moving: keep the notes two chords share, and move the others to the nearest note. This is what makes accompaniment sound smooth instead of blocky.',
  rangeWord: 'chord',
  hintLabel: 'Notes:',
  question: 'Pick the inversion that moves your hand least.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'next chord' },
  tip: 'Keep the notes two chords share, and move the others to the nearest note. Your right hand should barely move: C E G → B D G moves just two fingers by a step.',
  phrase: (item) => `${item.short} (${item.name})`,
}
