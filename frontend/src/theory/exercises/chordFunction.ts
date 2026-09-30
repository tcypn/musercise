import { chordEvent, chordName, keyContext, keyLabel, MAJOR_KEY, MINOR_KEY, STACK, type Function3, type Help, type KeyDegree, type KeyMode } from '../harmony'
import { HIGHEST_MIDI, LOWEST_MIDI } from '../notes'
import { noteLabel, spellFrom } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

const items: readonly Item[] = [
  { id: 'tonic', short: 'Home', name: 'Tonic: home', hint: 'Settled: it feels like arriving' },
  { id: 'sub', short: 'Away', name: 'Subdominant: away', hint: 'Moving away from home, often on the way to tension' },
  { id: 'dom', short: 'Tension', name: 'Dominant: tension', hint: 'Tense: it wants to resolve back home' },
]

const WORD: Record<Function3, string> = { tonic: 'home (tonic function)', sub: 'away (subdominant function)', dom: 'tension (dominant function)' }
const SENTENCE: Record<Function3, string> = {
  tonic: 'It feels settled, like arriving.',
  sub: 'It moves away from home, often on the way to the dominant.',
  dom: 'It wants to resolve home.',
}

interface LevelData {
  /** Which chords of the key can be asked (indexes into MAJOR_KEY / MINOR_KEY). */
  major?: readonly number[]
  minor?: readonly number[]
  /** Triads, sevenths, or a random mix. */
  chords: 'triad' | 'seventh' | 'mixed'
  /** Play the chord an octave higher or lower now and then. */
  spread?: boolean
}

const ALL_MAJOR = [0, 1, 2, 3, 4, 5, 6]
const ALL_MINOR = [0, 1, 2, 3]
const DATA: Record<number, LevelData> = {
  1: { major: [0, 4], chords: 'triad' },
  2: { major: [0, 3, 4], chords: 'triad' },
  3: { major: [0, 3, 4, 5], chords: 'triad' },
  4: { major: [0, 1, 3, 4, 5], chords: 'triad' },
  5: { major: ALL_MAJOR, chords: 'triad' },
  6: { major: [0, 1, 3, 4, 5], chords: 'seventh' },
  7: { major: ALL_MAJOR, chords: 'triad', spread: true },
  8: { minor: ALL_MINOR, chords: 'triad' },
  9: { major: ALL_MAJOR, chords: 'mixed' },
  10: { major: ALL_MAJOR, minor: ALL_MINOR, chords: 'mixed', spread: true },
}

const functionsOf = (degrees: readonly KeyDegree[], picks: readonly number[] | undefined): Function3[] => (picks ?? []).map((i) => degrees[i].fn)
const itemsFor = (d: LevelData): string[] => {
  const present = new Set<Function3>([...functionsOf(MAJOR_KEY, d.major), ...functionsOf(MINOR_KEY, d.minor)])
  return items.map((i) => i.id).filter((id) => present.has(id as Function3))
}

const levels: readonly Level[] = [
  { id: 1, name: 'Home or tension', blurb: 'The two chords that matter most: the home chord (I) feels settled, the chord on the 5th note (V) pulls back to it.', items: itemsFor(DATA[1]), modes: ['major'], lowRange: [48, 70], help: 'full' },
  { id: 2, name: 'Moving away', blurb: 'Add the chord on the 4th note (IV): it leaves home without the pull of V.', items: itemsFor(DATA[2]), modes: ['major'], lowRange: [48, 70], help: 'full' },
  { id: 3, name: 'A second home', blurb: 'The chord on the 6th note (vi) also feels like home, a softer, sadder one.', items: itemsFor(DATA[3]), modes: ['major'], lowRange: [48, 70], help: 'full' },
  { id: 4, name: 'The second away chord', blurb: 'Add ii, which moves away like IV does.', items: itemsFor(DATA[4]), modes: ['major'], lowRange: [48, 70], help: 'full' },
  { id: 5, name: 'All seven chords', blurb: 'Every chord of the key sorted into home, away and tension.', items: itemsFor(DATA[5]), modes: ['major'], lowRange: [48, 70], help: 'full' },
  { id: 6, name: 'With sevenths', blurb: 'The same idea with seventh chords. The dominant 7th is the strongest tension of all.', items: itemsFor(DATA[6]), modes: ['major'], lowRange: [48, 70], help: 'full' },
  { id: 7, name: 'High and low', blurb: 'The chord is played higher or lower than the key, so you cannot lean on its position.', items: itemsFor(DATA[7]), modes: ['major'], lowRange: [36, 80], help: 'full' },
  { id: 8, name: 'A minor key', blurb: 'In a minor key the home chords are i and VI, the away chord is iv, and V still pulls home.', items: itemsFor(DATA[8]), modes: ['minor'], lowRange: [48, 70], help: 'full' },
  { id: 9, name: 'Less help', blurb: 'Only the home chord plays before the question, then triads and sevenths mixed.', items: itemsFor(DATA[9]), modes: ['major'], lowRange: [48, 70], help: 'light' },
  { id: 10, name: 'Everything', blurb: 'Major and minor keys, triads and sevenths, high and low, with the least help.', items: itemsFor(DATA[10]), modes: ['major', 'minor'], lowRange: [36, 80], help: 'light' },
]

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const data = DATA[level.id]
  const keyMode: KeyMode = mode === 'minor' ? 'minor' : 'major'
  const degrees = keyMode === 'major' ? MAJOR_KEY : MINOR_KEY
  const allowed = (keyMode === 'major' ? data.major : data.minor) ?? []
  const choices = allowed.filter((i) => degrees[i].fn === item.id)
  const index = pick(choices, rand)
  const degree = degrees[index]
  const type = data.chords === 'seventh' || (data.chords === 'mixed' && rand() < 0.5) ? degree.seventh : degree.triad

  const tonicPc = Math.floor(rand() * 12)
  const tonic = 48 + tonicPc
  const shift = data.spread ? pick([-12, 0, 12], rand) : 0
  const stack = STACK[type]
  let root = tonic + degree.semis + shift
  while (root + stack[stack.length - 1] > HIGHEST_MIDI) root -= 12
  while (root < LOWEST_MIDI) root += 12
  const notes = stack.map((s) => root + s)

  const help: Help = level.help ?? 'full'
  const { events: context, end } = keyContext(tonic, keyMode, help)
  return {
    root, item: item.id, mode: keyMode, notes,
    events: [...context, chordEvent(end + 0.9, 2.6, notes)],
    answerFrom: context.length,
    lit: notes,
    // Spelled from the key, so the explanation uses the names a musician would write.
    explain: explain(tonicPc, keyMode, degree, type),
  }
}

function explain(tonicPc: number, keyMode: KeyMode, degree: KeyDegree, type: string): string {
  const { tonic, label } = keyLabel(tonicPc, keyMode)
  const root = spellFrom(tonic, [[degree.letters, degree.semis]])[0]
  const name = chordName(root, type)
  const home = keyMode === 'major' ? 'I' : 'i'
  let text = `${name} is the ${degree.numeral} chord in ${label}: a ${WORD[degree.fn]} chord. ${SENTENCE[degree.fn].replace('resolve home', `resolve home to the ${home} chord`)}`
  // The tritone inside a dominant chord is what pulls it home: one note leans up, the other down.
  const pair = type === '7' ? [spellFrom(root, [[2, 4]])[0], spellFrom(root, [[6, 10]])[0]] : type === 'dim' || type === 'm7b5' ? [root, spellFrom(root, [[4, 6]])[0]] : null
  if (pair) {
    const up = noteLabel(tonic)
    const down = noteLabel(spellFrom(tonic, [[2, keyMode === 'major' ? 4 : 3]])[0])
    text += ` Its ${noteLabel(pair[0])} and ${noteLabel(pair[1])} form a tritone that pulls toward the home chord (${noteLabel(pair[0])} up to ${up}, ${noteLabel(pair[1])} down to ${down}).`
  }
  return text
}

export const chordFunctionExercise: ExerciseDef = {
  id: 'chord-function',
  name: 'Chord function',
  blurb: 'Every chord in a key has a job: some feel like home, some move away, some build tension that wants to go home. Hear the chord and name its job.',
  hintLabel: 'Feels:',
  question: 'Listen to the key, then name the last chord. What does it do?',
  partLabels: { key: 'The key', question: 'Name this chord' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2.6 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'major key', minor: 'minor key' },
  phrase: (item) => `${item.short.toLowerCase()}: ${item.name.toLowerCase()}`,
}
