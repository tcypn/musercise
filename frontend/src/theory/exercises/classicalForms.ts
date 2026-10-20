import { barEvents, type Pattern } from '../comping'
import { keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Classical shapes, built from four-bar sections. */
const FORMS: readonly (Item & { how: string })[] = [
  { id: 'binary', short: 'Binary (AB)', name: 'Binary form (AB)', hint: 'Two sections: A, then a different B', how: 'two sections: A, then a different B that ends at home. Many Baroque dances are binary.' },
  { id: 'ternary', short: 'Ternary (ABA)', name: 'Ternary form (ABA)', hint: 'A, something different, then A again', how: 'A, a contrasting B, then A again: the return of A makes it ternary, like many minuets and songs.' },
  { id: 'rondo', short: 'Rondo (ABACA)', name: 'Rondo (ABACA)', hint: 'A keeps coming back between new sections', how: 'A comes back again and again between new sections (B, then C): a rondo, often the lively last movement of a sonata.' },
  { id: 'variations', short: 'Variations', name: 'Theme and variations', hint: 'The same chords each time, played differently', how: 'the same theme three times, its chords unchanged, but played differently each time: theme and variations.' },
  { id: 'sonata', short: 'Sonata form', name: 'Sonata form (short)', hint: 'A, B in a new key, development, then A and B at home', how: 'A at home, B in the key a 5th up, a development that wanders through other chords, then A and B both at home: the recapitulation. A short sketch of sonata form.' },
]
const BY_ID = new Map(FORMS.map((f) => [f.id, f]))
const items: readonly Item[] = FORMS.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

const A_POOL = [['I', 'IV', 'V', 'I'], ['I', 'vi', 'IV', 'V'], ['I', 'V', 'vi', 'IV']]
const B_POOL = [['vi', 'ii', 'V', 'I'], ['IV', 'I', 'ii', 'V'], ['ii', 'V', 'iii', 'vi']]
const C_POOL = [['iii', 'vi', 'IV', 'V'], ['IV', 'iv', 'I', 'V']]
const DEVELOPMENT = ['vi', 'iii', 'ii', 'V7']
const VARIATIONS: Pattern[] = ['held', 'broken', 'arpeggio', 'pop']

interface Setup { anyKey: boolean; patterns: readonly Pattern[]; beat: number }
const S = (anyKey: boolean, patterns: Pattern[] = ['basic'], beat = 0.36): Setup => ({ anyKey, patterns, beat })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(false), 4: S(false), 5: S(false), 6: S(false), 7: S(true),
  8: S(true, ['ballad', 'pop', 'basic']), 9: S(true, ['basic', 'pop'], 0.3), 10: S(true, ['basic', 'ballad', 'pop'], 0.32),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = FORMS.map((f) => f.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['AB or ABA', 'Four-bar sections, one chord per bar. Does A come back at the end?', ['binary', 'ternary']],
  ['Rondo', 'Add the rondo: A returns between two different sections.', ['binary', 'ternary', 'rondo']],
  ['Variations', 'Ternary, or the same chords three times played differently?', ['ternary', 'variations']],
  ['Four forms', 'Binary, ternary, rondo, variations.', ['binary', 'ternary', 'rondo', 'variations']],
  ['Sonata form', 'Add sonata form: B first comes in a new key, then a development, then everything at home.', ['ternary', 'rondo', 'sonata']],
  ['All five', 'Every form.', ALL],
  ['Any key', 'All five in any key.', ALL],
  ['With texture', 'Played with different accompaniments.', ALL],
  ['Faster', 'At a quicker tempo.', ALL],
  ['Everything', 'Any form, key, texture and tempo.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

/** The sections of a form: their label, chords, key (semitones above home) and texture. */
function sections(id: string, rand: () => number, base: Pattern): { label: string; chords: string[]; shift: number; pattern: Pattern }[] {
  const a = pick(A_POOL, rand)
  const b = pick(B_POOL.filter((x) => x[0] !== a[0]), rand)
  const c = pick(C_POOL, rand)
  const sec = (label: string, chords: string[], shift = 0, pattern = base) => ({ label, chords, shift, pattern })
  switch (id) {
    case 'binary': return [sec('A', a.slice(0, 3).concat('V')), sec('B', b.slice(0, 3).concat('I'))]
    case 'ternary': return [sec('A', a), sec('B', b), sec('A', a)]
    case 'rondo': return [sec('A', a), sec('B', b), sec('A', a), sec('C', c), sec('A', a)]
    case 'variations': {
      const start = Math.floor(rand() * VARIATIONS.length)
      return [0, 1, 2].map((k) => sec(k === 0 ? 'theme' : `variation ${k}`, a, 0, VARIATIONS[(start + k) % VARIATIONS.length]))
    }
    default: return [sec('A', a), sec('B (new key)', b, 7), sec('development', DEVELOPMENT), sec('A', a), sec('B (home)', b)]
  }
}

function build(setup: Setup, id: string, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const form = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const parts = sections(id, rand, pick(setup.patterns, rand))
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  const steps: { label: string; notes: number[] }[] = []
  let bar = 0
  for (const part of parts) {
    const { voiced, names } = voiceNumerals((tonicPc + part.shift) % 12, part.chords)
    voiced.forEach((v, i) => {
      const evs = barEvents(v, part.pattern, bar * 4 * setup.beat, setup.beat, rand)
      events.push(...evs)
      stepOf.push(...evs.map(() => steps.length))
      steps.push({ label: `${part.label} · ${names[i]}`, notes: [...new Set(evs.flatMap((e) => e.notes))].sort((x, y) => x - y) })
      bar++
    })
  }
  return {
    root: 48 + tonicPc, item: id, mode: 'major', notes: [48 + tonicPc],
    events, stepOf, steps,
    explain: `${form.name} in ${label}: ${form.how} Try it: when you learn a piece, mark its sections with letters first.`,
    swap: (other) => build(setup, other, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const classicalFormsExercise: ExerciseDef = {
  id: 'classical-forms',
  name: 'Classical forms',
  noYourTurn: true,
  blurb: 'Hear a short piece in four-bar sections and name its shape: binary (AB), ternary (ABA), rondo (ABACA), theme and variations, or a short sonata form.',
  hintLabel: 'Shape:',
  question: 'Follow the sections. Which form is it?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'form' },
  phrase: (item) => item.name.replace(/^./, (c) => c.toLowerCase()),
  tip: 'Count the sections in fours and give each a letter: a new chord pattern gets a new letter, a return gets the old one. If nothing new arrives but the playing changes, it is variations.',
}
