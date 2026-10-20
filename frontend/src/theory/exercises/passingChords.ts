import { chordEvent, keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { voiceNumerals } from '../rhythm'
import { SCALES } from '../scales'
import { noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/**
 * What a pianist slips in between two chords of a chord sheet. `sheet` is what is written; `played` is the first
 * bar as played: numerals with their length in beats and, for walks, the bass note (semitones above the tonic).
 */
interface Move {
  sheet: [string, string]
  played: { n: string; beats: number; bass?: number; added: boolean }[]
}
const PASSING: readonly (Item & { move: Move; how: string; tryIt: string })[] = [
  { id: 'none', short: 'Nothing', name: 'Nothing added', hint: 'Just the two chords on the sheet', move: { sheet: ['I', 'IV'], played: [{ n: 'I', beats: 4, added: false }] }, how: 'nothing is added: the two chords as written.', tryIt: 'play it as written, then try each of the other answers between the same chords' },
  { id: 'sec-dom', short: 'Add a 7', name: 'A 7th chord into the next chord', hint: 'C becomes C7 just before F', move: { sheet: ['I', 'IV'], played: [{ n: 'I', beats: 2, added: false }, { n: 'I7', beats: 2, added: true }] }, how: 'the first chord turns into a 7th chord (C7) just before the next one: a 7th chord pulls hard to the chord a 5th below, so it leads into IV.', tryIt: 'play C for two beats, add B♭ to make C7, then F' },
  { id: 'walk-up', short: 'Walk-up', name: 'A bass walk-up', hint: 'The bass climbs step by step to the next root', move: { sheet: ['I', 'IV'], played: [{ n: 'I', beats: 2, bass: 0, added: false }, { n: 'I', beats: 1, bass: 2, added: true }, { n: 'I', beats: 1, bass: 4, added: true }] }, how: 'the chord stays and the bass walks up the scale (C, D, E) to the next chord\'s root. The simplest way to join two chords.', tryIt: 'hold C in the right hand; left hand C, then D on 3 and E on 4, then F' },
  { id: 'minor-iv', short: 'Minor iv', name: 'The minor iv (IV iv I)', hint: 'F turns minor before going home', move: { sheet: ['IV', 'I'], played: [{ n: 'IV', beats: 2, added: false }, { n: 'iv', beats: 2, added: true }] }, how: 'the IV chord turns minor (F to Fm) before going home: one note drops a half step (A to A♭), the bittersweet sound of countless ballads.', tryIt: 'play F, lower its A to A♭ for Fm, then C' },
  { id: 'dim', short: 'Diminished', name: 'A diminished passing chord', hint: 'C, C♯dim, Dm: the bass rises a half step', move: { sheet: ['I', 'ii'], played: [{ n: 'I', beats: 2, added: false }, { n: '#idim', beats: 2, added: true }] }, how: 'a diminished chord on the half step between (C♯dim between C and Dm): the bass rises chromatically and the tension pulls into the next chord. A gospel and old-standard favourite.', tryIt: 'play C, then C♯ E G, then Dm: the bass climbs C, C♯, D' },
  { id: 'walk-down', short: 'Walk-down', name: 'A bass walk-down', hint: 'C, G/B, Am: the bass steps down', move: { sheet: ['I', 'vi'], played: [{ n: 'I', beats: 2, added: false }, { n: 'V', beats: 2, bass: 11, added: true }] }, how: 'the bass steps down C, B, A under the chords (C, G/B, Am): a slash chord fills the step. Heard in a great many pop ballads.', tryIt: 'play C, then G with B in the bass, then Am: the left hand walks C, B, A' },
  { id: 'two-five', short: 'ii-V', name: 'A ii-V into the chord', hint: 'Dm G before C', move: { sheet: ['IV', 'I'], played: [{ n: 'IV', beats: 2, added: false }, { n: 'ii', beats: 1, added: true }, { n: 'V', beats: 1, added: true }] }, how: 'a quick ii-V (Dm G) slipped in before the chord: the strongest way to lead into any chord, from jazz to worship songs.', tryIt: 'play F for two beats, Dm and G for one beat each, then C' },
]
const BY_ID = new Map(PASSING.map((p) => [p.id, p]))
const items: readonly Item[] = PASSING.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  beat: number
}
const S = (anyKey: boolean, beat = 0.7): Setup => ({ anyKey, beat })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(false), 4: S(false), 5: S(false), 6: S(false),
  7: S(true), 8: S(true, 0.5), 9: S(true, 0.9), 10: S(true, 0.6),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const upTo = (n: number) => PASSING.slice(0, n).map((p) => p.id)
const LEVEL_TEXT: [string, string, number][] = [
  ['A 7th into IV', 'Two chords from a chord sheet. Is anything slipped in between, or does C turn into C7 on its way to F?', 2],
  ['Walk-up', 'Add the bass walking up to the next chord.', 3],
  ['Minor iv', 'Add IV turning minor before going home.', 4],
  ['Diminished', 'Add the diminished chord on the half step between.', 5],
  ['Walk-down', 'Add the bass walking down: C, G/B, Am.', 6],
  ['ii-V', 'Add a quick ii-V before the chord.', 7],
  ['Any key', 'All seven, in any key.', 7],
  ['Faster', 'At a pop tempo, where the added chords go by quickly.', 7],
  ['Slower', 'At a ballad tempo.', 7],
  ['Everything', 'Any move, key and tempo.', 7],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, n], i) => ({ id: i + 1, name, blurb, items: upTo(n), modes: MAJ, lowRange: [36, 60] as const }))

function build(setup: Setup, id: string, mode: Mode, tonicPc: number): Question {
  const p = BY_ID.get(id)!
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const bassName = (semis: number) => noteLabel(spellFrom(tonic, [SCALES.major.find((s) => s[1] === semis)!])[0])
  const numerals = [...p.move.played.map((x) => x.n), p.move.sheet[1]]
  const { voiced, names } = voiceNumerals(tonicPc, numerals)
  const beat = setup.beat
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  const steps: { label: string; notes: number[] }[] = []
  let t = 0
  numerals.forEach((_, i) => {
    const part = p.move.played[i]
    const beats = part?.beats ?? 4
    const v = voiced[i]
    const bass = part?.bass !== undefined ? 36 + ((tonicPc + part.bass) % 12) : v.bass
    // In a walk-up the right hand holds its chord while the bass moves: strike it only when it changes.
    const sameChord = i > 0 && numerals[i - 1] === numerals[i]
    const evs = [chordEvent(t * beat, beats * beat * 0.95, [bass]), ...(sameChord ? [] : [chordEvent(t * beat, (numerals[i + 1] === numerals[i] ? 4 - t : beats) * beat * 0.95, v.upper)])]
    events.push(...evs)
    stepOf.push(...evs.map(() => i))
    const slash = part?.bass !== undefined && part.bass !== 0 ? (sameChord || numerals[i - 1] === numerals[i] ? `bass ${bassName(part.bass)}` : `${names[i]}/${bassName(part.bass)}`) : names[i]
    steps.push({ label: `${part?.added ? 'added' : 'on the sheet'} · ${slash}`, notes: [bass, ...v.upper] })
    t += beats
  })
  const sheet = `${names[0]} | ${names[numerals.length - 1]}`
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `The sheet says ${sheet} (${label}): ${p.how} Try it: ${p.tryIt}${tonicPc === 0 ? '' : ' (in C)'}.`,
    swap: (other) => build(setup, other, mode, tonicPc),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0)
}

export const passingChordsExercise: ExerciseDef = {
  id: 'passing-chords',
  name: 'Passing chords and walk-ups',
  blurb: 'A chord sheet gives the main chords; good players slip extra ones in between. Hear two chords and name what is added: a 7th chord, a bass walk-up or walk-down, the minor iv, a diminished chord, or a quick ii-V.',
  hintLabel: 'Sounds like:',
  question: 'Listen between the two chords. What is slipped in?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'move' },
  phrase: (item) => BY_ID.get(item.id)!.name.replace(/^./, (c) => c.toLowerCase()),
  tip: 'On beats 3 and 4 before a chord change, try one of these: turn the chord into a 7th (C7 to F), walk the bass up or down by step, make IV minor before I, or slip in a ii-V. Keep the chord on the sheet on beat 1 of its bar.',
}
