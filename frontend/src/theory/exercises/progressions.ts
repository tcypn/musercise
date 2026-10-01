import { chordEvent, chordName, keyContext, keyLabel, STACK, voiceProgression, type Help, type KeyMode } from '../harmony'
import { spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

type Type = 'maj' | 'min' | 'maj7' | 'm7' | '7'

interface Degree {
  /** Semitones above the tonic, and letters above the tonic's letter, of the chord's root. */
  semis: number
  letters: number
  triad: 'maj' | 'min'
  seventh: 'maj7' | 'm7' | '7'
}

/** The chords the progressions use, by Roman numeral. */
const MAJOR: Record<string, Degree> = {
  I: { semis: 0, letters: 0, triad: 'maj', seventh: 'maj7' },
  ii: { semis: 2, letters: 1, triad: 'min', seventh: 'm7' },
  iii: { semis: 4, letters: 2, triad: 'min', seventh: 'm7' },
  IV: { semis: 5, letters: 3, triad: 'maj', seventh: 'maj7' },
  V: { semis: 7, letters: 4, triad: 'maj', seventh: '7' },
  vi: { semis: 9, letters: 5, triad: 'min', seventh: 'm7' },
}
const MINOR: Record<string, Degree> = {
  i: { semis: 0, letters: 0, triad: 'min', seventh: 'm7' },
  III: { semis: 3, letters: 2, triad: 'maj', seventh: 'maj7' },
  iv: { semis: 5, letters: 3, triad: 'min', seventh: 'm7' },
  V: { semis: 7, letters: 4, triad: 'maj', seventh: '7' }, // major: the raised 7th of harmonic minor
  VI: { semis: 8, letters: 5, triad: 'maj', seventh: 'maj7' },
  VII: { semis: 10, letters: 6, triad: 'maj', seventh: '7' },
}

interface Pattern {
  id: string
  mode: KeyMode
  numerals: string[]
  name: string
  hint: string
}

const pattern = (mode: KeyMode, name: string, hint: string, ...numerals: string[]): Pattern => ({ id: numerals.join('-'), mode, numerals, name, hint })

const PATTERNS: readonly Pattern[] = [
  pattern('major', 'Home, away, tension, home', 'The classic story in four chords: leave home, build tension, return.', 'I', 'IV', 'V', 'I'),
  pattern('major', 'The four-chord pop loop', 'Bright and open, with a wistful turn on the minor vi.', 'I', 'V', 'vi', 'IV'),
  pattern('major', 'The same loop, starting on vi', 'The same four chords as I–V–vi–IV, but it starts on the minor vi, so it feels more melancholy.', 'vi', 'IV', 'I', 'V'),
  pattern('major', 'The same loop, starting on IV', 'The same four chords again, starting on IV, which sounds as if it is just leaving home.', 'IV', 'I', 'V', 'vi'),
  pattern('major', 'The fifties progression', 'Down to vi, up through IV, then V: the sound of early rock and roll and doo-wop.', 'I', 'vi', 'IV', 'V'),
  pattern('major', 'A turnaround', 'It travels round and lands back on I, ready to start again.', 'I', 'vi', 'ii', 'V'),
  pattern('major', 'Away, tension, home', 'The staple of jazz and R&B: ii leaves, V builds tension, I resolves.', 'ii', 'V', 'I'),
  pattern('major', 'The canon progression', 'Eight chords, as in Pachelbel\'s Canon, then it repeats.', 'I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'),
  pattern('minor', 'Minor: home, away, tension, home', 'The minor version of the classic: i, iv, V (a major chord, for the pull), i.', 'i', 'iv', 'V', 'i'),
  pattern('minor', 'A common minor loop', 'Built from the natural minor scale: i, VI, III, VII.', 'i', 'VI', 'III', 'VII'),
  pattern('minor', 'The descending minor line', 'The bass walks down: i, VII, VI, V. This is the Andalusian cadence.', 'i', 'VII', 'VI', 'V'),
]
const BY_ID = new Map(PATTERNS.map((p) => [p.id, p]))
const pretty = (p: Pattern) => p.numerals.join('–')

const items: readonly Item[] = PATTERNS.map((p) => ({ id: p.id, short: pretty(p), name: p.name, hint: p.hint }))

// ---- Levels ------------------------------------------------------------------------------------

interface LevelData {
  chords: 'triad' | 'seventh' | 'mixed'
}
const DATA: Record<number, LevelData> = {
  1: { chords: 'triad' }, 2: { chords: 'triad' }, 3: { chords: 'triad' }, 4: { chords: 'triad' }, 5: { chords: 'triad' },
  6: { chords: 'triad' }, 7: { chords: 'triad' }, 8: { chords: 'seventh' }, 9: { chords: 'triad' }, 10: { chords: 'mixed' },
}
const ids = (...list: string[]) => list
const L1 = ids('I-IV-V-I', 'I-V-vi-IV')
const L2 = [...L1, 'I-vi-IV-V']
const L3 = [...L2, 'I-vi-ii-V']
const L4 = [...L3, 'vi-IV-I-V']
const L5 = [...L4, 'IV-I-V-vi']
const L6 = [...L5, 'ii-V-I']
const MINORS = ids('i-iv-V-i', 'i-VI-III-VII', 'i-VII-VI-V')
const MAJORS = PATTERNS.filter((p) => p.mode === 'major').map((p) => p.id)

const levels: readonly Level[] = [
  { id: 1, name: 'Two shapes', blurb: 'Hear a key, then four chords. Two very different shapes: the classic return home (I–IV–V–I) and the pop loop (I–V–vi–IV).', items: L1, modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 2, name: 'The fifties', blurb: 'Add I–vi–IV–V, the doo-wop progression. It shares its first and last chords with the other two, so listen to the middle.', items: L2, modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 3, name: 'A turnaround', blurb: 'Add I–vi–ii–V, which circles back to the start.', items: L3, modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 4, name: 'Starting on vi', blurb: 'The pop loop again, but starting on vi. Same four chords, different feeling: where you start changes the mood.', items: L4, modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 5, name: 'Starting on IV', blurb: 'The same loop starting on IV. Listen for which chord feels like home.', items: L5, modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 6, name: 'Away, tension, home', blurb: 'Add ii–V–I, only three chords: the staple of jazz and R&B.', items: L6, modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 7, name: 'In a minor key', blurb: 'Three progressions in minor: i–iv–V–i, the common loop i–VI–III–VII, and the descending i–VII–VI–V.', items: MINORS, modes: ['minor'], lowRange: [36, 77], help: 'full' },
  { id: 8, name: 'With sevenths', blurb: 'The same progressions with seventh chords, as in jazz, R&B and ballads. Listen to the roots moving, not the colour.', items: ids('I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'I-vi-ii-V', 'ii-V-I'), modes: ['major'], lowRange: [36, 77], help: 'full' },
  { id: 9, name: 'Less help', blurb: 'Only the home chord plays before the progression, and the eight-chord canon progression joins.', items: MAJORS, modes: ['major'], lowRange: [36, 77], help: 'light' },
  { id: 10, name: 'Everything', blurb: 'Major and minor, triads and sevenths, every key, with the least help.', items: PATTERNS.map((p) => p.id), modes: ['major', 'minor'], lowRange: [36, 77], help: 'light' },
]

// ---- Questions ---------------------------------------------------------------------------------

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]
}

const STEP = 1.2

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  const p = BY_ID.get(item.id)!
  const keyMode = p.mode
  const table = keyMode === 'major' ? MAJOR : MINOR
  const data = DATA[level.id]
  const seventh = data.chords === 'seventh' || (data.chords === 'mixed' && rand() < 0.5)

  const tonicPc = pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rand)
  const tonic = 48 + tonicPc
  const types: Type[] = p.numerals.map((n) => (seventh ? table[n].seventh : table[n].triad))
  const voiced = voiceProgression(p.numerals.map((n, i) => ({ rootPc: (tonicPc + table[n].semis) % 12, stack: STACK[types[i]] })))

  const help: Help = level.help ?? 'full'
  const { events: context, end } = keyContext(tonic, keyMode, help)
  const start = end + 0.9
  const chords = voiced.map((v, i) =>
    chordEvent(start + i * STEP, i === voiced.length - 1 ? 2.8 : STEP + 0.3, [v.bass, ...v.upper]),
  )
  const first = chords[0].notes

  const { tonic: tonicNote, label } = keyLabel(tonicPc, keyMode)
  const names = p.numerals.map((n, i) => chordName(spellFrom(tonicNote, [[table[n].letters, table[n].semis]])[0], types[i]))
  return {
    root: first[0], item: item.id, mode: keyMode, notes: first,
    events: [...context, ...chords],
    answerFrom: context.length,
    lit: first,
    steps: chords.map((c, i) => ({ label: `${p.numerals[i]} · ${names[i]}`, notes: c.notes })),
    explain: `${pretty(p)} in ${label}: ${names.join(' ')}. ${p.hint}`,
  }
}

export const progressionsExercise: ExerciseDef = {
  id: 'progressions',
  name: 'Common progressions',
  blurb: 'Hear a key, then a short chain of chords, and name the pattern by its Roman numerals. These patterns are behind a huge number of songs, and knowing them lets you work out a song\'s chords by ear.',
  hintLabel: 'Sounds like:',
  question: 'Listen to the key, then name the chord progression that follows.',
  partLabels: { key: 'The key', question: 'Name this progression' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => `${item.short}: ${item.name.toLowerCase()}`,
}
