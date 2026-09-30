import { MAJOR_KEY, SUFFIX, type KeyDegree } from '../harmony'
import { KEYS_BY_FIFTHS, MAJOR_SCALE, noteLabel, pitchClass, spellFrom, type KeyDef, type Note, type Step } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

// ---- Keys, chords and numerals ------------------------------------------------------------------

const KEYS = KEYS_BY_FIFTHS
const ascii = (label: string) => label.replace('♯', '#').replace('♭', 'b')
const keyName = (k: KeyDef) => noteLabel(k.tonic)
const keyId = (k: KeyDef) => `k-${ascii(keyName(k))}`
const keysNamed = (...labels: string[]) => KEYS.filter((k) => labels.includes(keyName(k)))
const rootOf = (k: KeyDef, d: KeyDegree): Note => spellFrom(k.tonic, [[d.letters, d.semis]])[0]

type ChordType = KeyDegree['triad'] | KeyDegree['seventh']
/** Ids stay plain ASCII (the server only accepts letters, digits and # b / + . _ -). */
const ID_SUFFIX: Record<string, string> = { maj: '', min: 'm', dim: 'dim', maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7b5' }
const chordId = (root: Note, type: string) => `c-${ascii(noteLabel(root))}${ID_SUFFIX[type]}`
const TYPE_NAME: Record<string, string> = { maj: 'major', min: 'minor', dim: 'diminished', maj7: 'major 7th', m7: 'minor 7th', '7': 'dominant 7th', m7b5: 'half-diminished 7th' }
/** Steps above the root as [letters up, semitones up], so the notes of a chord can be spelled. */
const SPELL: Record<string, readonly Step[]> = {
  maj: [[0, 0], [2, 4], [4, 7]],
  min: [[0, 0], [2, 3], [4, 7]],
  dim: [[0, 0], [2, 3], [4, 6]],
  maj7: [[0, 0], [2, 4], [4, 7], [6, 11]],
  m7: [[0, 0], [2, 3], [4, 7], [6, 10]],
  '7': [[0, 0], [2, 4], [4, 7], [6, 10]],
  m7b5: [[0, 0], [2, 3], [4, 6], [6, 10]],
}

const NUMERAL7 = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']

interface ChordAnswer {
  id: string
  root: Note
  type: ChordType
}
const chordAnswers = new Map<string, ChordAnswer>()
for (const k of KEYS) {
  for (const d of MAJOR_KEY) {
    for (const type of [d.triad, d.seventh] as ChordType[]) {
      const root = rootOf(k, d)
      chordAnswers.set(chordId(root, type), { id: chordId(root, type), root, type })
    }
  }
}

const chordShort = (c: ChordAnswer) => `${noteLabel(c.root)}${SUFFIX[c.type]}`
const chordNotes = (c: ChordAnswer) => spellFrom(c.root, SPELL[c.type]).map(noteLabel).join(' ')
const isSeventh = (c: ChordAnswer) => c.type.includes('7')

// ---- Answers -------------------------------------------------------------------------------------

const QUALITY_ITEMS: Item[] = [
  { id: 'q-maj', short: 'major', name: 'Major chord', hint: 'Bright: root, major 3rd, 5th' },
  { id: 'q-min', short: 'minor', name: 'Minor chord', hint: 'Darker: root, minor 3rd, 5th' },
  { id: 'q-dim', short: 'dim.', name: 'Diminished chord', hint: 'Tense: two minor thirds stacked' },
]
const NUMERAL_ITEMS: Item[] = MAJOR_KEY.map((d, i) => ({
  id: `r-${i}`, short: d.numeral, name: `Chord on the ${ORDINAL[i]} note`, hint: `${TYPE_NAME[d.triad]} chord`,
}))
const NUMERAL7_ITEMS: Item[] = MAJOR_KEY.map((d, i) => ({
  id: `r7-${i}`, short: NUMERAL7[i], name: `Seventh chord on the ${ORDINAL[i]} note`, hint: `${TYPE_NAME[d.seventh]} chord`,
}))
const KEY_ITEMS: Item[] = KEYS.map((k) => ({ id: keyId(k), short: `${keyName(k)} major`, name: `Key of ${keyName(k)} major`, hint: `${spellFrom(k.tonic, MAJOR_SCALE).map(noteLabel).join(' ')}` }))
const sortChords = (list: ChordAnswer[]) =>
  list.sort((a, b) => pitchClass(a.root) - pitchClass(b.root) || a.root.accidental - b.root.accidental || SUFFIX[a.type].length - SUFFIX[b.type].length)
const chordItem = (c: ChordAnswer): Item => ({ id: c.id, short: chordShort(c), name: `${noteLabel(c.root)} ${TYPE_NAME[c.type]}`, hint: chordNotes(c) })
const TRIAD_ITEMS = sortChords([...chordAnswers.values()].filter((c) => !isSeventh(c))).map(chordItem)
const SEVENTH_ITEMS = sortChords([...chordAnswers.values()].filter(isSeventh)).map(chordItem)

const items: readonly Item[] = [...QUALITY_ITEMS, ...NUMERAL_ITEMS, ...NUMERAL7_ITEMS, ...KEY_ITEMS, ...TRIAD_ITEMS, ...SEVENTH_ITEMS]

// ---- Levels --------------------------------------------------------------------------------------

const order = new Map(items.map((item, i) => [item.id, i]))
const inOrder = (ids: Iterable<string>) => [...new Set(ids)].sort((a, b) => order.get(a)! - order.get(b)!)
const chordsIn = (keys: readonly KeyDef[], seventh = false) =>
  keys.flatMap((k) => MAJOR_KEY.map((d) => chordId(rootOf(k, d), seventh ? d.seventh : d.triad)))
const NUMERALS = NUMERAL_ITEMS.map((i) => i.id)

const C_G_F = keysNamed('C', 'G', 'F')
const FIVE = keysNamed('C', 'G', 'D', 'F', 'B♭')
const SHARP = keysNamed('G', 'D', 'A', 'E', 'B', 'F♯')
const FLAT = keysNamed('F', 'B♭', 'E♭', 'A♭', 'D♭')

const DATA: Record<number, { keys: readonly KeyDef[] }> = {
  1: { keys: [] }, 2: { keys: C_G_F }, 3: { keys: C_G_F }, 4: { keys: FIVE }, 5: { keys: SHARP },
  6: { keys: FLAT }, 7: { keys: KEYS }, 8: { keys: KEYS }, 9: { keys: KEYS }, 10: { keys: KEYS },
}

const RANGE: readonly [number, number] = [60, 72]
const levels: readonly Level[] = [
  { id: 1, name: 'The pattern', blurb: 'The seven chords of a major key follow one pattern: major, minor, minor, major, major, minor, diminished.', items: QUALITY_ITEMS.map((i) => i.id), modes: ['quality'], lowRange: RANGE },
  { id: 2, name: 'Numbers to chords', blurb: 'In C, G and F major: name the chord on a given step. The Roman numeral says which step: I is the 1st note, V the 5th. Capital letters are major chords, small ones minor.', items: inOrder(chordsIn(C_G_F)), modes: ['chord'], lowRange: RANGE },
  { id: 3, name: 'Chords to numbers', blurb: 'The other way round: given a chord in C, G or F major, say which numeral it is.', items: NUMERALS, modes: ['numeral'], lowRange: RANGE },
  { id: 4, name: 'Five keys', blurb: 'Both directions, in C, G, D, F and B♭ major.', items: inOrder([...chordsIn(FIVE), ...NUMERALS]), modes: ['chord', 'numeral'], lowRange: RANGE },
  { id: 5, name: 'Sharp keys', blurb: 'Both directions in G, D, A, E, B and F♯ major.', items: inOrder([...chordsIn(SHARP), ...NUMERALS]), modes: ['chord', 'numeral'], lowRange: RANGE },
  { id: 6, name: 'Flat keys', blurb: 'Both directions in F, B♭, E♭, A♭ and D♭ major.', items: inOrder([...chordsIn(FLAT), ...NUMERALS]), modes: ['chord', 'numeral'], lowRange: RANGE },
  { id: 7, name: 'All twelve keys', blurb: 'Both directions in every major key.', items: inOrder([...chordsIn(KEYS), ...NUMERALS]), modes: ['chord', 'numeral'], lowRange: RANGE },
  { id: 8, name: 'Which key?', blurb: 'Work backwards: "A♭ is the IV chord of which key?" Chord charts often show chords without the key.', items: KEY_ITEMS.map((i) => i.id), modes: ['key'], lowRange: RANGE },
  { id: 9, name: 'Seventh chords', blurb: 'Stack another third: Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7.', items: inOrder([...chordsIn(KEYS, true), ...NUMERAL7_ITEMS.map((i) => i.id)]), modes: ['seventh'], lowRange: RANGE },
  { id: 10, name: 'Everything', blurb: 'Patterns, chords, numerals, keys and sevenths, in all twelve keys.', items: items.map((i) => i.id), modes: ['quality', 'chord', 'numeral', 'key', 'seventh'], lowRange: RANGE },
]

// ---- Questions -----------------------------------------------------------------------------------

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]
}
function shuffled<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The right answer plus wrong ones, never two chords that sound the same (F♯ and G♭ major are one chord). */
function offer(correct: string, pool: readonly string[], count: number, rand: () => number): string[] {
  const sound = (id: string) => {
    const c = chordAnswers.get(id)
    return c ? `${pitchClass(c.root)}${c.type}` : id
  }
  const used = new Set([sound(correct)])
  const chosen = [correct]
  for (const id of shuffled(pool.filter((p) => p !== correct), rand)) {
    if (chosen.length >= count) break
    if (used.has(sound(id))) continue
    used.add(sound(id))
    chosen.push(id)
  }
  return chosen
}

function chordsOfKey(k: KeyDef, seventh: boolean): string {
  return MAJOR_KEY.map((d) => `${noteLabel(rootOf(k, d))}${SUFFIX[seventh ? d.seventh : d.triad]}`).join(' ')
}

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  const data = DATA[level.id]
  const base = { root: 60, notes: [60] }

  if (item.id.startsWith('q-')) {
    const type = item.id.slice(2)
    const d = pick(MAJOR_KEY.filter((x) => x.triad === type), rand)
    const i = MAJOR_KEY.indexOf(d)
    return {
      ...base, item: item.id, mode: 'quality',
      prompt: { text: `In a major key, what kind of chord is built on the ${ORDINAL[i]} note?` },
      choices: QUALITY_ITEMS.map((q) => q.id),
      explain: `The ${ORDINAL[i]} chord (${d.numeral}) is ${TYPE_NAME[d.triad]}. In every major key the pattern is I ii iii IV V vi vii° = major, minor, minor, major, major, minor, diminished.`,
    }
  }

  if (item.id.startsWith('r-') || item.id.startsWith('r7-')) {
    const seventh = item.id.startsWith('r7-')
    const d = MAJOR_KEY[Number(item.id.split('-')[1])]
    const key = pick(data.keys, rand)
    const type = seventh ? d.seventh : d.triad
    const name = `${noteLabel(rootOf(key, d))}${SUFFIX[type]}`
    return {
      ...base, item: item.id, mode: seventh ? 'seventh' : 'numeral',
      prompt: { text: `In ${keyName(key)} major, which number is the chord ${name}?` },
      choices: (seventh ? NUMERAL7_ITEMS : NUMERAL_ITEMS).map((n) => n.id),
      explain: `${keyName(key)} major: ${chordsOfKey(key, seventh)}. ${name} is the ${seventh ? NUMERAL7[MAJOR_KEY.indexOf(d)] : d.numeral} chord.`,
    }
  }

  if (item.id.startsWith('c-')) {
    const answer = chordAnswers.get(item.id)!
    const seventh = isSeventh(answer)
    const options: { key: KeyDef; d: KeyDegree }[] = []
    for (const key of data.keys) for (const d of MAJOR_KEY) if (chordId(rootOf(key, d), seventh ? d.seventh : d.triad) === item.id) options.push({ key, d })
    const { key, d } = pick(options, rand)
    // Wrong answers are chords of the same kind: sevenths next to sevenths, triads next to triads.
    const pool = level.items.filter((id) => id.startsWith('c-') && isSeventh(chordAnswers.get(id)!) === seventh)
    return {
      ...base, item: item.id, mode: seventh ? 'seventh' : 'chord',
      prompt: { text: `In ${keyName(key)} major, what is the ${seventh ? NUMERAL7[MAJOR_KEY.indexOf(d)] : d.numeral} chord?` },
      choices: offer(item.id, pool, 5, rand),
      explain: `${keyName(key)} major: ${chordsOfKey(key, seventh)}. The ${seventh ? NUMERAL7[MAJOR_KEY.indexOf(d)] : d.numeral} chord is ${chordShort(answer)} (${chordNotes(answer)}).`,
    }
  }

  // 'k-…': which key does this chord and numeral belong to?
  const key = KEYS.find((k) => keyId(k) === item.id)!
  const d = pick(MAJOR_KEY, rand)
  const name = `${noteLabel(rootOf(key, d))}${SUFFIX[d.triad]}`
  return {
    ...base, item: item.id, mode: 'key',
    prompt: { text: `${name} is the ${d.numeral} chord of which major key?` },
    choices: offer(item.id, KEY_ITEMS.map((i) => i.id), 6, rand),
    explain: `${name} is the ${d.numeral} chord of ${keyName(key)} major: ${chordsOfKey(key, false)}.`,
  }
}

export const diatonicChordsExercise: ExerciseDef = {
  id: 'diatonic-chords',
  name: 'Chords on each scale note',
  kind: 'quiz',
  blurb: 'Every major key has seven chords, one on each note of its scale. Learn them with their Roman numerals in all twelve keys, so you can read a chord chart and move a song to any key.',
  rangeWord: 'notes',
  hintLabel: 'Notes:',
  question: 'Answer the question.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { quality: 'chord pattern', chord: 'numbers to chords', numeral: 'chords to numbers', key: 'which key', seventh: 'seventh chords' },
  phrase: (item) => `the ${item.short} chord`,
}
