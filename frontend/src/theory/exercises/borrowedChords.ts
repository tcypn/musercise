import { barEvents, type Pattern } from '../comping'
import { chordName, keyContext, keyLabel, STACK, voiceProgression } from '../harmony'
import type { TimedEvent } from '../practice'
import { spellFrom, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Chords of a major key, as [numeral, letters, semitones, triad, 7th, 9th]. */
type Chord = { numeral: string; step: Step; triad: string; seventh: string; ninth: string }
const C = (numeral: string, step: Step, triad: string, seventh: string, ninth: string): Chord => ({ numeral, step, triad, seventh, ninth })
const DIATONIC: Record<string, Chord> = {
  I: C('I', [0, 0], 'maj', 'maj7', 'maj9'), ii: C('ii', [1, 2], 'min', 'm7', 'm9'), IV: C('IV', [3, 5], 'maj', 'maj7', 'maj9'),
  V: C('V', [4, 7], 'maj', '7', '9'), vi: C('vi', [5, 9], 'min', 'm7', 'm9'),
}

/** The chord from outside the key, a few loops it is heard in, and what it does. */
const OUTSIDE: readonly (Item & { chord: Chord; loops: string[][]; what: string; tryIt: string })[] = [
  { id: 'iv', short: 'iv', name: 'Minor iv (borrowed)', hint: 'IV turned minor: a sad, warm sigh', chord: C('iv', [3, 5], 'min', 'm7', 'm9'), loops: [['I', 'IV', 'iv', 'I'], ['I', 'vi', 'iv', 'I'], ['I', 'iv', 'I', 'V']], what: 'the minor iv, borrowed from the minor key: IV with its 3rd lowered, a sad, warm sigh before home.', tryIt: 'play C F Fm C: only one note moves, A down to A♭.' },
  { id: 'bVII', short: '♭VII', name: '♭VII (borrowed)', hint: 'Big and rock: a whole step below home', chord: C('♭VII', [6, 10], 'maj', '7', '9'), loops: [['I', 'bVII', 'IV', 'I'], ['I', 'V', 'bVII', 'IV'], ['I', 'bVII', 'I', 'V']], what: '♭VII, borrowed from the minor key: a major chord a whole step below home, the big rock and gospel sound.', tryIt: 'play C B♭ F C, the "Hey Jude" ending move.' },
  { id: 'bVI', short: '♭VI', name: '♭VI (borrowed)', hint: 'Dramatic, like a film score', chord: C('♭VI', [5, 8], 'maj', 'maj7', 'maj9'), loops: [['I', 'bVI', 'V', 'I'], ['I', 'IV', 'bVI', 'I'], ['I', 'vi', 'bVI', 'V']], what: '♭VI, borrowed from the minor key: dramatic and dark, a film-score moment.', tryIt: 'play C A♭ G C and listen to the A♭ fall to G.' },
  { id: 'bIII', short: '♭III', name: '♭III (borrowed)', hint: 'Bluesy and bold', chord: C('♭III', [2, 3], 'maj', 'maj7', 'maj9'), loops: [['I', 'bIII', 'IV', 'I'], ['I', 'bIII', 'ii', 'V']], what: '♭III, borrowed from the minor key: bluesy and bold, common in rock.', tryIt: 'play C E♭ F C, a rock staple.' },
  { id: 'V-V', short: 'V/V', name: 'V of V (secondary dominant)', hint: 'II major: pulls to V', chord: C('V/V', [1, 2], 'maj', '7', '9'), loops: [['I', 'V/V', 'V', 'I'], ['I', 'vi', 'V/V', 'V'], ['I', 'V/V', 'IV', 'I']], what: 'V of V: the ii chord turned major (D in C), a secondary dominant that pulls to V.', tryIt: 'play C D7 G C: D7 leans into G like G7 leans into C.' },
  { id: 'V-vi', short: 'V/vi', name: 'V of vi (secondary dominant)', hint: 'III major: pulls to the sad vi', chord: C('V/vi', [2, 4], 'maj', '7', '9'), loops: [['I', 'V/vi', 'vi', 'IV'], ['I', 'IV', 'V/vi', 'vi']], what: 'V of vi: the iii chord turned major (E in C), a secondary dominant that pulls to vi.', tryIt: 'play C E7 Am F: the G♯ in E7 rises to A.' },
  { id: 'V-ii', short: 'V/ii', name: 'V of ii (secondary dominant)', hint: 'VI major: pulls to ii', chord: C('V/ii', [5, 9], 'maj', '7', '9'), loops: [['I', 'V/ii', 'ii', 'V'], ['I', 'vi', 'V/ii', 'ii']], what: 'V of ii: the vi chord turned major (A in C), a secondary dominant that pulls to ii.', tryIt: 'play C A7 Dm G, the start of a classic turnaround.' },
]
const BY_ID = new Map(OUTSIDE.map((o) => [o.id, o]))
const items: readonly Item[] = OUTSIDE.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

type Colour = 'triad' | 'seventh' | 'ninth'
interface Setup {
  anyKey: boolean
  colour: Colour
  texture: Pattern
}
const SETUP: Record<number, Setup> = {
  1: { anyKey: false, colour: 'triad', texture: 'held' }, 2: { anyKey: false, colour: 'triad', texture: 'held' },
  3: { anyKey: false, colour: 'triad', texture: 'held' }, 4: { anyKey: false, colour: 'triad', texture: 'held' },
  5: { anyKey: false, colour: 'triad', texture: 'held' }, 6: { anyKey: false, colour: 'triad', texture: 'held' },
  7: { anyKey: true, colour: 'triad', texture: 'bass' }, 8: { anyKey: true, colour: 'seventh', texture: 'bass' },
  9: { anyKey: true, colour: 'ninth', texture: 'pop' }, 10: { anyKey: true, colour: 'seventh', texture: 'pop' },
}

const ALL = OUTSIDE.map((o) => o.id)
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const lv = (id: number, name: string, blurb: string, its: string[]): Level => ({ id, name, blurb, items: its, modes: MAJ, lowRange: RANGE })
const levels: readonly Level[] = [
  lv(1, 'iv or ♭VII', 'A loop in a major key with one chord from outside it. The minor iv sighs; ♭VII sounds big and rock. Which is it?', ['iv', 'bVII']),
  lv(2, '♭VI', 'Add ♭VI: dark and dramatic.', ['iv', 'bVII', 'bVI']),
  lv(3, '♭III', 'Add ♭III: bluesy and bold.', ['iv', 'bVII', 'bVI', 'bIII']),
  lv(4, 'V of V', 'Now a different kind of outside chord: a secondary dominant. II major (D in C) pulls to V.', ['iv', 'bVII', 'bVI', 'bIII', 'V-V']),
  lv(5, 'V of vi', 'Add III major (E in C), which pulls to the sad vi.', ['iv', 'bVII', 'bVI', 'bIII', 'V-V', 'V-vi']),
  lv(6, 'V of ii', 'Add VI major (A in C), which pulls to ii.', ALL),
  lv(7, 'Any key', 'Every outside chord, any key, with a bass line.', ALL),
  lv(8, '7th chords', 'With 7ths: secondary dominants become 7 chords (D7, E7, A7), as they usually are.', ALL),
  lv(9, 'R&B colours', '9th chords and a pop rhythm.', ALL),
  lv(10, 'Everything', 'Every outside chord, any key and colour.', ALL),
]

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, loopIndex: number): Question {
  const o = BY_ID.get(id)!
  const loop = o.loops[loopIndex % o.loops.length]
  const chords = loop.map((n) => (n === o.chord.numeral.replace('♭', 'b') || n === o.chord.numeral ? o.chord : DIATONIC[n]))
  const typeOf = (c: Chord) => (setup.colour === 'ninth' ? c.ninth : setup.colour === 'seventh' ? c.seventh : c.triad)
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: (tonicPc + c.step[1]) % 12, stack: STACK[typeOf(c)] })))
  const { tonic, label } = keyLabel(tonicPc, 'major')
  const names = chords.map((c) => chordName(spellFrom(tonic, [c.step])[0], typeOf(c)))

  const context = keyContext(48 + tonicPc, 'major', 'full')
  const start = context.end + 0.9
  const beat = 60 / 84
  const song: TimedEvent[] = []
  const stepOf: (number | null)[] = context.events.map(() => null)
  for (let pass = 0; pass < 2; pass++) {
    voiced.forEach((v, i) => {
      const bar = barEvents(v, setup.texture, start + (pass * 4 + i) * 4 * beat, beat, () => 0)
      song.push(...bar)
      stepOf.push(...bar.map(() => i))
    })
  }
  const outsideName = names[chords.indexOf(o.chord)]
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events: [...context.events, ...song],
    answerFrom: context.events.length,
    steps: voiced.map((v, i) => ({ label: `${chords[i].numeral} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    stepOf,
    explain: `In ${label}: ${names.join(' ')}. ${outsideName} is ${o.what} Try it${tonicPc === 0 ? "" : " in C"}: ${o.tryIt}`,
    swap: (other) => build(setup, other, mode, tonicPc, 0),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, Math.floor(rand() * 3))
}

export const borrowedChordsExercise: ExerciseDef = {
  id: 'borrowed-chords',
  name: 'Borrowed and secondary chords',
  blurb: 'A loop in a major key with one chord from outside it. Name it: a chord borrowed from the minor key (iv, ♭VII, ♭VI, ♭III), or a secondary dominant that pulls to another chord (V/V, V/vi, V/ii). They give pop, gospel and R&B their colour.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the loop. Which chord comes from outside the key?',
  partLabels: { key: 'The key', question: 'The loop' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'outside chord' },
  phrase: (item) => BY_ID.get(item.id)!.name,
}
