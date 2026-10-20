import { chordEvent } from '../harmony'
import { noteLabel } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'
import { chordToPlay, judgeChord, PLAY_BY_ID, PLAY_CHORDS } from './playShared'

const IDS = ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7']
const items: readonly Item[] = PLAY_CHORDS.filter((c) => IDS.includes(c.id)).map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  roots: readonly number[]
  /** Say the root's name, or only play the bass note first. */
  tellRoot: boolean
}
const ANY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const S = (tellRoot: boolean, roots: number[] = ANY): Setup => ({ roots, tellRoot })
const SETUP: Record<number, Setup> = {
  1: S(true, [0, 5, 7]), 2: S(true), 3: S(true), 4: S(true), 5: S(true), 6: S(true), 7: S(true),
  8: S(false), 9: S(false), 10: S(false),
}

const CHORD = ['chord'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Major or minor, root given', 'Hear a chord and play it back. The app tells you the root; your ear finds major or minor.', ['maj', 'min']],
  ['Any root', 'Major and minor on any root, still named for you.', ['maj', 'min']],
  ['Diminished', 'Add diminished: tense and dark.', ['maj', 'min', 'dim']],
  ['Augmented', 'Add augmented: bright and unsettled.', ['maj', 'min', 'dim', 'aug']],
  ['7 and maj7', 'Four-note chords: the bluesy 7 or the dreamy maj7.', ['7', 'maj7']],
  ['Minor 7th', 'Add m7: soft and warm.', ['7', 'maj7', 'm7']],
  ['Triads and 7ths', 'Major, minor, 7 and m7 together.', ['maj', 'min', '7', 'm7']],
  ['Find the root too', 'No name now: the low note sounds first, and it is the root. Find it, then the chord.', ['maj', 'min']],
  ['More chords, root by ear', 'Triads and 7ths, root by ear.', ['maj', 'min', 'dim', '7', 'm7']],
  ['Everything', 'Any chord, any root, by ear.', IDS],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: CHORD, lowRange: [48, 84] as const }))

function build(setup: Setup, id: string, rootPc: number): Question {
  const chord = PLAY_BY_ID.get(id)!
  const play = chordToPlay(id, rootPc)
  const rootName = noteLabel(play.spelled[0])
  const bass = 36 + rootPc
  // Without the name, the root sounds low first, then the chord with it.
  const events = setup.tellRoot ? [chordEvent(0, 2.4, play.notes)] : [chordEvent(0, 1.2, [bass]), chordEvent(1.3, 2.4, [bass, ...play.notes])]
  return {
    root: play.notes.find((m) => m % 12 === rootPc)!, item: id, mode: 'chord', notes: play.notes,
    prompt: { text: setup.tellRoot ? `The root is ${rootName}. Play the chord you hear.` : 'Find the root (the low note), then play the chord you hear.' },
    target: { pcs: play.pcs },
    events,
    explain: `That was ${play.symbol}: ${play.spelled.map(noteLabel).join(' ')}, ${chord.hint.toLowerCase()}. Try it: play it, then sing its notes from the root up.`,
    swap: (other) => build(setup, other, rootPc),
  }
}

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, setup.roots[Math.floor(rand() * setup.roots.length)])
}

export const playBackExercise: ExerciseDef = {
  id: 'play-back',
  name: 'Hear it, play it',
  kind: 'play',
  playFirst: true,
  blurb: 'Hear a chord and play it back, on a connected piano or by tapping the keys. First the root is named and your ear finds the kind of chord; later you find the root by ear too. This is exactly what working out a song\'s chords feels like.',
  rangeWord: 'chord',
  hintLabel: 'Recipe:',
  question: 'Play the chord you hear.',
  items,
  levels,
  makeQuestion,
  judge: (q, midis) => judgeChord(q, midis, IDS),
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'chord' },
  phrase: (item) => `a ${item.name.toLowerCase()}`,
  tip: 'Hum the lowest note first: that is usually the root. Then play the major chord on it and listen: if it sounds brighter than what you heard, try minor. For 7ths, listen for the note just under the octave.',
}
