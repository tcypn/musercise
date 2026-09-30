import { useMemo } from 'react'
import { BackLink } from '../components/BackLink'
import { MonthCalendar } from '../components/dash/MonthCalendar'
import { StreakCard } from '../components/dash/StreakCard'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { computeStreak, weekStrip } from '../theory/dashboard'
import { localDateString } from '../theory/practice'

/** The streak in full: this week, the month, and how the rest day works. */
export function Streak() {
  const today = useMemo(() => localDateString(), [])
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  const streak = useMemo(() => computeStreak(progress.days, today), [progress.days, today])
  const strip = useMemo(() => weekStrip(progress.days, streak.restDays, today), [progress.days, streak.restDays, today])

  return (
    <div className="dash streak-page">
      <BackLink to="/">Learn</BackLink>
      <h1>Day streak</h1>
      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />
      <div className="streak-grid">
        <StreakCard streak={streak} strip={strip} today={today} />
        <MonthCalendar days={progress.days} restDays={streak.restDays} today={today} />
        <section className="d-card" aria-labelledby="how-title">
          <h2 id="how-title" className="d-card-title">How the streak works</h2>
          <ul className="d-rules">
            <li>Practise once a day to add a day. A finished lesson counts, and so does any row of Today&rsquo;s practice you timed or ticked.</li>
            <li>You get <strong>one free rest day each week</strong> (Monday to Sunday). A single missed day is forgiven, as long as you practised the day before it.</li>
            <li>Two missed days in a row end the streak, and so does a second missed day in the same week.</li>
            <li>Rest days are shown with a moon. They keep the streak alive but do not add to its count.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
