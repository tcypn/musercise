import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { GoalChip } from '../components/dash/GoalChip'
import { StreakChip } from '../components/dash/StreakChip'
import { AccuracyCard } from '../components/dash/AccuracyCard'
import { EarRadar } from '../components/dash/EarRadar'
import { MistakesCard } from '../components/dash/MistakesCard'
import { RecommendedList } from '../components/dash/RecommendedList'
import { TodayCard } from '../components/dash/TodayCard'
import { PathView } from '../components/path/PathView'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { accuracyView, last7, recommendations } from '../theory/dashboard'
import { useGoal } from '../store/useGoal'
import { weakSpots } from '../theory/mistakes'
import { buildPath, defaultStage } from '../theory/path'
import { localDateString } from '../theory/practice'

/** Home: the lesson path in the middle; the streak (top right) and today's cards beside it. */
export function Learn() {
  const today = useMemo(() => localDateString(), [])
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  // "Jump here" on the stage list comes back with the stage to show.
  const location = useLocation()
  const [picked, setPicked] = useState<number | null>(() => (location.state as { stage?: number } | null)?.stage ?? null)

  const accuracy = useMemo(() => accuracyView(progress, today), [progress, today])
  const bars = useMemo(() => last7(progress.daily, today), [progress.daily, today])
  const recs = useMemo(() => recommendations(progress, today), [progress, today])
  const goal = useGoal()
  const path = useMemo(() => buildPath(progress, goal), [progress, goal])
  const spots = useMemo(() => weakSpots(progress), [progress])
  const openId = picked ?? defaultStage(path)

  // Open where you left off: START in view, as Duolingo does.
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.querySelector('.path-node.current')?.scrollIntoView({ block: 'center' }))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="dash learn">
      <h1 className="visually-hidden">Learn</h1>

      {/* On phones the goal and the streak are in the app bar instead. */}
      <div className="learn-top">
        <GoalChip />
        <StreakChip days={progress.days} />
      </div>

      <div className="learn-notice">
        <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />
      </div>

      <div className="learn-path">
        <PathView stages={path} openId={openId} onOpen={setPicked} />
      </div>
      {/* On wide screens these cards form a column beside the path that stays on screen while the path scrolls. */}
      <div className="learn-side">
        <div className="learn-today"><TodayCard today={today} /></div>
        <div className="learn-rec"><RecommendedList items={recs} /></div>
        <div className="learn-mistakes"><MistakesCard spots={spots} /></div>
        <div className="learn-accuracy"><AccuracyCard view={accuracy} days={bars} /></div>
        <div className="learn-ear"><EarRadar exercises={progress.exercises} /></div>
      </div>
    </div>
  )
}
