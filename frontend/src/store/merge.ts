import type { ExerciseProgress, HistoryRow, LevelStat, Progress, SessionPayload } from '../api/types'
import { EXERCISE_LIST } from '../theory/exercises'
import { PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/rules'
import { emptyProgress } from './normalise'

export { emptyProgress }

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10)
const shiftDay = (key: string, delta: number) =>
  new Date(Date.parse(key) + delta * 86_400_000).toISOString().slice(0, 10)

function streakEndingAt(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : shiftDay(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

interface Working {
  levels: Map<number, { sessions: number; best: number | null }>
  items: Map<string, { item: string; asked: number; correct: number }>
  confusions: Map<string, { asked: string; answered: string; count: number }>
}

function open(source: ExerciseProgress): Working {
  return {
    levels: new Map(source.levels.map((l) => [l.level, { sessions: l.sessions, best: l.best_accuracy }])),
    items: new Map(source.items.map((i) => [i.item, { ...i }])),
    confusions: new Map(source.confusions.map((c) => [`${c.asked}:${c.answered}`, { ...c }])),
  }
}

function close(work: Working): ExerciseProgress {
  const levels: LevelStat[] = [...work.levels.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, v]) => ({ level, sessions: v.sessions, best_accuracy: v.best, passed: v.best !== null && v.best >= PASS_ACCURACY }))
  return {
    levels,
    items: [...work.items.values()],
    confusions: [...work.confusions.values()].sort((a, b) => b.count - a.count).slice(0, 10),
  }
}

/** Server progress plus sessions that are still waiting to upload (so the UI never lags behind). */
export function mergeProgress(server: Progress | null, pending: SessionPayload[], now = new Date()): Progress {
  const base = server ?? emptyProgress()
  if (pending.length === 0) return base

  const work = Object.fromEntries(EXERCISE_LIST.map((e) => [e.id, open(base.exercises[e.id])])) as Record<string, Working>
  const totals = { ...base.totals }
  const history: HistoryRow[] = [...base.history]
  const pendingDays = new Set<string>()
  let latest = base.totals.last_practiced

  pending.forEach((session, index) => {
    const w = work[session.exercise]
    if (!w) return
    const asked = session.attempts.length
    const correct = session.attempts.filter((a) => a.answered === a.item).length
    const accuracy = asked ? correct / asked : 0

    totals.sessions++
    totals.questions += asked
    totals.correct += correct
    totals.practice_seconds += Math.max(0, Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 1000))
    pendingDays.add(dayKey(session.ended_at))
    if (!latest || session.ended_at > latest) latest = session.ended_at

    const level = w.levels.get(session.level) ?? { sessions: 0, best: null }
    level.sessions++
    if (asked >= QUESTIONS_PER_SESSION) level.best = Math.max(level.best ?? 0, accuracy)
    w.levels.set(session.level, level)

    for (const a of session.attempts) {
      const row = w.items.get(a.item) ?? { item: a.item, asked: 0, correct: 0 }
      row.asked++
      if (a.answered === a.item) row.correct++
      else {
        const key = `${a.item}:${a.answered}`
        const c = w.confusions.get(key) ?? { asked: a.item, answered: a.answered, count: 0 }
        c.count++
        w.confusions.set(key, c)
      }
      w.items.set(a.item, row)
    }
    history.unshift({ id: `pending-${index}`, exercise: session.exercise, level: session.level, ended_at: session.ended_at, question_count: asked, accuracy })
  })

  const today = dayKey(now.toISOString())
  const lastServerDay = base.totals.last_practiced ? dayKey(base.totals.last_practiced) : null
  const serverDays = new Set<string>()
  if (lastServerDay) for (let i = 0; i < base.totals.streak_days; i++) serverDays.add(shiftDay(lastServerDay, -i))
  totals.streak_days = streakEndingAt(new Set([...serverDays, ...pendingDays]), today)
  totals.last_practiced = latest

  return {
    totals,
    exercises: Object.fromEntries(EXERCISE_LIST.map((e) => [e.id, close(work[e.id])])) as Progress['exercises'],
    history: history.sort((a, b) => b.ended_at.localeCompare(a.ended_at)).slice(0, 60),
  }
}
