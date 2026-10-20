import { chordEvent, keyLabel } from '../harmony'
import type { TimedEvent } from '../practice'
import { pick, pulse, seededRandom } from '../rhythm'
import type { ExerciseDef, Item, Level, Mode, Question } from '../types'

/*
 * A rhythm is one bar of four beats written as a grid: "x" where a note starts, "-" where nothing new starts.
 * Eight characters is an eighth-note grid, sixteen a sixteenth-note grid. The id is the grid itself.
 */

const SYL8 = ['', '&']
const SYL16 = ['', 'e', '&', 'a']

/** "x-xx--x-" → "1 2& – 4": each beat's onsets counted, a dash for a beat with nothing new. */
export function countOf(grid: string): string {
  const per = grid.length / 4
  const syl = per === 2 ? SYL8 : SYL16
  return [0, 1, 2, 3]
    .map((b) => {
      const cell = grid.slice(b * per, (b + 1) * per)
      const s = [...cell].map((c, i) => (c === 'x' ? (i === 0 ? String(b + 1) : syl[i]) : '')).join('')
      return s || '–'
    })
    .join(' ')
}

/** A sixteenth grid with nothing on the "e" or "a" is written on the eighth grid, so each rhythm has one id. */
const simplest = (grid: string) => (grid.length === 16 && [...grid].every((c, i) => i % 2 === 0 || c === '-') ? [...grid].filter((_, i) => i % 2 === 0).join('') : grid)

/** Every bar made of the given one-beat cells; `first` limits the first beat. */
function bars(cells: readonly string[], first: readonly string[] = cells): string[] {
  const out: string[] = []
  for (const a of first) for (const b of cells) for (const c of cells) for (const d of cells) out.push(simplest(a + b + c + d))
  return [...new Set(out)]
}

const SYNCOPATED = ['x--x--x-', 'x--x-x--', 'x-x--x--', 'x--x-xx-', '-x-x-x-x', 'x-xx--x-', 'x--xx-x-', 'xx--x--x']
const SETS: Record<string, string[]> = {
  quarters: bars(['x-', '--'], ['x-']),
  eighths: bars(['x-', 'xx']),
  rests: bars(['x-', 'xx', '--'], ['x-', 'xx']),
  offbeat: bars(['x-', 'xx', '-x']),
  sixteenths: bars(['x---', 'x-x-', 'xxxx']),
  sixteenths2: bars(['x-x-', 'x-xx', 'xx-x']),
  syncopated: SYNCOPATED,
}

interface Setup {
  sets: readonly string[]
  pulse: boolean
  tempo: 'steady' | 'any'
}
const S = (sets: string[], withPulse = true, tempo: Setup['tempo'] = 'steady'): Setup => ({ sets, pulse: withPulse, tempo })
const SETUP: Record<number, Setup> = {
  1: S(['quarters']), 2: S(['eighths']), 3: S(['rests']), 4: S(['offbeat']), 5: S(['sixteenths']),
  6: S(['sixteenths2']), 7: S(['syncopated']), 8: S(['offbeat'], true, 'any'), 9: S(['offbeat'], false),
  10: S(['rests', 'offbeat', 'syncopated', 'sixteenths'], true, 'any'),
}
const levelGrids = (setup: Setup) => [...new Set(setup.sets.flatMap((s) => SETS[s]))]

const allGrids = [...new Set(Object.values(SETUP).flatMap(levelGrids))]
const items: readonly Item[] = allGrids.map((g) => ({
  id: g,
  short: countOf(g),
  name: g.length === 8 ? 'Counted in eighths' : 'Counted in sixteenths',
  hint: String(g.split('').filter((c) => c === 'x').length),
}))

const MAJ = ['major'] as const satisfies readonly Mode[]
const LEVEL_TEXT: [string, string][] = [
  ['Quarters and rests', 'A low note counts you in, then a high note plays one bar. Which beats have a note? "–" means a beat with nothing new.'],
  ['Eighths', 'Some beats have two notes: "2&" is a note on 2 and one on its "&".'],
  ['Rests too', 'Quarters, eighths and silent beats.'],
  ['Off the beat', 'Add notes on "&" alone, with nothing on the beat before: "&".'],
  ['Sixteenths', 'Beats split in four, counted 1 e & a: "1&" is two eighths, "1e&a" four sixteenths.'],
  ['Sixteenth patterns', 'Mixed sixteenths: "1&a" is long-short-short, "1ea" is short-short-long.'],
  ['Syncopation', 'Rhythms that push across the beat, like the 3 + 3 + 2 pop push.'],
  ['Any tempo', 'Off-beat rhythms, slower and faster.'],
  ['Less help', 'The low note counts you in, then stops: keep the beat in your head.'],
  ['Everything', 'Eighths, rests, off-beats, sixteenths and syncopation, at any tempo.'],
]
const levels: readonly Level[] = LEVEL_TEXT.map(([name, blurb], i) => ({ id: i + 1, name, blurb, items: levelGrids(SETUP[i + 1]), modes: MAJ, lowRange: [36, 48] as const }))

/** How many beats differ between two grids of the same size. */
function cellsApart(a: string, b: string): number {
  const per = a.length / 4
  return [0, 1, 2, 3].filter((i) => a.slice(i * per, (i + 1) * per) !== b.slice(i * per, (i + 1) * per)).length
}

function build(setup: Setup, grid: string, mode: Mode, tonicPc: number, seed: number): Question {
  const rand = seededRandom(seed)
  const { label } = keyLabel(tonicPc, 'major')
  const beat = setup.tempo === 'any' ? pick([0.55, 0.65, 0.8], rand) : 0.7
  const slot = (beat * 4) / grid.length
  const at = [...grid].flatMap((c, i) => (c === 'x' ? [i] : []))
  const sound = [72 + tonicPc]
  const events: TimedEvent[] = pulse(tonicPc, 0, 4, beat)
  const stepOf: (number | null)[] = events.map(() => null)
  const answerFrom = events.length
  for (let pass = 0; pass < 2; pass++) {
    const t = (pass + 1) * 4 * beat
    const evs: { e: TimedEvent; step: number | null }[] = setup.pulse ? pulse(tonicPc, t, 4, beat).map((e) => ({ e, step: null })) : []
    at.forEach((s, i) => {
      const next = at[i + 1] ?? grid.length
      evs.push({ e: chordEvent(t + s * slot, Math.min((next - s) * slot, beat) * 0.85, sound), step: i })
    })
    evs.sort((a, b) => a.e.time - b.e.time)
    events.push(...evs.map((x) => x.e))
    stepOf.push(...evs.map((x) => x.step))
  }
  // Three other rhythms of the level, the closest ones first: one beat different, then the same grid, then any.
  const all = levelGrids(setup).filter((g) => g !== grid)
  const same = all.filter((g) => g.length === grid.length)
  const near = same.filter((g) => cellsApart(g, grid) === 1)
  const others: string[] = []
  for (const pool of [near, same, all]) {
    const left = pool.filter((g) => !others.includes(g))
    while (others.length < 3 && left.length) others.push(left.splice(Math.floor(rand() * left.length), 1)[0])
  }
  const per = grid.length / 4
  const syl = per === 2 ? SYL8 : SYL16
  return {
    root: 48 + tonicPc, item: grid, mode, notes: [48 + tonicPc],
    events, answerFrom, stepOf,
    steps: at.map((s) => ({ label: s % per === 0 ? `beat ${s / per + 1}` : `${Math.floor(s / per) + 1} ${syl[s % per]}`, notes: sound })),
    choices: [grid, ...others],
    explain: `The rhythm was ${countOf(grid)} (in ${label}): ${at.length} notes. Try it: count "${per === 2 ? '1 & 2 & 3 & 4 &' : '1 e & a 2 e & a…'}" out loud and clap only the notes of ${countOf(grid)}, then play it on one chord.`,
    swap: (other) => build(setup, other, mode, tonicPc, seed),
  }
}

function makeQuestion(level: Level, item: Item, mode: Mode, rand: () => number): Question {
  return build(SETUP[level.id], item.id, mode, Math.floor(rand() * 12), rand())
}

export const rhythmDictationExercise: ExerciseDef = {
  noYourTurn: true,
  id: 'rhythm-dictation',
  name: 'Rhythm dictation',
  blurb: 'Hear one bar of rhythm over a steady beat and pick how it is counted, such as "1 2& – 4". Writing a rhythm as counts is how you copy a song\'s strumming, comping or melody rhythm exactly.',
  hintLabel: 'Notes:',
  question: 'Count along. Which rhythm did you hear?',
  partLabels: { key: 'The beat', question: 'The rhythm' },
  items,
  levels,
  makeQuestion,
  playStyle: () => ({ gap: 0, hold: 1 }),
  describe: (q) => q.explain ?? '',
  modeLabel: { major: 'rhythm' },
  phrase: (item) => `“${item.short}”`,
  tip: 'Count the beat out loud (1 & 2 & 3 & 4 &) while it plays, then say only the counts where a note starts. A beat with no new note is a dash. Do the same with a song: count, then clap.',
}
