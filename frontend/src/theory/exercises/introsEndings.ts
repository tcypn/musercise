import { barEvents, type Pattern } from '../comping'
import { keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, seededRandom, voiceNumerals } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/** Ways to start, end, or go back to the top of a song: the chords, one per bar. */
const DEVICES: readonly (Item & { chords: string[]; how: string; tryIt: string })[] = [
  { id: 'plain', short: 'Plain V-I', name: 'A plain ending (V to I)', hint: 'IV V I, in time, then stop', chords: ['IV', 'V', 'I'], how: 'IV, V, then I held, all in time: the plain, safe ending.', tryIt: 'play IV, V, I in time and hold the last chord' },
  { id: 'ritard', short: 'Slow down', name: 'Slowing down to the end', hint: 'The same chords, getting slower', chords: ['IV', 'V', 'I'], how: 'the same IV V I, but each bar slower than the last, and the last chord held long: a ritardando, the gentlest way to end a ballad.', tryIt: 'play IV V I and let each bar take a little longer, then hold I and let it ring' },
  { id: 'iv-ending', short: 'IV iv I', name: 'The minor iv ending (IV iv I)', hint: 'F, Fm, C: bittersweet', chords: ['IV', 'iv', 'I'], how: 'IV turns minor (iv) before the final I: a bittersweet, heartfelt ending.', tryIt: 'play F, Fm, C (in C): only A moves, down to A♭ and on to G' },
  { id: 'flat-six', short: '♭VI ♭VII I', name: 'The ♭VI ♭VII I ending', hint: 'A♭, B♭, C: a big rising finish', chords: ['bVI', 'bVII', 'I'], how: 'two chords borrowed from the minor key, ♭VI and ♭VII, rising to I: the big, triumphant rock and anthem ending.', tryIt: 'play A♭, B♭, C (in C), then hold C' },
  { id: 'turnaround', short: 'Turnaround', name: 'A turnaround (I vi ii V)', hint: 'Back to the top: I vi ii V', chords: ['I', 'vi', 'ii', 'V', 'I'], how: 'I, vi, ii, V, and back to I: a turnaround, played at the end of a section to lead back to the start.', tryIt: 'play C, Am, Dm, G, then C again: use it whenever the song goes back to the top' },
  { id: 'vamp', short: 'Vamp', name: 'A two-chord vamp intro', hint: 'Two chords back and forth, waiting', chords: ['I', 'IV', 'I', 'IV'], how: 'two chords back and forth (I IV I IV): a vamp, the easiest intro, which can repeat until the singer is ready.', tryIt: 'rock between C and F until the singer comes in, then go to the first chord of the song' },
  { id: 'tag', short: 'Tag', name: 'A tag ending', hint: 'The last line three times, then home', chords: ['ii', 'V', 'ii', 'V', 'ii', 'V', 'I'], how: 'the last line (ii V) played three times before going home to I: a tag, which makes an ending feel big and final, as in gospel and jazz.', tryIt: 'play Dm G three times, a little stronger each time, then C' },
]
const BY_ID = new Map(DEVICES.map((d) => [d.id, d]))
const items: readonly Item[] = DEVICES.map(({ id, short, name, hint }) => ({ id, short, name, hint }))

interface Setup {
  anyKey: boolean
  patterns: readonly Pattern[]
  beat: number
}
const S = (anyKey: boolean, patterns: Pattern[] = ['basic'], beat = 0.42): Setup => ({ anyKey, patterns, beat })
const SETUP: Record<number, Setup> = {
  1: S(false), 2: S(false), 3: S(false), 4: S(false), 5: S(false), 6: S(false), 7: S(true),
  8: S(true, ['push', 'ballad', 'gospel', 'arpeggio']), 9: S(true, ['basic', 'push'], 0.34), 10: S(true, ['basic', 'push', 'ballad', 'gospel'], 0.38),
}

const MAJ = ['major'] as const satisfies readonly Mode[]
const ALL = DEVICES.map((d) => d.id)
const LEVEL_TEXT: [string, string, string[]][] = [
  ['Plain or slowing down', 'The end of a song: IV V I. Does it stay in time, or slow down to the end?', ['plain', 'ritard']],
  ['Minor iv', 'Add the IV iv I ending.', ['plain', 'ritard', 'iv-ending']],
  ['♭VI ♭VII I', 'Add the big rock ending from ♭VI and ♭VII.', ['plain', 'ritard', 'iv-ending', 'flat-six']],
  ['Vamp or turnaround', 'Now starts and returns: a two-chord vamp intro, or a turnaround back to the top?', ['vamp', 'turnaround']],
  ['Tag', 'Add the tag: the last line three times, then home.', ['vamp', 'turnaround', 'tag']],
  ['All seven', 'Every ending, intro and turnaround.', ALL],
  ['Any key', 'All seven, in any key.', ALL],
  ['With a groove', 'Played with different comping patterns.', ALL],
  ['Faster', 'At a quicker tempo.', ALL],
  ['Everything', 'Any device, key, groove and tempo.', ALL],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb, ids], i) => ({ id: i + 1, name, blurb, items: ids, modes: MAJ, lowRange: [36, 60] as const }))

const ENDS = ['plain', 'ritard', 'iv-ending', 'flat-six', 'turnaround', 'tag']
const pretty = (n: string) => n.replace('b', '♭')

function build(setup: Setup, id: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const d = BY_ID.get(id)!
  const { label } = keyLabel(tonicPc, 'major')
  const pattern = pick(setup.patterns, rand)
  const { voiced, names } = voiceNumerals(tonicPc, d.chords)
  const events: TimedEvent[] = []
  const stepOf: number[] = []
  let t = 0
  voiced.forEach((v, i) => {
    // A ritardando stretches each bar more than the last.
    const stretch = id === 'ritard' ? [1, 1.3, 1.7][i] : 1
    const beat = setup.beat * stretch
    const last = i === voiced.length - 1 && ENDS.includes(id)
    const bar = barEvents(v, last ? 'held' : pattern, t, beat, rand)
    events.push(...bar)
    stepOf.push(...bar.map(() => i))
    t += 4 * beat
  })
  return {
    root: 48 + tonicPc, item: id, mode, notes: [48 + tonicPc],
    events, stepOf,
    steps: voiced.map((v, i) => ({ label: `${pretty(d.chords[i])} · ${names[i]}`, notes: [v.bass, ...v.upper] })),
    explain: `${d.name} in ${label}: ${d.how} Try it: ${d.tryIt}${tonicPc === 0 ? '' : ' (in C)'}.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  const setup = SETUP[level.id]
  return build(setup, item.id, mode, setup.anyKey ? Math.floor(rand() * 12) : 0, rand())
}

export const introsEndingsExercise: ExerciseDef = {
  id: 'intros-endings',
  name: 'Intros, endings and turnarounds',
  blurb: 'A chord sheet rarely says how to start or finish. Hear the classic moves and name them: a plain ending, slowing down, the minor iv, ♭VI ♭VII I, a turnaround back to the top, a vamp intro, and a tag.',
  hintLabel: 'Chords:',
  question: 'How does this start, end or go back to the top?',
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 2 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'device' },
  phrase: (item) => BY_ID.get(item.id)!.name.replace(/^A /, 'a ').replace(/^The /, 'the ').replace(/^Slowing/, 'slowing'),
  tip: 'No intro written? Vamp two chords, or play the last line of the song. To go back to the top, use a turnaround (I vi ii V). To end: slow down and hold I, use IV iv I for a soft ending or ♭VI ♭VII I for a big one, or tag the last line three times.',
}
