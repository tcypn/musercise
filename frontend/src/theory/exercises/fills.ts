import { chordEvent, keyLabel, type VoicedChord } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import { SCALES } from '../scales'
import { noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Fills played in the gap at the end of a bar, before the next chord. The last two answers name where a fill lands. */
const FILLS: readonly (Item & { how: string })[] = [
  { id: 'run', short: 'Scale run', name: 'A scale run', hint: 'Step by step into the next chord', how: 'a run of scale notes, step by step, straight into a note of the next chord.' },
  { id: 'sus', short: 'Sus 4 → 3', name: 'A sus: 4 falling to 3', hint: 'The chord with a 4th that drops to the 3rd', how: 'the chord with its 3rd raised to the 4th (a sus4), falling back to the 3rd: a sigh, with no new notes needed.' },
  { id: 'sixths', short: '6ths', name: 'Notes in 6ths', hint: 'Two notes a 6th apart, stepping down together', how: 'two notes a 6th apart, stepping down the scale together into the next chord: the sweet pop, gospel and country fill.' },
  { id: 'slide', short: 'Slide', name: 'A slide (♭3 to 3)', hint: 'A quick slip up into the next chord\'s 3rd', how: 'a quick slip from a half step below into the 3rd of the next chord, as gospel and R&B players do.' },
  { id: 'thirds', short: '3rds', name: 'Notes in 3rds', hint: 'Two notes a 3rd apart, stepping together', how: 'two notes a 3rd apart, stepping down the scale together: close and smooth.' },
  { id: 'pent', short: 'Pentatonic', name: 'A pentatonic lick', hint: 'Three notes with a skip, from the pentatonic', how: 'a short lick from the major pentatonic, with a skip in it, landing on a note of the next chord. The pentatonic is the safest scale for fills.' },
  { id: 'to-root', short: 'Lands on root', name: 'Lands on the next chord\'s root', hint: 'The fill ends on the root of the new chord', how: 'the fill ends on the root of the next chord, right on beat 1: solid and final.' },
  { id: 'to-3rd', short: 'Lands on 3rd', name: 'Lands on the next chord\'s 3rd', hint: 'The fill ends on the 3rd of the new chord', how: 'the fill ends on the 3rd of the next chord, right on beat 1: it names the new chord\'s colour (major or minor) at once.' },
]
const BY_ID = new Map(FILLS.map((f) => [f.id, f]))
const items: readonly Item[] = FILLS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  moves: readonly [string, string][]
  beat: number
}
const ONE_FOUR: [string, string][] = [['I', 'IV']]
const MOVES: [string, string][] = [['I', 'IV'], ['I', 'V'], ['I', 'vi'], ['IV', 'I'], ['V', 'I'], ['vi', 'IV']]
const S = (anyKey: boolean, moves: [string, string][] = ONE_FOUR, beat = 0.62): Setup => ({ anyKey, moves, beat })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(false), 4: S(false), 5: S(false), 6: S(true),
  7: S(true, MOVES), 8: S(true, MOVES, 0.48), 9: S(true, MOVES), 10: S(true, MOVES, 0.55),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const KINDS = ['run', 'sus', 'sixths', 'slide', 'thirds', 'pent']
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Run or sus', 'A chord, a gap, then the next chord. In the gap: a scale run, or the chord with a 4th falling to the 3rd?', ['run', 'sus']],
  ['6ths', 'Add two notes a 6th apart stepping down together.', ['run', 'sus', 'sixths']],
  ['Slide', 'Add the gospel slide: a quick slip up into the next chord\'s 3rd.', ['run', 'sus', 'sixths', 'slide']],
  ['3rds', 'Add two notes a 3rd apart: closer than the 6ths.', ['run', 'sus', 'sixths', 'slide', 'thirds']],
  ['Pentatonic', 'Add a short pentatonic lick with a skip in it.', KINDS],
  ['Any key', 'All six fills, in any key.', KINDS],
  ['Other chord moves', 'Between other chords: I to V, I to vi, IV to I and more.', KINDS],
  ['Faster', 'At a quicker tempo, as in a pop song.', KINDS],
  ['Where it lands', 'A good fill ends on a note of the next chord, on its beat 1. Which one: the root or the 3rd?', ['to-root', 'to-3rd']],
  ['Everything', 'All six fills, any move, key and tempo.', KINDS],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const PENT = [0, 2, 4, 7, 9]
const atOrAbove = (from: number, pc: number) => from + ((((pc - from) % 12) + 12) % 12)
/** The chord tone `interval` semitones above the root (3 or 4 for the 3rd), as a pitch class. */
const thirdOf = (v: VoicedChord) => v.upper.map((m) => m % 12).find((pc) => [3, 4].includes((pc - v.bass + 120) % 12))!

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const spelled = new Map(spellFrom(tonic, SCALES.major).map((n, i) => [(tonicPc + MAJOR[i]) % 12, noteLabel(n)]))
  const nameOf = (m: number) => spelled.get(m % 12) ?? 'a half step below'
  const [from, to] = pick(setup.moves, rand)
  const { voiced, names } = voiceNumerals(tonicPc, [from, to])
  const [a, b] = voiced
  const landing = id === 'to-root' || id === 'to-3rd'
  const kind = landing ? pick(['run', 'sixths', 'thirds'], rand) : id
  // The note the fill lands on: the root or the 3rd of the next chord (a slide always goes to the 3rd;
  // a pentatonic lick to a chord tone in the pentatonic).
  const rootPc = b.bass % 12
  const inPent = (pc: number) => PENT.includes((pc - tonicPc + 120) % 12)
  const targetPc = id === 'to-root' ? rootPc : id === 'to-3rd' || kind === 'slide' ? thirdOf(b)
    : kind === 'pent' ? pick([rootPc, thirdOf(b)].filter(inPent).length ? [rootPc, thirdOf(b)].filter(inPent) : [rootPc], rand)
    : pick([rootPc, thirdOf(b)], rand)
  const target = atOrAbove(67, targetPc)
  const scaleNotes = Array.from({ length: 60 }, (_, i) => 48 + i).filter((m) => MAJOR.includes((m - tonicPc + 120) % 12))
  const pentNotes = scaleNotes.filter((m) => PENT.includes((m - tonicPc + 120) % 12))
  const stepsFrom = (list: number[], m: number, k: number) => list[list.indexOf(m) + k]
  const beat = setup.beat
  const at = (x: number, hold: number, notes: number[]) => chordEvent(x * beat, hold * beat, notes)

  // Bar 1: the first chord with its bass; the fill in beats 3 and 4; bar 2: the next chord with the landing note on top.
  const fill: { e: TimedEvent; label: string }[] = []
  switch (kind) {
    case 'run': {
      const below = [4, 3, 2, 1].map((k) => stepsFrom(scaleNotes, target, -k))
      below.forEach((m, i) => fill.push({ e: at(2 + i * 0.5, 0.5, [m]), label: `run · ${nameOf(m)}` }))
      break
    }
    case 'sixths':
    case 'thirds': {
      const gap = kind === 'sixths' ? 5 : 2 // scale steps between the two voices: a 6th, or a 3rd
      ;[3, 2, 1].forEach((k, i) => {
        const top = stepsFrom(scaleNotes, target, k)
        const low = stepsFrom(scaleNotes, top, -gap)
        fill.push({ e: at(2.5 + i * 0.5, 0.5, [low, top]), label: `${kind === 'sixths' ? '6th' : '3rd'} · ${nameOf(low)} ${nameOf(top)}` })
      })
      break
    }
    case 'sus': {
      const third = a.upper.find((m) => m % 12 === thirdOf(a))!
      const four = third + ((a.bass + 5 - third) % 12 + 12) % 12
      const sus = a.upper.map((m) => (m === third ? four : m)).sort((x, y) => x - y)
      fill.push({ e: at(2, 0.95, sus), label: `sus4 · ${nameOf(four)} for ${nameOf(third)}` })
      fill.push({ e: at(3, 0.95, a.upper), label: `back to the 3rd · ${nameOf(third)}` })
      break
    }
    case 'slide':
      fill.push({ e: at(3.82, 0.15, [target - 1]), label: 'slide · a half step below' })
      break
    default: {
      // pent: three pentatonic notes from above, stepping down the pentatonic, then the target
      const start = pentNotes.indexOf(target) >= 0 ? target : pentNotes.find((m) => m > target)!
      const notes = [3, 2, 1].map((k) => stepsFrom(pentNotes, start, k))
      notes.forEach((m, i) => fill.push({ e: at(2.5 + i * 0.5, 0.5, [m]), label: `lick · ${nameOf(m)}` }))
    }
  }
  const landLow = kind === 'sixths' ? stepsFrom(scaleNotes, target, -5) : kind === 'thirds' ? stepsFrom(scaleNotes, target, -2) : undefined
  const landNotes = [...b.upper.filter((m) => m < target && m !== landLow), ...(landLow !== undefined ? [landLow] : []), target].sort((x, y) => x - y)
  const word = targetPc === rootPc ? 'root' : '3rd'

  const events: TimedEvent[] = [at(0, 3.9, [a.bass]), at(0, 1.9, a.upper), ...fill.map((f) => f.e), at(4, 3.9, [b.bass]), at(4, 3, landNotes)]
  const steps = [{ label: `${names[0]}`, notes: [a.bass, ...a.upper] }, ...fill.map((f) => ({ label: f.label, notes: f.e.notes })), { label: `${names[1]} · lands on ${nameOf(target)}, the ${word}`, notes: [b.bass, ...landNotes] }]
  const stepOf = [0, 0, ...fill.map((_, i) => i + 1), steps.length - 1, steps.length - 1]
  const f = BY_ID.get(id)!
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `${names[0]} to ${names[1]} in ${label}: ${f.how}${landing ? '' : ` It lands on ${nameOf(target)}, the ${word} of ${names[1]}.`} Try it: hold ${names[0]}, play the fill in beats 3 and 4, and land on ${nameOf(target)} exactly on beat 1 of ${names[1]}.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const fillsExercise: ExerciseDef = {
  id: 'fills',
  name: 'Fills',
  blurb: 'Hear a chord, a short fill in the gap, and the next chord. Name the fill: a scale run, a sus 4 falling to 3, notes in 6ths or 3rds, a gospel slide, or a pentatonic lick. Then hear where a fill lands: the next chord\'s root or its 3rd.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the gap between the two chords. What fills it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'fill' },
  phrase: (item) => BY_ID.get(item.id)!.name.replace(/^./, (c) => c.toLowerCase()),
  tip: 'Fill only in the gaps (a long chord, the end of a sung line), keep it short, and end on a note of the next chord, its root or 3rd, right on beat 1. Safe notes: the key\'s pentatonic, or the chord\'s own notes. 6ths and 3rds stepping down the scale always sound sweet.',
}
