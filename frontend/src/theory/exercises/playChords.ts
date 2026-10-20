import { chordEvent, keyLabel } from '../harmony'
import { MAJOR_SCALE, noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'
import { chordToPlay, judgeChord, PLAY_BY_ID, PLAY_CHORDS } from './playShared'

const items: readonly Item[] = PLAY_CHORDS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** In a key: the scale steps where each kind of chord grows, with its numeral. */
const IN_KEY: Record<string, [number, string][]> = {
  maj: [[0, 'I'], [3, 'IV'], [4, 'V']],
  min: [[1, 'ii'], [2, 'iii'], [5, 'vi']],
  dim: [[6, 'vii°']],
  '7': [[4, 'V7']],
  maj7: [[0, 'Imaj7'], [3, 'IVmaj7']],
  m7: [[1, 'ii7'], [2, 'iii7'], [5, 'vi7']],
  m7b5: [[6, 'viiø7']],
}

interface Setup {
  roots: readonly number[]
  inKey: boolean
}
const ANY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const S = (roots: number[] = ANY, inKey = false): Setup => ({ roots, inKey })
const SETUP: Record<number, Setup> = {
  1: S([0, 5, 7]), 2: S(), 3: S(), 4: S(), 5: S(), 6: S(), 7: S(), 8: S(), 9: S(ANY, true), 10: S(),
}

const CHORD = ['chord'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Major and minor on C, F, G', 'The app names a chord; play it, on your piano or by tapping the keys, then press Check. Any octave and any order count.', ['maj', 'min']],
  ['Major and minor, any root', 'Major and minor triads on all twelve roots, black keys too.', ['maj', 'min']],
  ['Diminished', 'Add diminished: a minor 3rd and a flat 5th.', ['maj', 'min', 'dim']],
  ['Augmented', 'Add augmented: a major 3rd and a sharp 5th.', ['maj', 'min', 'dim', 'aug']],
  ['7 and maj7', 'Four-note chords: the flat 7th (C7) or the major 7th (Cmaj7).', ['7', 'maj7']],
  ['Minor 7th', 'Add m7.', ['7', 'maj7', 'm7']],
  ['Half-diminished', 'Add m7♭5, the ii of a minor key.', ['7', 'm7', 'm7b5']],
  ['Slash chords', 'C/E means a C chord with E as the lowest note: play the bass first, then the chord above it.', ['maj/3', 'maj/5', 'min/3', 'min/5']],
  ['From a numeral', 'A chord sheet in numbers: work out the chord from the key and play it ("vi7 in G" is Em7).', ['maj', 'min', 'dim', '7', 'maj7', 'm7', 'm7b5']],
  ['Everything', 'Triads, 7ths and slash chords on any root.', ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7', 'm7b5', 'maj/3', 'min/3']],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: CHORD, lowRange: [48, 84] as const }))

function build(id: string, rootPc: number, keyPc: number | null): Question {
  const chord = PLAY_BY_ID.get(id)!
  let prompt: string
  let play: ReturnType<typeof chordToPlay>
  // In a key, the chord grows on the step of the key that fits it (another answer swapped in may not fit: then it is named plainly).
  const inKey = keyPc === null ? undefined : IN_KEY[chord.id]?.find(([d]) => (keyPc + MAJOR_SCALE[d][1]) % 12 === rootPc)
  if (keyPc !== null && inKey) {
    const [degree, numeral] = inKey
    const { tonic, label } = keyLabel(keyPc, 'major')
    const root = spellFrom(tonic, [MAJOR_SCALE[degree]])[0]
    play = chordToPlay(id, rootPc, root)
    prompt = `Play ${numeral} in ${label}`
  } else {
    play = chordToPlay(id, rootPc)
    prompt = `Play ${play.symbol}`
  }
  const names = play.spelled.map(noteLabel).join(' ')
  return {
    root: play.notes.find((m) => m % 12 === rootPc)!, item: id, mode: 'chord', notes: play.notes,
    prompt: { text: prompt },
    target: { pcs: play.pcs, bass: play.bass },
    events: [chordEvent(0, 2.4, play.notes)],
    explain: `${play.symbol} is ${names}${chord.bassTone !== undefined ? `, with ${noteLabel(play.spelled[chord.bassTone])} lowest` : ''}: ${chord.hint.toLowerCase()}. Try it: play it again in another octave, then move it up a half step.`,
    swap: (other) => build(other, rootPc, keyPc),
  }
}

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  if (setup.inKey) {
    const keyPc = Math.floor(rand() * 12)
    const [degree] = IN_KEY[item.id][Math.floor(rand() * IN_KEY[item.id].length)]
    return build(item.id, (keyPc + MAJOR_SCALE[degree][1]) % 12, keyPc)
  }
  return build(item.id, setup.roots[Math.floor(rand() * setup.roots.length)], null)
}

export const playChordsExercise: ExerciseDef = {
  id: 'play-chords',
  name: 'Play the chord',
  kind: 'play',
  blurb: 'The app names a chord and you play it, on a connected piano or by tapping the keys on screen. Triads, 7ths, slash chords and chords from numerals: the chord sheet, straight into your hands.',
  rangeWord: 'chord',
  hintLabel: 'Recipe:',
  question: 'Play the chord.',
  items,
  levels,
  makeQuestion,
  judge: (q, midis) => judgeChord(q, midis, PLAY_CHORDS.map((c) => c.id)),
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'chord' },
  phrase: (item) => `a ${item.name.toLowerCase()}`,
  tip: 'Find the root, then stack the 3rd and 5th (and the 7th) by counting half steps: major 3rd = 4, minor 3rd = 3, 5th = 7, flat 7th = 10, major 7th = 11. Say the notes as you play them.',
}
