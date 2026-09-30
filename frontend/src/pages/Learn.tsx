import { useMemo, useState } from 'react'
import { AccuracyCard } from '../components/dash/AccuracyCard'
import { EarRadar } from '../components/dash/EarRadar'
import { Flame } from '../components/dash/Icons'
import { RecommendedList } from '../components/dash/RecommendedList'
import { StreakCard } from '../components/dash/StreakCard'
import { TodayCard } from '../components/dash/TodayCard'
import { PathView } from '../components/path/PathView'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { accuracyView, computeStreak, recommendations, weekStrip } from '../theory/dashboard'
import { buildPath, defaultStage } from '../theory/path'
import { localDateString } from '../theory/practice'

function greeting(hour: number): string {
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Home: the lesson path in the middle, today's cards around it. */
export function Learn() {
  const today = useMemo(() => localDateString(), [])
  const [hello] = useState(() => greeting(new Date().getHours()))
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  const [picked, setPicked] = useState<number | null>(null)

  const streak = useMemo(() => computeStreak(progress.days, today), [progress.days, today])
  const strip = useMemo(() => weekStrip(progress.days, streak.restDays, today), [progress.days, streak.restDays, today])
  const accuracy = useMemo(() => accuracyView(progress, today), [progress, today])
  const recs = useMemo(() => recommendations(progress, today), [progress, today])
  const path = useMemo(() => buildPath(progress), [progress])
  const openId = picked ?? defaultStage(path)
  const started = progress.totals.sessions > 0

  return (
    <div className="dash learn">
      <header className="learn-head">
        <div>
          <h1>{hello}.</h1>
          <p className="d-sub">{started ? 'Pick up where you left off.' : 'Welcome. Your first lesson takes about five minutes.'}</p>
        </div>
        <p className="streak-chip" aria-label={`${streak.count}-day streak`}>
          <Flame size={28} className={streak.count === 0 ? 'd-flame off' : 'd-flame'} />
          <span>{streak.count}</span>
        </p>
      </header>

      <div className="learn-notice"><SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} /></div>

      <div className="learn-streak"><StreakCard streak={streak} strip={strip} today={today} /></div>
      <div className="learn-today"><TodayCard today={today} /></div>
      <div className="learn-accuracy"><AccuracyCard view={accuracy} /></div>
      <div className="learn-rec"><RecommendedList items={recs} /></div>
      <div className="learn-path"><PathView stages={path} openId={openId} onOpen={setPicked} /></div>
      <div className="learn-ear"><EarRadar exercises={progress.exercises} /></div>
    </div>
  )
}
