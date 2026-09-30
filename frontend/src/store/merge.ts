import type { DailyRow, ExerciseProgress, HistoryRow, LevelStat, Progress, SessionPayload } from '../api/types'
import { addDays, computeStreak } from '../theory/dashboard'
import { EXERCISE_LIST } from '../theory/exercises'
import { localDateString } from '../theory/practice'
import { PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/rules'
import { emptyProgress } from './normalise'

export { emptyProgress }

interface Working {
  levels: Map<number, { sessions: number; best: number | null; firstPassed: string | null }>
  items: Map<string, { item: string; asked: number; correct: number }>
  confusions: Map<string, { asked: string; answered: string; count: number }>
}

function open(source: ExerciseProgress): Working {
  return {
    levels: new Map(source.levels.map((l) => [l.level, { sessions: l.sessions, best: l.best_accuracy, firstPassed: l.first_passed ?? null }])),
    items: new Map(source.items.map((i) => [i.item, { ...i }])),
    confusions: new Map(source.confusions.map((c) => [`${c.asked}:${c.answered}`, { ...c }])),
  }
}

function close(work: Working): ExerciseProgress {
  const levels: LevelStat[] = [...work.levels.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, v]) => ({
      level,
      sessions: v.sessions,
      best_accuracy: v.best,
      passed: v.best !== null && v.best >= PASS_ACCURACY,
      first_passed: v.firstPassed,
    }))
  return {
    levels,
    items: [...work.items.values()],
    confusions: [...work.confusions.values()].sort((a, b) => b.count - a.count).slice(0, 10),
  }
}

/** The calendar day a session counts for: the one the app recorded, else this device's date for when it ended. */
export const sessionDay = (session: SessionPayload): string => session.local_date ?? localDateString(new Date(session.ended_at))

/**
 * Server progress plus sessions that are still waiting to upload (so the UI never lags behind), plus
 * routine days that have not uploaded yet. The streak is worked out here, from the list of practised days.
 */
export function mergeProgress(
  server: Progress | null,
  pending: SessionPayload[],
  now = new Date(),
  /** Days (YYYY-MM-DD) with routine practice that the server has not confirmed yet. */
  extraDays: readonly string[] = [],
): Progress {
  const base = server ?? emptyProgress()
  const work = Object.fromEntries(EXERCISE_LIST.map((e) => [e.id, open(base.exercises[e.id])])) as Record<string, Working>
  const totals = { ...base.totals }
  const history: HistoryRow[] = [...base.history]
  const days = new Set<string>([...base.days, ...extraDays])
  const daily = new Map<string, DailyRow>(base.daily.map((r) => [r.date, { ...r }]))
  let latest = base.totals.last_practiced

  pending.forEach((session, index) => {
    const w = work[session.exercise]
    if (!w) return
    const asked = session.attempts.length
    const correct = session.attempts.filter((a) => a.answered === a.item).length
    const accuracy = asked ? correct / asked : 0
    const day = sessionDay(session)
    const seconds = Math.max(0, Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 1000))

    totals.sessions++
    totals.questions += asked
    totals.correct += correct
    totals.practice_seconds += seconds
    days.add(day)
    if (!latest || session.ended_at > latest) latest = session.ended_at

    const row = daily.get(day) ?? { date: day, sessions: 0, questions: 0, correct: 0, seconds: 0 }
    row.sessions++
    row.questions += asked
    row.correct += correct
    row.seconds += seconds
    daily.set(day, row)

    const level = w.levels.get(session.level) ?? { sessions: 0, best: null, firstPassed: null }
    level.sessions++
    if (asked >= QUESTIONS_PER_SESSION) {
      level.best = Math.max(level.best ?? 0, accuracy)
      if (accuracy >= PASS_ACCURACY && (!level.firstPassed || day < level.firstPassed)) level.firstPassed = day
    }
    w.levels.set(session.level, level)

    for (const a of session.attempts) {
      const item = w.items.get(a.item) ?? { item: a.item, asked: 0, correct: 0 }
      item.asked++
      if (a.answered === a.item) item.correct++
      else {
        const key = `${a.item}:${a.answered}`
        const c = w.confusions.get(key) ?? { asked: a.item, answered: a.answered, count: 0 }
        c.count++
        w.confusions.set(key, c)
      }
      w.items.set(a.item, item)
    }
    history.unshift({ id: `pending-${index}`, exercise: session.exercise, level: session.level, ended_at: session.ended_at, day, question_count: asked, accuracy })
  })

  // A server older than v4 only reports how long the current streak is, not which days it covers.
  const lastServerDay = base.totals.last_practice_day ?? (base.totals.last_practiced ? localDateString(new Date(base.totals.last_practiced)) : null)
  if (lastServerDay) for (let i = 0; i < base.totals.streak_days; i++) days.add(addDays(lastServerDay, -i))

  const today = localDateString(now)
  const sorted = [...days].sort()
  totals.streak_days = computeStreak(sorted, today).count
  totals.last_practiced = latest
  totals.last_practice_day = sorted[sorted.length - 1] ?? null

  return {
    totals,
    exercises: Object.fromEntries(EXERCISE_LIST.map((e) => [e.id, close(work[e.id])])) as Progress['exercises'],
    history: history.sort((a, b) => b.ended_at.localeCompare(a.ended_at)).slice(0, 60),
    practice: base.practice,
    days: sorted,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
}
