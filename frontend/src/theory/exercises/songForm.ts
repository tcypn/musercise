import { barEvents, type Pattern } from '../comping'
import { keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Two phrases compared, or the shape of a whole tune. */
const FORMS: readonly (Item & { how: string })[] = [
  { id: 'repeat', short: 'Repeat', name: 'The phrase repeats', hint: 'The same four chords again', how: 'the second phrase plays the same four chords again.' },
  { id: 'new', short: 'New', name: 'A new phrase', hint: 'Different chords from the start', how: 'the second phrase is new from its first chord: a new section.' },
  { id: 'ending', short: 'New ending', name: 'Same start, new ending', hint: 'Three chords the same, the last one changes', how: 'the second phrase starts like the first, but its last chord changes: the same section with a new ending, often to lead home.' },
  { id: 'AABA', short: 'AABA', name: 'AABA (with a bridge)', hint: 'A twice, a new B once, A again', how: 'A, A again, a new B (the bridge, heard once), then A comes back: the 32-bar form of many standards and ballads.' },
  { id: 'ABAB', short: 'ABAB', name: 'ABAB (verse, chorus)', hint: 'Two sections taking turns', how: 'two sections taking turns, A B A B: verse, chorus, verse, chorus, as in most pop songs.' },
  { id: 'AABB', short: 'AABB', name: 'AABB', hint: 'A twice, then B twice', how: 'A twice, then B twice: each section repeats before the next, as in many folk tunes and dances.' },
  { id: 'blues', short: '12-bar blues', name: '12-bar blues', hint: 'I I I I, IV IV I I, V IV I V', how: 'twelve bars: four of I, two of IV, two of I, then V, IV, I and a V that turns around to the start. The 12-bar blues, behind blues, rock and roll and a lot of R&B.' },
]
const BY_ID = new Map(FORMS.map((f) => [f.id, f]))
const items: readonly Item[] = FORMS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const LOOPS = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['IV', 'I', 'V', 'vi'], ['ii', 'V', 'I', 'vi'], ['I', 'IV', 'ii', 'V'], ['iii', 'vi', 'ii', 'V'], ['IV', 'V', 'iii', 'vi']]
const BLUES = ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7']
const ENDINGS = ['I', 'IV', 'V', 'vi', 'ii']

interface Setup {
  anyKey: boolean
  patterns: readonly Pattern[]
  beat: number
}
const S = (anyKey: boolean, patterns: Pattern[] = ['basic'], beat = 0.4): Setup => ({ anyKey, patterns, beat })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(true), 4: S(false), 5: S(false), 6: S(false), 7: S(true),
  8: S(true, ['push', 'rnb', 'gospel', 'ballad']), 9: S(true, ['basic', 'push'], 0.32), 10: S(true, ['basic', 'push', 'rnb', 'ballad'], 0.36),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const SONG = ['AABA', 'ABAB', 'AABB', 'blues']
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Repeat or new', 'Two phrases of four chords, one chord per bar. Is the second the same as the first, or new?', ['repeat', 'new']],
  ['New ending', 'Add a phrase that starts the same but changes its last chord.', ['repeat', 'new', 'ending']],
  ['Any key', 'The same three, in any key.', ['repeat', 'new', 'ending']],
  ['AABA or ABAB', 'Now a whole tune: four sections of four bars. Call the first section A; is the rest A A B A, or B A B?', ['AABA', 'ABAB']],
  ['AABB', 'Add AABB: each section twice.', ['AABA', 'ABAB', 'AABB']],
  ['12-bar blues', 'Add the 12-bar blues: twelve bars of I, IV and V.', ['blues', 'AABA', 'ABAB']],
  ['Any key', 'All four song shapes, in any key.', SONG],
  ['With a groove', 'Played with different comping patterns, as a band would.', SONG],
  ['Faster', 'At a quicker tempo: keep track of the sections.', SONG],
  ['Everything', 'Phrases and song shapes, any key, groove and tempo.', FORMS.map((f) => f.id)],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

/** The bars of the answer, as numerals with the section each belongs to. */
function plan(id: string, rand: () => number): { numerals: string[]; sections: string[] } {
  if (id === 'blues') return { numerals: BLUES, sections: BLUES.map((_, i) => `bar ${i + 1}`) }
  const a = pick(LOOPS, rand)
  // B is a different loop that does not start like A, so it is heard as new from its first bar.
  const b = pick(LOOPS.filter((l) => l[0] !== a[0]), rand)
  if (id === 'repeat' || id === 'new' || id === 'ending') {
    const end = pick(ENDINGS.filter((n) => n !== a[3] && n !== a[2]), rand)
    const second = id === 'repeat' ? a : id === 'new' ? b : [...a.slice(0, 3), end]
    return { numerals: [...a, ...second], sections: [...a.map(() => '1st'), ...second.map(() => '2nd')] }
  }
  const parts = id.split('')
  return { numerals: parts.flatMap((p) => (p === 'A' ? a : b)), sections: parts.flatMap((p) => [p, p, p, p]) }
}

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const form = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const { numerals, sections } = plan(id, rand)
  const pattern = pick(setup.patterns, rand)
  const { voiced, names } = voiceNumerals(tonicPc, numerals)
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  voiced.forEach((v, i) => {
    const bar = barEvents(v, pattern, i * 4 * setup.beat, setup.beat, rand)
    events.push(...bar)
    stepOf.push(...bar.map(() => i))
  })
  const isPhrase = id === 'repeat' || id === 'new' || id === 'ending'
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf,
    steps: voiced.map((v, i) => ({ label: `${sections[i]} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    explain: `${form.name} in ${label}: ${form.how} Try it: ${isPhrase ? 'play the first phrase, then make up a second phrase of each kind.' : 'play it through on the piano and say the section letter on each first bar, so you always know where you are.'}`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const songFormExercise: ExerciseDef = {
  id: 'song-form',
  name: 'Song structure',
  blurb: 'Hear chord phrases and whole tunes and name their shape: a phrase that repeats, a new one, a new ending; AABA, ABAB, AABB and the 12-bar blues. Knowing where you are in a song lets you get ready for the next section.',
  hintLabel: 'Shape:',
  question: 'Follow the chords. What is the shape?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'song' },
  phrase: (item) => BY_ID.get(item.id)!.name.toLowerCase().replace('aaba', 'AABA').replace('abab', 'ABAB').replace('aabb', 'AABB'),
  tip: 'Count bars in fours and notice when the first chord of a section comes back. A new section usually starts on a new chord; a repeat starts on the same one. In a 12-bar blues, the IV chord arrives in bar 5.',
}
