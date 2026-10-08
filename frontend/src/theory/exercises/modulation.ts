import { chordEvent, chordName, keyContext, keyLabel, STACK, voiceProgression, type Help, type KeyMode } from '../harmony'
import type { TimedEvent } from '../practice'
import { spellFrom, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Where the music goes after the first phrase: the new home, as [letters, semitones] above the old one. */
const MOVES: readonly (Item & { step: Step; mode: KeyMode; how: string })[] = [
  { id: 'none', short: 'Stays', name: 'Stays in the key', hint: 'Home is where it was', step: [0, 0], mode: 'major', how: 'The second phrase comes home to the same chord as the first.' },
  { id: 'up-whole', short: 'Whole up', name: 'Up a whole step', hint: 'The big lift of a last chorus', step: [1, 2], mode: 'major', how: 'Everything moves up 2 semitones: the classic lift for a last chorus.' },
  { id: 'up-half', short: 'Half up', name: 'Up a half step', hint: 'A small, bright lift', step: [1, 1], mode: 'major', how: 'Everything moves up 1 semitone: a small, bright lift.' },
  { id: 'to-V', short: 'To V', name: 'To the key of V', hint: 'Brighter, as if leaning forward', step: [4, 7], mode: 'major', how: 'The new home is the old V chord: a common move in the middle of a song or piece.' },
  { id: 'to-IV', short: 'To IV', name: 'To the key of IV', hint: 'Warmer, as if relaxing', step: [3, 5], mode: 'major', how: 'The new home is the old IV chord: warmer, a step "away".' },
  { id: 'to-relative', short: 'To vi', name: 'To the relative minor', hint: 'Same notes, but home turns sad', step: [5, 9], mode: 'minor', how: 'The new home is the old vi chord, as a minor key: the same notes, but home turns sad.' },
]
const BY_ID = new Map(MOVES.map((m) => [m.id, m]))
const items: readonly Item[] = MOVES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

/** Chords as [numeral, letters, semitones, type] above a key's home. */
type Degree = [string, number, number, string]
const MAJOR: Record<string, Degree> = {
  I: ['I', 0, 0, 'maj'], ii: ['ii', 1, 2, 'min'], IV: ['IV', 3, 5, 'maj'], V: ['V', 4, 7, 'maj'], V7: ['V7', 4, 7, '7'], vi: ['vi', 5, 9, 'min'],
}
const MINOR: Record<string, Degree> = {
  I: ['i', 0, 0, 'min'], ii: ['ii°', 1, 2, 'dim'], IV: ['iv', 3, 5, 'min'], V: ['V', 4, 7, 'maj'], V7: ['V7', 4, 7, '7'], vi: ['VI', 5, 8, 'maj'],
}
const FIRST = ['I', 'vi', 'IV', 'V', 'I']
const SECOND_PLAIN = ['I', 'IV', 'V', 'I']
const SECOND_PREPARED = ['V7', 'I', 'IV', 'V', 'I']

interface Setup {
  anyKey: boolean
  prepared: 'never' | 'always' | 'mixed'
  help: Help
}
const SETUP: Record<number, Setup> = {
  1: { anyKey: false, prepared: 'never', help: 'full' }, 2: { anyKey: false, prepared: 'never', help: 'full' },
  3: { anyKey: false, prepared: 'never', help: 'full' }, 4: { anyKey: false, prepared: 'never', help: 'full' },
  5: { anyKey: false, prepared: 'never', help: 'full' }, 6: { anyKey: true, prepared: 'never', help: 'full' },
  7: { anyKey: true, prepared: 'always', help: 'full' }, 8: { anyKey: true, prepared: 'never', help: 'full' },
  9: { anyKey: true, prepared: 'mixed', help: 'light' }, 10: { anyKey: true, prepared: 'mixed', help: 'light' },
}

const ALL = MOVES.map((m) => m.id)
const MAJ = ['major'] as const satisfies readonly Mode[]
const RANGE: readonly [number, number] = [36, 84]
const lv = (id: number, name: string, blurb: string, its: string[]): Level => ({ id, name, blurb, items: its, modes: MAJ, lowRange: RANGE })
const levels: readonly Level[] = [
  lv(1, 'Stay or lift', 'Hear the key, a phrase, then a second phrase. Does it come home to the same place, or has everything moved up a whole step?', ['none', 'up-whole']),
  lv(2, 'A half step', 'Add a lift of just a half step: smaller, but just as bright.', ['none', 'up-whole', 'up-half']),
  lv(3, 'To V', 'Add a move to the key of V: the new home is the old V chord.', ['none', 'up-whole', 'up-half', 'to-V']),
  lv(4, 'To IV', 'Add a move to the key of IV: the new home is the old IV chord.', ['none', 'up-whole', 'up-half', 'to-V', 'to-IV']),
  lv(5, 'Relative minor', 'Add a move to the relative minor: the same notes, but home becomes the sad vi chord.', ALL),
  lv(6, 'Any key', 'Every move, from any key.', ALL),
  lv(7, 'Prepared changes', 'The new key arrives through its own V7 chord, so the change is smooth instead of sudden.', ALL),
  lv(8, 'Sudden changes', 'Straight into the new key, no warning.', ALL),
  lv(9, 'Less help', 'Only the home chord plays first; changes may be smooth or sudden.', ALL),
  lv(10, 'Everything', 'Every move, any key, smooth or sudden.', ALL),
]

const STEP = 1.1

function build(setup: Setup, move: string, mode: Mode, tonicPc: number, prepared: boolean): Question {
  const m = BY_ID.get(move)!
  const { tonic: home, label: oldLabel } = keyLabel(tonicPc, 'major')
  // The new key by its usual name (A♭ up a half step is A major, not B𝄫).
  const newPc = (tonicPc + m.step[1]) % 12
  const { tonic: newHome, label: newLabel } = keyLabel(newPc, m.mode)
  const second = prepared ? SECOND_PREPARED : SECOND_PLAIN
  const table = m.mode === 'major' ? MAJOR : MINOR
  const chords: { label: string; rootPc: number; type: string; name: string }[] = [
    ...FIRST.map((n) => {
      const [numeral, l, s, type] = MAJOR[n]
      const root = spellFrom(home, [[l, s]])[0]
      return { label: `${numeral} in ${oldLabel}`, rootPc: (tonicPc + s) % 12, type, name: chordName(root, type) }
    }),
    ...second.map((n) => {
      const [numeral, l, s, type] = table[n]
      const root = spellFrom(newHome, [[l, s]])[0]
      return { label: `${numeral} in ${newLabel}`, rootPc: (newPc + s) % 12, type, name: chordName(root, type) }
    }),
  ]
  const voiced = voiceProgression(chords.map((c) => ({ rootPc: c.rootPc, stack: STACK[c.type] })))
  const context = keyContext(48 + tonicPc, 'major', setup.help)
  const start = context.end + 0.9
  // A short breath between the two phrases, so you hear them as two.
  const timeOf = (i: number) => start + i * STEP + (i >= FIRST.length ? 0.6 : 0)
  const song: TimedEvent[] = voiced.map((v, i) => chordEvent(timeOf(i), i === voiced.length - 1 ? 2.6 : STEP + 0.2, [v.bass, ...v.upper]))
  const names = chords.map((c) => c.name)
  return {
    root: 48 + tonicPc, item: move, mode, notes: [48 + tonicPc],
    events: [...context.events, ...song],
    answerFrom: context.events.length,
    steps: voiced.map((v, i) => ({ label: `${chords[i].label} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    stepOf: [...context.events.map(() => null), ...song.map((_, i) => i)],
    explain: move === 'none'
      ? `It stays in ${oldLabel}: ${names.join(' ')}. ${m.how}`
      : `From ${oldLabel} to ${newLabel}: ${names.slice(0, FIRST.length).join(' ')}, then ${names.slice(FIRST.length).join(' ')}. ${m.how} Try it: play I–IV–V–I in ${oldLabel}, then in ${newLabel}.`,
    swap: (other) => build(setup, other, mode, tonicPc, prepared),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const prepared = setup.prepared === 'always' || (setup.prepared === 'mixed' && rand() < 0.5)
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, prepared)
}

export const modulationExercise: ExerciseDef = {
  id: 'modulation',
  name: 'Key changes',
  blurb: 'Hear a phrase settle in a key, then a second phrase. Did the key change, and where to: up a whole step for the last chorus, up a half step, to IV, to V, or to the relative minor?',
  hintLabel: 'Sounds like:',
  question: 'Listen to both phrases. Where did the second one go?',
  partLabels: { key: 'The key', question: 'The two phrases' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.4 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'key change' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase(),
}
