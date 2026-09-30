import type { DailyRow, ExerciseProgress, Progress } from '../api/types'
import { EXERCISES, EXERCISE_LIST, getItem, nextLevel } from './exercises'
import type { ExerciseDef, ExerciseId, Item } from './types'

/** Dates are plain YYYY-MM-DD strings in the user's own calendar. All date maths here works on the calendar, not on clock time. */
const MS_PER_DAY = 86_400_000
const parts = (date: string) => date.split('-').map(Number) as [number, number, number]
const toUtc = (date: string) => Date.UTC(...(([y, m, d]) => [y, m - 1, d] as const)(parts(date)))
const pad = (n: number) => String(n).padStart(2, '0')

export function addDays(date: string, n: number): string {
  const d = new Date(toUtc(date) + n * MS_PER_DAY)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export const daysBetween = (from: string, to: string): number => Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY)

/** Monday = 0 ... Sunday = 6. */
export const weekdayIndex = (date: string): number => (new Date(toUtc(date)).getUTCDay() + 6) % 7

export const weekStart = (date: string): string => addDays(date, -weekdayIndex(date))

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// ---- Streak ------------------------------------------------------------------------------------

export interface Streak {
  /** Days practised in the streak (rest days are not counted). */
  count: number
  /** Missed days that were forgiven, newest first. */
  restDays: string[]
  /** done: practised today. open: today is still to do. at-risk: yesterday was a rest day, so missing today would end the streak. */
  status: 'done' | 'open' | 'at-risk'
}

/**
 * A daily streak with one free rest day per Monday-Sunday week. Walking back from today (from yesterday
 * if today is still to do), a practised day adds one. A missed day is forgiven only if the day before it
 * was practised (never two misses in a row) and no rest day was already used in the same week.
 */
export function computeStreak(practised: Iterable<string>, today: string): Streak {
  const days = new Set(practised)
  const restDays: string[] = []
  const restWeeks = new Set<string>()
  let cursor = days.has(today) ? today : addDays(today, -1)
  let count = 0
  for (let guard = 0; guard < 5000; guard++) {
    if (days.has(cursor)) {
      count++
      cursor = addDays(cursor, -1)
      continue
    }
    const week = weekStart(cursor)
    if (!restWeeks.has(week) && days.has(addDays(cursor, -1))) {
      restWeeks.add(week)
      restDays.push(cursor)
      cursor = addDays(cursor, -1)
      continue
    }
    break
  }
  const yesterday = addDays(today, -1)
  const status = days.has(today) ? 'done' : restDays[0] === yesterday ? 'at-risk' : 'open'
  return { count, restDays, status }
}

export type DayState = 'practised' | 'rest' | 'missed' | 'today' | 'future'

export interface StripDay {
  date: string
  label: (typeof WEEKDAYS)[number]
  state: DayState
}

/** Monday to Sunday of the week containing `today`. */
export function weekStrip(practised: Iterable<string>, restDays: readonly string[], today: string): StripDay[] {
  const days = new Set(practised)
  const rests = new Set(restDays)
  const monday = weekStart(today)
  return WEEKDAYS.map((label, i) => {
    const date = addDays(monday, i)
    let state: DayState
    if (date > today) state = 'future'
    else if (days.has(date)) state = 'practised'
    else if (date === today) state = 'today'
    else if (rests.has(date)) state = 'rest'
    else state = 'missed'
    return { date, label, state }
  })
}

// ---- Accuracy ----------------------------------------------------------------------------------

export const MIN_QUESTIONS_FOR_TREND = 20

export interface Window {
  questions: number
  correct: number
  /** 0 to 1, or null with no questions. */
  accuracy: number | null
}

export interface AccuracyView {
  thisWeek: Window
  previousWeek: Window
  /** Whole percentage points, this week minus the week before. Null unless both weeks have enough questions. */
  delta: number | null
  direction: 'up' | 'down' | 'flat' | 'not-enough-data'
  allTime: number | null
  levelsPassedThisWeek: number
}

function windowOf(daily: readonly DailyRow[], from: string, to: string): Window {
  let questions = 0
  let correct = 0
  for (const row of daily) {
    if (row.date >= from && row.date <= to) {
      questions += row.questions
      correct += row.correct
    }
  }
  return { questions, correct, accuracy: questions > 0 ? correct / questions : null }
}

/** The last 7 days against the 7 days before them. Accuracy is total correct over total questions, not an average of days. */
export function accuracyView(progress: Progress, today: string): AccuracyView {
  const thisWeek = windowOf(progress.daily, addDays(today, -6), today)
  const previousWeek = windowOf(progress.daily, addDays(today, -13), addDays(today, -7))
  const enough = thisWeek.questions >= MIN_QUESTIONS_FOR_TREND && previousWeek.questions >= MIN_QUESTIONS_FOR_TREND
  // Compare the whole numbers that are shown, so "82% vs 76%" always reads as 6 points.
  const delta = enough ? Math.round(thisWeek.accuracy! * 100) - Math.round(previousWeek.accuracy! * 100) : null
  const { questions, correct } = progress.totals
  const since = addDays(today, -6)
  const levelsPassedThisWeek = EXERCISE_LIST.reduce(
    (sum, ex) => sum + progress.exercises[ex.id].levels.filter((l) => !!l.first_passed && l.first_passed >= since && l.first_passed <= today).length,
    0,
  )
  return {
    thisWeek,
    previousWeek,
    delta,
    direction: delta === null ? 'not-enough-data' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    allTime: questions > 0 ? correct / questions : null,
    levelsPassedThisWeek,
  }
}

export interface SeriesPoint {
  date: string
  label: (typeof WEEKDAYS)[number]
  questions: number
  /** 0 to 1, or null when nothing was answered that day (the line breaks there). */
  accuracy: number | null
}

/** Accuracy for each day Monday to Sunday of this week and of last week. */
export function weekSeries(daily: readonly DailyRow[], today: string): { thisWeek: SeriesPoint[]; lastWeek: SeriesPoint[] } {
  const byDate = new Map(daily.map((r) => [r.date, r]))
  const build = (monday: string): SeriesPoint[] =>
    WEEKDAYS.map((label, i) => {
      const date = addDays(monday, i)
      const row = date <= today ? byDate.get(date) : undefined
      return { date, label, questions: row?.questions ?? 0, accuracy: row && row.questions > 0 ? row.correct / row.questions : null }
    })
  const monday = weekStart(today)
  return { thisWeek: build(monday), lastWeek: build(addDays(monday, -7)) }
}

// ---- Calendar ----------------------------------------------------------------------------------

export interface CalendarCell {
  date: string
  inMonth: boolean
  state: DayState | 'none'
}

/** A Monday-first month grid of whole weeks. */
export function monthGrid(practised: Iterable<string>, restDays: readonly string[], year: number, month: number, today: string): CalendarCell[][] {
  const days = new Set(practised)
  const rests = new Set(restDays)
  const first = `${year}-${pad(month)}-01`
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`
  const lastDay = addDays(nextMonth, -1)
  const start = weekStart(first)
  const end = addDays(lastDay, 6 - weekdayIndex(lastDay))
  const weeks: CalendarCell[][] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(cursor, i)
        let state: CalendarCell['state'] = 'none'
        if (date > today) state = 'future'
        else if (days.has(date)) state = 'practised'
        else if (rests.has(date)) state = 'rest'
        if (date === today && state === 'none') state = 'today'
        return { date, inMonth: date >= first && date <= lastDay, state }
      }),
    )
  }
  return weeks
}

// ---- Radar -------------------------------------------------------------------------------------

export interface RadarAxis {
  id: string
  short: string
  name: string
  asked: number
  /** 0 to 1, or null when the item has never been asked. */
  accuracy: number | null
}

export function radarData(stats: ExerciseProgress, items: readonly Item[]): RadarAxis[] {
  const byItem = new Map(stats.items.map((i) => [i.item, i]))
  return items.map((item) => {
    const row = byItem.get(item.id)
    return { id: item.id, short: item.short, name: item.name, asked: row?.asked ?? 0, accuracy: row && row.asked > 0 ? row.correct / row.asked : null }
  })
}

// ---- Recommendations ---------------------------------------------------------------------------

export interface Recommendation {
  kind: 'weak' | 'next' | 'stale'
  title: string
  reason: string
  to: string
}

const WEAK_MIN_ANSWERS = 8
const WEAK_BELOW = 0.8

const passedLevels = (progress: Progress, id: ExerciseId): Set<number> =>
  new Set(progress.exercises[id].levels.filter((l) => l.passed).map((l) => l.level))

function lastDay(progress: Progress, id: ExerciseId): string | null {
  const row = progress.history.find((h) => h.exercise === id)
  return row ? (row.day ?? row.ended_at.slice(0, 10)) : null
}

function weakSpot(progress: Progress): Recommendation | null {
  let worst: { exercise: ExerciseDef; item: Item; asked: number; accuracy: number } | null = null
  for (const exercise of EXERCISE_LIST) {
    for (const row of progress.exercises[exercise.id].items) {
      if (row.asked < WEAK_MIN_ANSWERS) continue
      const accuracy = row.correct / row.asked
      if (accuracy >= WEAK_BELOW) continue
      if (!worst || accuracy < worst.accuracy || (accuracy === worst.accuracy && row.asked > worst.asked)) {
        worst = { exercise, item: getItem(exercise, row.item), asked: row.asked, accuracy }
      }
    }
  }
  if (!worst) return null
  const { exercise, item } = worst
  const passed = passedLevels(progress, exercise.id)
  // The easiest level you can play that includes it: fewer answers to choose from, so it comes up more often.
  const open = exercise.levels.filter((l) => l.id === 1 || passed.has(l.id - 1))
  const level = open.find((l) => l.items.includes(item.id)) ?? open[0]
  const confusion = progress.exercises[exercise.id].confusions
    .filter((c) => c.asked === item.id)
    .sort((a, b) => b.count - a.count)[0]
  const confused = confusion ? getItem(exercise, confusion.answered) : null
  return {
    kind: 'weak',
    title: `Work on the ${item.name.toLowerCase()}`,
    reason: `${Math.round(worst.accuracy * 100)}% right so far${confused ? `, often heard as the ${confused.name.toLowerCase()}` : ''}`,
    to: `/practice/${exercise.id}/${level.id}`,
  }
}

/** Up to three suggestions: your weakest answer, your next level, and what you have practised least recently. */
export function recommendations(progress: Progress, today: string): Recommendation[] {
  const list: Recommendation[] = []
  const add = (r: Recommendation | null) => {
    if (r && !list.some((x) => x.to === r.to)) list.push(r)
  }

  add(weakSpot(progress))

  // Next level of whatever you practised most recently, if it is not finished.
  const recent = progress.history[0] ? EXERCISES[progress.history[0].exercise] : undefined
  const candidates = recent ? [recent, ...EXERCISE_LIST.filter((e) => e.id !== recent.id)] : [...EXERCISE_LIST]
  for (const exercise of candidates) {
    const passed = passedLevels(progress, exercise.id)
    if (passed.size >= exercise.levels.length) continue
    if (exercise.id !== recent?.id && progress.exercises[exercise.id].levels.length === 0) continue
    const level = nextLevel(exercise, passed)
    const best = progress.exercises[exercise.id].levels.find((l) => l.level === level.id)?.best_accuracy
    add({
      kind: 'next',
      title: `${exercise.name}, level ${level.id}: ${level.name}`,
      reason: best != null ? `Best so far ${Math.round(best * 100)}%. You need 80% to pass` : passed.size === 0 ? 'Where to begin' : 'Your next level',
      to: `/practice/${exercise.id}/${level.id}`,
    })
    break
  }

  // The exercise left alone the longest (or never started).
  const oldest = [...EXERCISE_LIST].sort((a, b) => (lastDay(progress, a.id) ?? '').localeCompare(lastDay(progress, b.id) ?? ''))[0]
  const passed = passedLevels(progress, oldest.id)
  if (passed.size < oldest.levels.length) {
    const level = nextLevel(oldest, passed)
    const last = lastDay(progress, oldest.id)
    const ago = last ? daysBetween(last, today) : null
    add({
      kind: 'stale',
      title: `${oldest.name}, level ${level.id}: ${level.name}`,
      reason: ago === null ? 'Not started yet' : ago <= 0 ? 'Practised today' : ago === 1 ? 'Last practised yesterday' : `Last practised ${ago} days ago`,
      to: `/practice/${oldest.id}/${level.id}`,
    })
  }
  return list.slice(0, 3)
}
