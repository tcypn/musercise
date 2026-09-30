import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccuracyCard } from '../components/dash/AccuracyCard'
import { EarRadar } from '../components/dash/EarRadar'
import { MapCard } from '../components/dash/MapCard'
import { MonthCalendar } from '../components/dash/MonthCalendar'
import { RecommendedList } from '../components/dash/RecommendedList'
import { StreakCard } from '../components/dash/StreakCard'
import { TodayCard } from '../components/dash/TodayCard'
import { TrendChart } from '../components/dash/TrendChart'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { accuracyView, computeStreak, recommendations, weekSeries, weekStrip } from '../theory/dashboard'
import { getConcept } from '../theory/curriculum'
import { EXERCISES, nextLevel } from '../theory/exercises'
import { summariseMap } from '../theory/mapProgress'
import { localDateString } from '../theory/practice'

function greeting(hour: number): string {
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const today = useMemo(() => localDateString(), [])
  const [hello] = useState(() => greeting(new Date().getHours()))
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()

  const streak = useMemo(() => computeStreak(progress.days, today), [progress.days, today])
  const strip = useMemo(() => weekStrip(progress.days, streak.restDays, today), [progress.days, streak.restDays, today])
  const accuracy = useMemo(() => accuracyView(progress, today), [progress, today])
  const recs = useMemo(() => recommendations(progress, today), [progress, today])
  const series = useMemo(() => weekSeries(progress.daily, today), [progress.daily, today])
  const map = useMemo(() => summariseMap(progress), [progress])

  // The lesson to carry on with: where you were, at your next unpassed level.
  const here = getConcept(map.here ?? undefined)
  const exercise = here?.exerciseId ? EXERCISES[here.exerciseId] : undefined
  const resume = exercise
    ? nextLevel(exercise, new Set(progress.exercises[exercise.id].levels.filter((l) => l.passed).map((l) => l.level)))
    : undefined
  const started = progress.totals.sessions > 0

  return (
    <div className="dash">
      <header className="d-head">
        <div>
          <h1>{hello}.</h1>
          <p className="d-sub">{started ? 'Here is where you are today.' : 'Welcome. Your first session takes about five minutes.'}</p>
        </div>
        {exercise && resume && (
          <Link className="d-btn primary big" to={`/practice/${exercise.id}/${resume.id}`}>
            {started ? `Continue: ${exercise.name}, level ${resume.id}` : `Start ${exercise.name.toLowerCase()}`}
          </Link>
        )}
      </header>

      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />

      <div className="d-row top">
        <StreakCard streak={streak} strip={strip} today={today} />
        <AccuracyCard view={accuracy} />
        <TodayCard today={today} />
      </div>

      <RecommendedList items={recs} />

      <div className="d-row mid">
        <TrendChart thisWeek={series.thisWeek} lastWeek={series.lastWeek} />
        <MonthCalendar days={progress.days} restDays={streak.restDays} today={today} />
      </div>

      <div className="d-row bottom">
        <EarRadar exercises={progress.exercises} />
        <MapCard map={map} />
      </div>
    </div>
  )
}
