import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckBold, Close } from '../components/dash/Icons'
import { useGoal } from '../store/useGoal'
import { useProgress } from '../store/useProgress'
import { buildPath, defaultStage } from '../theory/path'

/** Every stage (or every stage of your goal) as a card, like a Duolingo section list. */
export function Stages() {
  const { progress } = useProgress()
  const goal = useGoal()
  const navigate = useNavigate()
  const from = (useLocation().state as { stage?: number } | null)?.stage
  const stages = useMemo(() => buildPath(progress, goal), [progress, goal])
  const here = from ?? defaultStage(stages)

  return (
    <div className="fullpage">
      <header className="fullpage-top">
        <Link to="/" className="lesson-x" aria-label="Close"><Close size={26} /></Link>
        <h1 className="fullpage-title">{goal ? goal.name : 'All lessons'}</h1>
      </header>
      <ol className="stage-cards">
        {stages.map((s) => {
          const share = s.levelsTotal ? s.levelsPassed / s.levelsTotal : 0
          const current = s.stage.id === here
          return (
            <li key={s.stage.id} className={`stage-card2 ${current ? 'current' : ''} ${s.finished ? 'finished' : ''}`}>
              <div className="stage-card2-head">
                <h2>Stage {s.stage.id}: {s.stage.name}</h2>
                {s.finished && <span className="stage-card2-done" aria-label="Finished"><CheckBold size={20} /></span>}
              </div>
              <p className="quiet">{s.stage.blurb}</p>
              {s.levelsTotal > 0 && (
                <div className="goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={s.levelsTotal} aria-valuenow={s.levelsPassed} aria-label={`Stage ${s.stage.id}: levels passed`}>
                  <span style={{ width: `${Math.round(share * 100)}%` }} />
                </div>
              )}
              <p className="quiet stage-card2-count">
                {s.ready === 0 ? 'Coming soon' : `${s.levelsPassed} of ${s.levelsTotal} levels passed · ${s.ready} of ${s.total} lessons ready`}
              </p>
              {current ? (
                <span className="stage-card2-here">You are here</span>
              ) : (
                <button type="button" className="stage-card2-jump" onClick={() => navigate('/', { state: { stage: s.stage.id } })}>Jump here</button>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
