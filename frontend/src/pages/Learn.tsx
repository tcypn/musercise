import { useMemo, useState } from 'react'
import { GoalWelcome } from '../components/dash/GoalWelcome'
import { Link } from 'react-router-dom'
import { AccuracyCard } from '../components/dash/AccuracyCard'
import { EarRadar } from '../components/dash/EarRadar'
import { MistakesCard } from '../components/dash/MistakesCard'
import { Flame } from '../components/dash/Icons'
import { RecommendedList } from '../components/dash/RecommendedList'
import { TodayCard } from '../components/dash/TodayCard'
import { PathView } from '../components/path/PathView'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { accuracyView, computeStreak, last7, recommendations } from '../theory/dashboard'
import { activeGoal, getGoalById, goalProgress, markWelcomeSeen, setActiveGoal, welcomeSeen } from '../theory/goals'
import { weakSpots } from '../theory/mistakes'
import { buildPath, defaultStage } from '../theory/path'
import { localDateString } from '../theory/practice'

/** Home: the lesson path in the middle; the streak (top right) and today's cards beside it. */
export function Learn() {
  const today = useMemo(() => localDateString(), [])
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  const [picked, setPicked] = useState<number | null>(null)

  const streak = useMemo(() => computeStreak(progress.days, today), [progress.days, today])
  const accuracy = useMemo(() => accuracyView(progress, today), [progress, today])
  const bars = useMemo(() => last7(progress.daily, today), [progress.daily, today])
  const recs = useMemo(() => recommendations(progress, today), [progress, today])
  const [goalId, setGoalId] = useState(() => activeGoal()?.id ?? null)
  const [welcome, setWelcome] = useState(() => !welcomeSeen() && !activeGoal())
  const goal = getGoalById(goalId)
  const goalLine = useMemo(() => {
    if (!goal) return null
    const p = goalProgress(goal, progress)
    return { name: goal.name, done: p.done, total: p.total }
  }, [goal, progress])
  const path = useMemo(() => buildPath(progress, goal), [progress, goal])
  const chooseGoal = (id: string | null) => {
    setActiveGoal(id)
    markWelcomeSeen()
    setGoalId(id)
    setWelcome(false)
    setPicked(null)
  }
  const spots = useMemo(() => weakSpots(progress), [progress])
  const openId = picked ?? defaultStage(path)

  return (
    <div className="dash learn">
      <h1 className="visually-hidden">Learn</h1>

      <div className="learn-top">
        <Link
          to="/streak"
          className={streak.count === 0 ? 'streak-chip idle' : 'streak-chip'}
          aria-label={`${streak.count}-day streak. Open the streak page`}
        >
          <Flame size={30} className={streak.count === 0 ? 'd-flame off' : 'd-flame'} />
          <span aria-hidden="true">{streak.count}</span>
        </Link>
      </div>

      <div className="learn-notice">
        <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />
        {welcome && <GoalWelcome onChoose={chooseGoal} />}
      </div>

      <div className="learn-today"><TodayCard today={today} /></div>
      <div className="learn-rec"><RecommendedList items={recs} /></div>
      <div className="learn-mistakes"><MistakesCard spots={spots} /></div>
      <div className="learn-accuracy"><AccuracyCard view={accuracy} days={bars} /></div>
      <div className="learn-path">
        <PathView stages={path} openId={openId} onOpen={setPicked} goal={goalLine} />
      </div>
      <div className="learn-ear"><EarRadar exercises={progress.exercises} /></div>
    </div>
  )
}
