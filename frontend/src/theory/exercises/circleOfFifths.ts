import { KEYS_BY_FIFTHS, noteLabel, relativeMinorTonic, signatureOf, spellFrom, type KeyDef } from '../spelling'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** The circle, clockwise from C at the top. */
const CIRCLE = KEYS_BY_FIFTHS
const ascii = (s: string) => s.replaceAll('♯', '#').replaceAll('♭', 'b')
const name = (k: KeyDef) => noteLabel(k.tonic)
const at = (i: number) => CIRCLE[((i % 12) + 12) % 12]
const indexOf = (k: KeyDef) => CIRCLE.indexOf(k)
const keyNamed = (label: string) => CIRCLE.find((k) => name(k) === label)!

const keyId = (label: string) => `k-${ascii(label)}`
const minorId = (label: string) => `km-${ascii(label)}`
const chordId = (label: string) => `c-${ascii(label)}`
const accId = (n: number) => (n === 0 ? 'acc-0' : n > 0 ? `s-${n}` : `f-${-n}`)
const accText = (n: number) => (n === 0 ? 'No sharps or flats' : `${Math.abs(n)} ${n > 0 ? 'sharp' : 'flat'}${Math.abs(n) === 1 ? '' : 's'}`)
const stepsId = (n: number) => (n > 0 ? `cw-${n}` : `ccw-${-n}`)
const stepsText = (n: number) => `${Math.abs(n)} step${Math.abs(n) === 1 ? '' : 's'} ${n > 0 ? 'clockwise' : 'counter-clockwise'}`

/** The circle as a line of text, with keys marked: [from] and <answer>. */
function circleText(marks: Record<string, string>): string {
  return `Circle: ${CIRCLE.map((k) => (marks[name(k)] ? `${marks[name(k)][0]}${name(k)}${marks[name(k)][1]}` : name(k))).join(' – ')} – (C)`
}

interface Asked {
  text: string
  answer: string
  labels: Record<string, string>
  near: string[]
  explain: string
}
const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)]
const keyLabels = () => Object.fromEntries(CIRCLE.map((k) => [keyId(name(k)), `${name(k)} major`]))

function stepQuestion(from: KeyDef, by: number): Asked {
  const to = at(indexOf(from) + by)
  return {
    text: `On the circle of fifths, what is ${Math.abs(by)} step${Math.abs(by) === 1 ? '' : 's'} ${by > 0 ? 'clockwise' : 'counter-clockwise'} from ${name(from)}?`,
    answer: keyId(name(to)),
    labels: keyLabels(),
    near: [at(indexOf(from) - by), at(indexOf(from) + by + 1), at(indexOf(from) + by - 1), from].map((k) => keyId(name(k))),
    explain: `${by > 0 ? 'Clockwise each step goes up a 5th' : 'Counter-clockwise each step goes up a 4th (down a 5th)'}: ${name(from)} → ${name(to)}. ${circleText({ [name(from)]: '[]', [name(to)]: '<>' })}`,
  }
}

function accQuestion(k: KeyDef): Asked {
  const n = signatureOf(k)
  const labels: Record<string, string> = {}
  for (let i = -7; i <= 7; i++) labels[accId(i)] = accText(i)
  const steps = indexOf(k) <= 6 ? indexOf(k) : indexOf(k) - 12
  return {
    text: `How many sharps or flats does ${name(k)} major have?`,
    answer: accId(n),
    labels,
    near: [n - 1, n + 1, -n, n + 2].filter((x) => x >= -7 && x <= 7).map(accId),
    explain: `${name(k)} major has ${accText(n).toLowerCase()}: ${steps === 0 ? 'C is at the top' : `${Math.abs(steps)} step${Math.abs(steps) === 1 ? '' : 's'} ${steps > 0 ? 'clockwise' : 'counter-clockwise'} from C, and each step ${steps > 0 ? 'clockwise adds a sharp' : 'counter-clockwise adds a flat'}`}.`,
  }
}

function relQuestion(k: KeyDef): Asked {
  const minor = noteLabel(relativeMinorTonic(k))
  const labels = Object.fromEntries(CIRCLE.map((x) => [minorId(noteLabel(relativeMinorTonic(x))), `${noteLabel(relativeMinorTonic(x))} minor`]))
  return {
    text: `What is the relative minor of ${name(k)} major?`,
    answer: minorId(minor),
    labels,
    near: [at(indexOf(k) + 1), at(indexOf(k) - 1), at(indexOf(k) + 3)].map((x) => minorId(noteLabel(relativeMinorTonic(x)))),
    explain: `The inner ring of the circle holds the relative minors: ${minor} minor shares ${name(k)} major's key signature. Its home note is the 6th note of ${name(k)} major.`,
  }
}

function neighbourQuestion(k: KeyDef, which: 'IV' | 'V'): Asked {
  const to = at(indexOf(k) + (which === 'V' ? 1 : -1))
  return {
    text: `On the circle, a key's V chord is one step clockwise and its IV chord one step counter-clockwise. What is the ${which} chord in ${name(k)} major?`,
    answer: keyId(name(to)),
    labels: keyLabels(),
    near: [at(indexOf(k) + (which === 'V' ? -1 : 1)), at(indexOf(k) + (which === 'V' ? 2 : -2)), k].map((x) => keyId(name(x))),
    explain: `The ${which} chord of ${name(k)} is its ${which === 'V' ? 'clockwise' : 'counter-clockwise'} neighbour: ${name(to)}. I, IV and V always sit side by side on the circle. ${circleText({ [name(k)]: '[]', [name(to)]: '<>' })}`,
  }
}

function distanceQuestion(from: KeyDef, by: number): Asked {
  const to = at(indexOf(from) + by)
  const labels: Record<string, string> = {}
  for (let i = 1; i <= 5; i++) {
    labels[stepsId(i)] = stepsText(i)
    labels[stepsId(-i)] = stepsText(-i)
  }
  return {
    text: `A song moves from ${name(from)} major to ${name(to)} major. How far is that on the circle, the short way round?`,
    answer: stepsId(by),
    labels,
    near: [-by, by + (by > 0 ? 1 : -1), by - (by > 0 ? 1 : -1)].filter((x) => x !== 0 && Math.abs(x) <= 5).map(stepsId),
    explain: `${name(from)} to ${name(to)} is ${stepsText(by)}. Keys close on the circle share most of their notes, so a move of 1 step sounds smooth and a far move sounds bold. ${circleText({ [name(from)]: '[]', [name(to)]: '<>' })}`,
  }
}

function moveQuestion(k: KeyDef, rand: () => number): Asked {
  if (rand() < 0.5) {
    const v = at(indexOf(k) + 1)
    return {
      text: `V–I moves one step counter-clockwise on the circle. If V is ${name(v)}, what is I?`,
      answer: keyId(name(k)),
      labels: keyLabels(),
      near: [at(indexOf(k) + 2), at(indexOf(k) - 1), v].map((x) => keyId(name(x))),
      explain: `${name(v)} is V of ${name(k)}: one step counter-clockwise from ${name(v)} lands on ${name(k)}, home.`,
    }
  }
  const ii = spellFrom(k.tonic, [[1, 2]])[0]
  const labels = Object.fromEntries(CIRCLE.map((x) => {
    const r = noteLabel(spellFrom(x.tonic, [[1, 2]])[0])
    return [chordId(`${r}m`), `${r}m`]
  }))
  const iiName = `${noteLabel(ii)}m`
  return {
    text: `ii–V–I walks counter-clockwise round the circle, one step per chord. In ${name(k)} major, what is the ii chord?`,
    answer: chordId(iiName),
    labels,
    near: [at(indexOf(k) + 1), at(indexOf(k) - 1), at(indexOf(k) + 3)].map((x) => chordId(`${noteLabel(spellFrom(x.tonic, [[1, 2]])[0])}m`)),
    explain: `ii is two steps clockwise from I, so ii–V–I steps back counter-clockwise: ${iiName} → ${name(at(indexOf(k) + 1))} → ${name(k)}.`,
  }
}

/** At the bottom of the circle three keys have two names (B = C♭, F♯ = G♭, D♭ = C♯). */
const ENHARMONIC: [string, string, number, number][] = [['B', 'C♭', 5, -7], ['F♯', 'G♭', 6, -6], ['D♭', 'C♯', -5, 7]]
function enharmonicQuestion(rand: () => number): Asked {
  const [a, b, accA, accB] = pick(ENHARMONIC, rand)
  const labels: Record<string, string> = { ...keyLabels() }
  ENHARMONIC.forEach(([, other]) => (labels[keyId(other)] = `${other} major`))
  for (let i = -7; i <= 7; i++) labels[accId(i)] = accText(i)
  if (rand() < 0.5) {
    return {
      text: `At the bottom of the circle, which key sounds the same as ${a} major?`,
      answer: keyId(b),
      labels,
      near: ENHARMONIC.map(([, o]) => keyId(o)).concat([keyId(name(at(indexOf(keyNamed(a)) + 1)))]),
      explain: `${a} major and ${b} major are the same keys on the piano, written two ways: ${a} with ${accText(accA).toLowerCase()}, ${b} with ${accText(accB).toLowerCase()}. Charts use whichever is easier to read.`,
    }
  }
  return {
    text: `How many sharps or flats does ${b} major have?`,
    answer: accId(accB),
    labels,
    near: [accA, accB + (accB > 0 ? -1 : 1), -accB].map(accId),
    explain: `${b} major is ${a} major written the other way: ${accText(accB).toLowerCase()} instead of ${accText(accA).toLowerCase()}.`,
  }
}

const SHARP_SIDE = ['C', 'G', 'D', 'A'].map(keyNamed)
const FLAT_SIDE = ['C', 'F', 'B♭', 'E♭'].map(keyNamed)
function questionFor(level: number, rand: () => number): Asked {
  switch (level) {
    case 1: return stepQuestion(pick(SHARP_SIDE, rand), 1)
    case 2: return stepQuestion(pick(FLAT_SIDE, rand), -1)
    case 3: return accQuestion(pick(CIRCLE, rand))
    case 4: return relQuestion(pick(CIRCLE, rand))
    case 5: return neighbourQuestion(pick(CIRCLE, rand), rand() < 0.5 ? 'IV' : 'V')
    case 6: return stepQuestion(pick(CIRCLE, rand), pick([1, -1, 2, -2], rand))
    case 7: return distanceQuestion(pick(CIRCLE, rand), pick([1, 2, 3, 4, 5, -1, -2, -3, -4, -5], rand))
    case 8: return moveQuestion(pick(CIRCLE, rand), rand)
    case 9: return enharmonicQuestion(rand)
    default: return questionFor(1 + Math.floor(rand() * 9), rand)
  }
}

/** Wrong answers are always the same kind as the right one: keys with keys, counts with counts. */
const kindOf = (id: string) =>
  /^(cw|ccw)-/.test(id) ? 'steps' : id.startsWith('km-') ? 'minor' : id.startsWith('k-') ? 'key' : id.startsWith('c-') ? 'chord' : 'acc'

// ---- Answers and levels -----------------------------------------------------------------------------

function seeded(seed: number): () => number {
  let x = seed
  return () => (x = (x * 48271) % 2147483647) / 2147483647
}
const LEVEL_ANSWERS = new Map<number, string[]>()
const labelOf = new Map<string, string>()
for (let level = 1; level <= 10; level++) {
  const rand = seeded(4000 + level)
  const count = new Map<string, number>()
  for (let i = 0; i < 4000; i++) {
    const a = questionFor(level, rand)
    count.set(a.answer, (count.get(a.answer) ?? 0) + 1)
    Object.entries(a.labels).forEach(([id, s]) => labelOf.set(id, s))
  }
  LEVEL_ANSWERS.set(level, [...count].filter(([, n]) => n >= 10).map(([id]) => id))
}
const allIds = [...new Set([...LEVEL_ANSWERS.values()].flat())]
const NAME: Record<string, string> = { key: 'On the circle', minor: 'Relative minor', acc: 'Key signature', steps: 'The short way round', chord: 'The ii chord' }
const items: readonly Item[] = allIds.map((id) => ({ id, short: labelOf.get(id)!, name: NAME[kindOf(id)], hint: 'Picture the circle: C at the top, sharps clockwise, flats counter-clockwise' }))

const LEVEL_TEXT: [string, string][] = [
  ['Clockwise', 'The circle of fifths puts the twelve keys round a clock: C at the top, then each step clockwise is a 5th up: C G D A E B…'],
  ['Counter-clockwise', 'Counter-clockwise each step is a 4th up: C F B♭ E♭ A♭…'],
  ['Sharps and flats', 'Each step clockwise from C adds a sharp; each step counter-clockwise adds a flat.'],
  ['Relative minors', 'The inner ring: every major key shares its signature with a minor key, its 6th note (A minor for C).'],
  ['IV and V', 'A key\'s IV and V chords are its two neighbours on the circle.'],
  ['All twelve', 'One or two steps either way, from any key.'],
  ['How far', 'How far a key change travels round the circle, the short way.'],
  ['Chord moves', 'V–I steps counter-clockwise; ii–V–I is two steps counter-clockwise in a row.'],
  ['Two names', 'At the bottom three keys have two names: B = C♭, F♯ = G♭, D♭ = C♯.'],
  ['Everything', 'Any of the above.'],
]
const QUIZ = ['chord'] as const satisfies readonly Mode[]
const levels: readonly Level[] = LEVEL_TEXT.map(([n, blurb], i) => ({ id: i + 1, name: n, blurb, items: LEVEL_ANSWERS.get(i + 1)!, modes: QUIZ, lowRange: [48, 72] as const }))

function makeQuestion(level: Level, item: Item, _asked: Mode, rand: () => number): Question {
  let a = questionFor(level.id, rand)
  for (let tries = 0; a.answer !== item.id && tries < 20000; tries++) a = questionFor(level.id, rand)
  const offered = [item.id]
  const offer = (id: string) => {
    if (offered.length < 4 && !offered.includes(id) && level.items.includes(id) && kindOf(id) === kindOf(item.id)) offered.push(id)
  }
  a.near.forEach(offer)
  for (const id of level.items) if (rand() < 0.3) offer(id)
  level.items.forEach(offer)
  return { root: 60, item: item.id, mode: 'chord', notes: [60], prompt: { text: a.text }, choices: offered, explain: a.explain }
}

export const circleOfFifthsExercise: ExerciseDef = {
  id: 'circle-of-fifths',
  name: 'The circle of fifths',
  kind: 'quiz',
  blurb: 'The map of all twelve keys: C at the top, sharps clockwise, flats counter-clockwise. Use it to find key signatures, relative minors, a key\'s IV and V, how far a key change travels, and why ii–V–I sounds so natural.',
  rangeWord: 'key',
  hintLabel: 'Hint:',
  question: 'Use the circle.',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1.5 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { chord: 'circle' },
  phrase: (item) => (item.id.startsWith('c-') ? `the ${item.short} chord` : item.short),
}
