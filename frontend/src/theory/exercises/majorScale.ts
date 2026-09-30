import { KEYS_BY_FIFTHS, MAJOR_SCALE, noteLabel, pitchClass, signatureOf, spellFrom, type KeyDef, type Note } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

// ---- The keys and their notes ---------------------------------------------------------------

const KEYS = KEYS_BY_FIFTHS
const ascii = (label: string) => label.replace('♯', '#').replace('♭', 'b')
const keyId = (k: KeyDef) => `k-${ascii(noteLabel(k.tonic))}`
const noteId = (n: Note) => `n-${ascii(noteLabel(n))}`
const scaleOf = (k: KeyDef): Note[] => spellFrom(k.tonic, MAJOR_SCALE)
const sigId = (n: number) => (n === 0 ? 'sig0' : `sig${Math.abs(n)}${n > 0 ? 's' : 'f'}`)
const sigOf = (k: KeyDef) => signatureOf(k)
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']

const sigShort = (n: number) => (n === 0 ? '0' : `${Math.abs(n)}${n > 0 ? '♯' : '♭'}`)
const sigName = (n: number) => (n === 0 ? 'No sharps or flats' : `${Math.abs(n)} ${n > 0 ? 'sharp' : 'flat'}${Math.abs(n) === 1 ? '' : 's'}`)
/** "F♯, C♯ and G♯" */
const accidentals = (k: KeyDef) => {
  const marked = scaleOf(k).filter((n) => n.accidental !== 0).map(noteLabel)
  return marked.length <= 1 ? marked.join('') : `${marked.slice(0, -1).join(', ')} and ${marked[marked.length - 1]}`
}

// ---- Answers ---------------------------------------------------------------------------------

const STEP_ITEMS: Item[] = [
  { id: 'whole', short: 'whole', name: 'Whole step', hint: 'Two keys along: there is one key in between' },
  { id: 'half', short: 'half', name: 'Half step', hint: 'The very next key, black or white' },
]

// Sharps first, then flats, in the order of the circle of fifths.
const SIG_VALUES = [...new Set(KEYS.map(sigOf))].sort((a, b) => a - b).sort((a, b) => (a >= 0 && b < 0 ? -1 : a < 0 && b >= 0 ? 1 : a >= 0 ? a - b : b - a))
const SIG_ITEMS: Item[] = SIG_VALUES.map((n) => {
  const key = KEYS.find((k) => sigOf(k) === n)!
  return { id: sigId(n), short: sigShort(n), name: sigName(n), hint: `the key of ${noteLabel(key.tonic)} major` }
})

const KEY_ITEMS: Item[] = KEYS.map((k) => ({
  id: keyId(k),
  short: `${noteLabel(k.tonic)} major`,
  name: `Key of ${noteLabel(k.tonic)} major`,
  hint: sigOf(k) === 0 ? 'no sharps or flats' : `${sigName(sigOf(k))}: ${accidentals(k)}`,
}))

// Every note name any of the twelve scales uses, in pitch order (E♯ appears in F♯ major, for example).
const NOTE_BY_ID = new Map<string, Note>()
for (const k of KEYS) for (const n of scaleOf(k)) NOTE_BY_ID.set(noteId(n), n)
const NOTE_ITEMS: Item[] = [...NOTE_BY_ID.entries()]
  .sort(([, a], [, b]) => pitchClass(a) - pitchClass(b) || a.accidental - b.accidental)
  .map(([id, n]) => ({
    id,
    short: noteLabel(n),
    name: n.accidental === 0 ? `${noteLabel(n)} (natural)` : n.accidental > 0 ? `${noteLabel(n)} (a sharp)` : `${noteLabel(n)} (a flat)`,
    hint: n.accidental === 0 ? 'a natural note' : n.accidental > 0 ? 'a sharp: one key above the natural note' : 'a flat: one key below the natural note',
  }))

const items: readonly Item[] = [...STEP_ITEMS, ...SIG_ITEMS, ...KEY_ITEMS, ...NOTE_ITEMS]

// ---- Levels ----------------------------------------------------------------------------------

const keysNamed = (...labels: string[]) => KEYS.filter((k) => labels.includes(noteLabel(k.tonic)))
const notesOf = (keys: readonly KeyDef[]) => [...new Set(keys.flatMap((k) => scaleOf(k).slice(1).map(noteId)))] // degrees 2-7 are the ones asked
const order = new Map(items.map((item, i) => [item.id, i]))
const inOrder = (ids: string[]) => [...ids].sort((a, b) => order.get(a)! - order.get(b)!)

interface LevelData {
  keys: readonly KeyDef[]
  /** Step questions may use only these pairs (index of the first note, 0-6). */
  pairs?: readonly number[]
  /** How many answers a question offers. */
  offer: number
}

const C_G_F = keysNamed('C', 'G', 'F')
const FIVE = keysNamed('C', 'G', 'D', 'F', 'B♭')
const FOUR = keysNamed('C', 'G', 'D', 'F')

const DATA: Record<number, LevelData> = {
  1: { keys: [], pairs: [0, 2, 6], offer: 2 },
  2: { keys: [], offer: 2 },
  3: { keys: C_G_F, offer: 4 },
  4: { keys: FIVE, offer: 5 },
  5: { keys: FOUR, offer: 4 },
  6: { keys: KEYS, offer: 6 },
  7: { keys: KEYS, offer: 6 },
  8: { keys: KEYS, offer: 6 },
  9: { keys: KEYS, offer: 6 },
  10: { keys: KEYS, offer: 6 },
}

const levels: readonly Level[] = [
  { id: 1, name: 'Whole and half steps', blurb: 'A major scale is a pattern of whole steps (W) and half steps (H). Start with three of the steps: 1 to 2, 3 to 4 and 7 to 8.', items: ['whole', 'half'], modes: ['steps'], lowRange: [60, 72] },
  { id: 2, name: 'The whole pattern', blurb: 'W W H W W W H: every step from the 1st note to the octave.', items: ['whole', 'half'], modes: ['steps'], lowRange: [60, 72] },
  { id: 3, name: 'Three scales', blurb: 'Name the notes of C, G and F major. Each letter is used once, so a scale never skips a letter.', items: inOrder(notesOf(C_G_F)), modes: ['note'], lowRange: [60, 72] },
  { id: 4, name: 'Five scales', blurb: 'Add D major and B♭ major.', items: inOrder(notesOf(FIVE)), modes: ['note'], lowRange: [60, 72] },
  { id: 5, name: 'Sharps and flats', blurb: 'Each major key has its own sharps or flats, called its key signature. Count them for C, G, D and F.', items: inOrder(FOUR.map((k) => sigId(sigOf(k)))), modes: ['signature'], lowRange: [60, 72] },
  { id: 6, name: 'All the signatures', blurb: 'Each step round the circle of fifths adds one sharp (going one way) or one flat (the other way).', items: inOrder(KEYS.map((k) => sigId(sigOf(k)))), modes: ['signature'], lowRange: [60, 72] },
  { id: 7, name: 'Which key?', blurb: 'Work backwards: from the sharps or flats to the name of the key.', items: inOrder(KEYS.map(keyId)), modes: ['key'], lowRange: [60, 72] },
  { id: 8, name: 'Notes in any key', blurb: 'The notes of all twelve major scales, correctly spelled (F♯ major has E♯, not F).', items: inOrder(notesOf(KEYS)), modes: ['note'], lowRange: [60, 72] },
  { id: 9, name: 'Which scale is lit?', blurb: 'Name the major scale from the keys lit on the keyboard. Look at the pattern of black keys.', items: inOrder(KEYS.map(keyId)), modes: ['scale'], lowRange: [48, 84] },
  { id: 10, name: 'Everything', blurb: 'Steps, notes, signatures and scales in all twelve keys, mixed.', items: items.map((i) => i.id), modes: ['steps', 'signature', 'note', 'key', 'scale'], lowRange: [48, 84] },
]

// ---- Questions -------------------------------------------------------------------------------

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

/** The right answer plus wrong ones from the level, never two notes of the same pitch (F♯ and G♭ are one key). */
function offerOf(correct: string, pool: readonly string[], count: number, rand: () => number): string[] {
  const pcOf = (id: string): number | null => (NOTE_BY_ID.has(id) ? pitchClass(NOTE_BY_ID.get(id)!) : null)
  const used = new Set<number>()
  const answerPc = pcOf(correct)
  if (answerPc !== null) used.add(answerPc)
  const chosen = [correct]
  for (const id of shuffled(pool.filter((p) => p !== correct), rand)) {
    if (chosen.length >= count) break
    const pc = pcOf(id)
    if (pc !== null) {
      if (used.has(pc)) continue
      used.add(pc)
    }
    chosen.push(id)
  }
  return chosen
}

const C_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72]
const C_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']
const STEP_ID = ['whole', 'whole', 'half', 'whole', 'whole', 'whole', 'half']

function makeQuestion(level: Level, item: Item, asked: Mode, rand: () => number): Question {
  const data = DATA[level.id]
  const pool = level.items

  if (item.id === 'whole' || item.id === 'half') {
    const allowed = (data.pairs ?? [0, 1, 2, 3, 4, 5, 6]).filter((p) => STEP_ID[p] === item.id)
    const p = pick(allowed, rand)
    const lit = [C_MAJOR[p], C_MAJOR[p + 1]]
    return {
      root: lit[0], item: item.id, mode: 'steps', notes: lit,
      prompt: { text: `In a major scale, what is the step from note ${p + 1} to note ${p + 2}? (Shown in C major.)`, lit },
      explain: `${C_NAMES[p]} to ${C_NAMES[p + 1]} in C major ${item.id === 'half' ? 'are neighbouring keys' : 'are two keys apart, with one key between'}: a ${item.id} step.`,
    }
  }

  if (item.id.startsWith('sig')) {
    const key = pick(KEYS.filter((k) => sigId(sigOf(k)) === item.id), rand)
    const n = sigOf(key)
    const name = noteLabel(key.tonic)
    return {
      root: 60, item: item.id, mode: 'signature', notes: [60],
      prompt: { text: `How many sharps or flats does ${name} major have?` },
      choices: offerOf(item.id, pool, data.offer, rand),
      explain: n === 0 ? `${name} major has no sharps or flats: all white keys.` : `${name} major has ${sigName(n)}: ${accidentals(key)}.`,
    }
  }

  if (item.id.startsWith('k-')) {
    const key = KEYS.find((k) => keyId(k) === item.id)!
    const name = noteLabel(key.tonic)
    const n = sigOf(key)
    const scale = scaleOf(key)
    if (asked === 'scale') {
      const tonic = 48 + pitchClass(key.tonic)
      const semis = [0, 2, 4, 5, 7, 9, 11, 12]
      const lit = semis.map((s) => tonic + s)
      return {
        root: lit[0], item: item.id, mode: 'scale', notes: lit,
        prompt: { text: 'Which major scale is lit?', lit },
        choices: offerOf(item.id, pool, data.offer, rand),
        explain: `${name} major: ${scale.map(noteLabel).join(' ')}. ${n === 0 ? 'All white keys.' : `It has ${sigName(n)}: ${accidentals(key)}.`}`,
      }
    }
    return {
      root: 60, item: item.id, mode: 'key', notes: [60],
      prompt: { text: `Which major key has ${n === 0 ? 'no sharps or flats' : sigName(n)}?` },
      choices: offerOf(item.id, pool, data.offer, rand),
      explain: n === 0 ? 'C major has no sharps or flats.' : `${name} major has ${sigName(n)}: ${accidentals(key)}.`,
    }
  }

  // A note of some scale: find a key and a degree that spell it.
  const options: { key: KeyDef; degree: number }[] = []
  for (const key of data.keys) scaleOf(key).forEach((note, i) => { if (i > 0 && noteId(note) === item.id) options.push({ key, degree: i }) })
  const { key, degree } = pick(options, rand)
  const name = noteLabel(key.tonic)
  return {
    root: 60, item: item.id, mode: 'note', notes: [60],
    prompt: { text: `What is the ${ORDINAL[degree]} note of ${name} major?` },
    choices: offerOf(item.id, pool, data.offer, rand),
    explain: `${name} major is ${scaleOf(key).map(noteLabel).join(' ')}, so the ${ORDINAL[degree]} note is ${noteLabel(scaleOf(key)[degree])}.`,
  }
}

export const majorScaleExercise: ExerciseDef = {
  id: 'major-scale',
  name: 'Major scale and key signatures',
  kind: 'quiz',
  blurb: 'Learn how a major scale is built (whole and half steps), name the notes of the twelve major scales, and count the sharps and flats of each key.',
  rangeWord: 'notes',
  hintLabel: 'Note:',
  question: 'Answer the question.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { steps: 'steps', signature: 'sharps and flats', note: 'scale notes', key: 'key names', scale: 'lit scales' },
  phrase: (item) => item.name.toLowerCase(),
}

