import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Words and signs on a page of music, what they ask for, and (for loudness and speed) their order. */
interface Mark { id: string; sign: string; word: string; meaning: string; group: 'dyn' | 'change' | 'tempo' | 'tempo-change' | 'art'; rank?: number }
const MARKS: readonly Mark[] = [
  { id: 'pp', sign: 'pp', word: 'pianissimo', meaning: 'Very soft', group: 'dyn', rank: 1 },
  { id: 'p', sign: 'p', word: 'piano', meaning: 'Soft', group: 'dyn', rank: 2 },
  { id: 'mp', sign: 'mp', word: 'mezzo piano', meaning: 'Moderately soft', group: 'dyn', rank: 3 },
  { id: 'mf', sign: 'mf', word: 'mezzo forte', meaning: 'Moderately loud', group: 'dyn', rank: 4 },
  { id: 'f', sign: 'f', word: 'forte', meaning: 'Loud', group: 'dyn', rank: 5 },
  { id: 'ff', sign: 'ff', word: 'fortissimo', meaning: 'Very loud', group: 'dyn', rank: 6 },
  { id: 'cresc', sign: 'cresc.  <', word: 'crescendo', meaning: 'Getting louder', group: 'change' },
  { id: 'dim', sign: 'dim.  >', word: 'diminuendo', meaning: 'Getting softer', group: 'change' },
  { id: 'sfz', sign: 'sfz', word: 'sforzando', meaning: 'A sudden strong accent', group: 'change' },
  { id: 'largo', sign: 'Largo', word: 'largo', meaning: 'Very slow and broad', group: 'tempo', rank: 1 },
  { id: 'adagio', sign: 'Adagio', word: 'adagio', meaning: 'Slow', group: 'tempo', rank: 2 },
  { id: 'andante', sign: 'Andante', word: 'andante', meaning: 'At a walking pace', group: 'tempo', rank: 3 },
  { id: 'moderato', sign: 'Moderato', word: 'moderato', meaning: 'At a moderate speed', group: 'tempo', rank: 4 },
  { id: 'allegro', sign: 'Allegro', word: 'allegro', meaning: 'Fast and lively', group: 'tempo', rank: 5 },
  { id: 'presto', sign: 'Presto', word: 'presto', meaning: 'Very fast', group: 'tempo', rank: 6 },
  { id: 'rit', sign: 'rit.', word: 'ritardando', meaning: 'Gradually slower', group: 'tempo-change' },
  { id: 'accel', sign: 'accel.', word: 'accelerando', meaning: 'Gradually faster', group: 'tempo-change' },
  { id: 'a-tempo', sign: 'a tempo', word: 'a tempo', meaning: 'Back to the first speed', group: 'tempo-change' },
  { id: 'staccato', sign: '♩ with a dot', word: 'staccato', meaning: 'Short and detached', group: 'art' },
  { id: 'legato', sign: 'a curved slur', word: 'legato', meaning: 'Smooth and joined', group: 'art' },
  { id: 'accent', sign: '>', word: 'accent', meaning: 'Play that note stronger', group: 'art' },
  { id: 'tenuto', sign: '– (a line)', word: 'tenuto', meaning: 'Hold the note its full length', group: 'art' },
  { id: 'fermata', sign: '𝄐', word: 'fermata', meaning: 'Pause: hold as long as you like', group: 'art' },
]
const BY_ID = new Map(MARKS.map((m) => [m.id, m]))
const items: readonly Item[] = MARKS.map((m) => ({ id: m.id, short: m.sign, name: m.word, hint: m.meaning }))

const ids = (...groups: Mark['group'][]) => MARKS.filter((m) => groups.includes(m.group)).map((m) => m.id)
const SETUP: Record<number, { answers: readonly string[]; compare?: 'louder' | 'faster' }> = {
  1: { answers: ['p', 'f', 'mp', 'mf'] },
  2: { answers: ids('dyn') },
  3: { answers: [...ids('change'), 'p', 'f'] },
  4: { answers: ['largo', 'adagio', 'andante', 'allegro', 'presto'] },
  5: { answers: [...ids('tempo'), ...ids('tempo-change')] },
  6: { answers: ids('art') },
  7: { answers: ids('dyn'), compare: 'louder' },
  8: { answers: ids('tempo'), compare: 'faster' },
  9: { answers: ids('dyn', 'change', 'tempo', 'tempo-change', 'art') },
  10: { answers: ids('dyn', 'change', 'tempo', 'tempo-change', 'art') },
}

const NAME = ['name'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string][] = [
  ['p, mp, mf, f', 'Italian for soft (piano) and loud (forte); "mezzo" means moderately.'],
  ['pp to ff', 'Doubled letters go further: very soft, very loud.'],
  ['Changing loudness', 'Crescendo and diminuendo (the long < and > signs), and the sudden sfz.'],
  ['Speeds', 'Largo, adagio, andante, allegro, presto: slowest to fastest.'],
  ['More speeds', 'Moderato, and changing speed: rit., accel., a tempo.'],
  ['Touch', 'How to play each note: staccato, legato, accent, tenuto, fermata.'],
  ['Which is louder?', 'Two dynamics: pick the louder one.'],
  ['Which is faster?', 'Two tempo words: pick the faster one.'],
  ['All the words', 'Every word and sign.'],
  ['Everything', 'All the words, plus louder and faster.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: SETUP[i + 1].answers, modes: NAME, lowRange: [60, 72] as const }))

function makeQuestion(level: Level, item: Item, _mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  const m = BY_ID.get(item.id)!
  const shuffled = (list: readonly string[]) => list.map((id) => ({ id, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.id)
  const base = { root: 60, item: item.id, mode: 'name' as const, notes: [60] }
  // Level 10 mixes in the comparisons for loudness and speed words.
  const compare = setup.compare ?? (level.id === 10 && m.rank !== undefined && rand() < 0.4 ? (m.group === 'dyn' ? 'louder' : 'faster') : undefined)
  if (compare && m.rank !== undefined && m.rank > 1) {
    const lower = MARKS.filter((x) => x.group === m.group && x.rank! < m.rank!)
    const other = lower[Math.floor(rand() * lower.length)]
    const choices = shuffled([m.id, other.id])
    return {
      ...base, choices,
      prompt: { text: `Which is ${compare}?`, big: choices.map((id) => BY_ID.get(id)!.sign).join('   or   ') },
      explain: `${m.sign} (${m.word}, ${m.meaning.toLowerCase()}) is ${compare} than ${other.sign} (${other.word}, ${other.meaning.toLowerCase()}).`,
    }
  }
  // Otherwise: the sign, and its meaning among others of the same kind where possible.
  const kin = (id: string) => (BY_ID.get(id)!.group === m.group ? 0 : 1)
  const others = shuffled(level.items.filter((id) => id !== m.id && !(setup.compare && BY_ID.get(id)!.rank === 1))).sort((a, b) => kin(a) - kin(b)).slice(0, 3)
  return {
    ...base, choices: shuffled([m.id, ...others]),
    prompt: { text: 'Which marking asks for this?', big: m.meaning },
    explain: `${m.sign} (${m.word}): ${m.meaning.toLowerCase()}. Try it: play a C major scale this way.`,
  }
}

export const markingsExercise: ExerciseDef = {
  id: 'markings',
  name: 'Dynamics, articulation and tempo words',
  kind: 'quiz',
  noYourTurn: true,
  blurb: 'The words and signs that tell you how to play: loudness (pp to ff, crescendo), speed (largo to presto, rit., a tempo) and touch (staccato, legato, accent, fermata).',
  hintLabel: 'It means:',
  question: 'Which marking asks for this?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { name: 'marking' },
  phrase: (item) => `${item.short} (${item.name})`,
  tip: 'Piano means soft and forte loud; mezzo softens either. Slow to fast: largo, adagio, andante, moderato, allegro, presto. Dots shorten notes (staccato), slurs join them (legato).',
}
