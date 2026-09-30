import type { LevelStat, Progress, SessionPayload } from '../api/types'
import { PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/roadmap'

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

export function emptyProgress(): Progress {
  return {
    totals: { sessions: 0, questions: 0, correct: 0, practice_seconds: 0, streak_days: 0, last_practiced: null },
    levels: [],
    intervals: [],
    confusions: [],
    history: [],
  }
}

/** Server progress plus sessions that are still waiting to upload (so the UI never lags behind). */
export function mergeProgress(server: Progress | null, pending: SessionPayload[], now = new Date()): Progress {
  const base = server ?? emptyProgress()
  if (pending.length === 0) return base

  const levels = new Map<number, { sessions: number; best: number | null }>(
    base.levels.map((l) => [l.level, { sessions: l.sessions, best: l.best_accuracy }]),
  )
  const intervals = new Map(base.intervals.map((i) => [i.semitones, { ...i }]))
  const confusions = new Map(base.confusions.map((c) => [`${c.asked}:${c.answered}`, { ...c }]))
  const totals = { ...base.totals }
  const history = [...base.history]
  const pendingDays = new Set<string>()
  let latest = base.totals.last_practiced

  pending.forEach((session, index) => {
    const asked = session.attempts.length
    const correct = session.attempts.filter((a) => a.answered_semitones === a.interval_semitones).length
    const accuracy = asked ? correct / asked : 0

    totals.sessions++
    totals.questions += asked
    totals.correct += correct
    totals.practice_seconds += Math.max(0, Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 1000))
    pendingDays.add(dayKey(session.ended_at))
    if (!latest || session.ended_at > latest) latest = session.ended_at

    const level = levels.get(session.level) ?? { sessions: 0, best: null }
    level.sessions++
    if (asked >= QUESTIONS_PER_SESSION) level.best = Math.max(level.best ?? 0, accuracy)
    levels.set(session.level, level)

    for (const a of session.attempts) {
      const row = intervals.get(a.interval_semitones) ?? { semitones: a.interval_semitones, asked: 0, correct: 0 }
      row.asked++
      if (a.answered_semitones === a.interval_semitones) row.correct++
      else {
        const key = `${a.interval_semitones}:${a.answered_semitones}`
        const c = confusions.get(key) ?? { asked: a.interval_semitones, answered: a.answered_semitones, count: 0 }
        c.count++
        confusions.set(key, c)
      }
      intervals.set(a.interval_semitones, row)
    }
    history.unshift({ id: `pending-${index}`, level: session.level, ended_at: session.ended_at, question_count: asked, accuracy })
  })

  const today = dayKey(now.toISOString())
  const lastServerDay = base.totals.last_practiced ? dayKey(base.totals.last_practiced) : null
  const serverDays = new Set<string>()
  if (lastServerDay) for (let i = 0; i < base.totals.streak_days; i++) serverDays.add(shiftDay(lastServerDay, -i))
  totals.streak_days = streakEndingAt(new Set([...serverDays, ...pendingDays]), today)
  totals.last_practiced = latest

  const levelRows: LevelStat[] = [...levels.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, v]) => ({ level, sessions: v.sessions, best_accuracy: v.best, passed: v.best !== null && v.best >= PASS_ACCURACY }))

  return {
    totals,
    levels: levelRows,
    intervals: [...intervals.values()].sort((a, b) => a.semitones - b.semitones),
    confusions: [...confusions.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    history: history.sort((a, b) => b.ended_at.localeCompare(a.ended_at)).slice(0, 60),
  }
}
