import { BackLink } from '../components/BackLink'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Keyboard } from '../components/Keyboard'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { getExercise, levelItems, nextLevel } from '../theory/exercises'
import { weakSpot } from '../theory/mistakes'
import { isUnlocked, PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/rules'

/** The ten levels of one concept. */
export function Roadmap() {
  const { exercise: id } = useParams()
  const exercise = getExercise(id)
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  if (!exercise) return <Navigate to="/" replace />

  const stats = new Map(progress.exercises[exercise.id].levels.map((l) => [l.level, l]))
  const passed = new Set(progress.exercises[exercise.id].levels.filter((l) => l.passed).map((l) => l.level))
  const next = nextLevel(exercise, passed)
  const weak = weakSpot(exercise, progress)
  const allPassed = passed.size === exercise.levels.length
  const any = stats.size > 0

  return (
    <>
      <section className="hero">
        <BackLink to="/map">Map</BackLink>
        <h1>{exercise.name}</h1>
        <p className="lede">{exercise.blurb}</p>
        <Keyboard range={next.lowRange} />
        <p className="hero-caption">The lit strip is where level {next.id} places its {exercise.rangeWord ?? 'lowest note'}.</p>
        <div className="hero-actions">
          <Link className="button primary" to={`/practice/${exercise.id}/${next.id}`}>
            {allPassed ? `Practice level ${next.id} again` : !any ? 'Start level 1' : `Continue with level ${next.id}`}
          </Link>
          {weak && <Link className="button" to={`/mistakes/${exercise.id}`}>Practise your mistakes</Link>}
          {progress.totals.sessions > 0 && (
            <span className="quiet">
              {progress.totals.questions} questions answered in all
              {progress.totals.streak_days > 0 && `, ${progress.totals.streak_days}-day streak`}
            </span>
          )}
        </div>
      </section>

      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />

      <ol className="levels" aria-label="Levels">
        {exercise.levels.map((level) => {
          const open = isUnlocked(level.id, passed)
          const stat = stats.get(level.id)
          const done = passed.has(level.id)
          const state = done ? 'passed' : open ? 'open' : 'locked'
          const body = (
            <>
              <span className="level-num" aria-hidden="true">{level.id}</span>
              <span className="level-body">
                <span className="level-title">
                  {level.name}
                  <span className={`badge ${state}`}>{done ? 'Passed' : open ? 'Open' : 'Locked'}</span>
                </span>
                <span className="level-blurb">{level.blurb}</span>
                <span className="chips" aria-label="What this level asks">
                  {levelItems(exercise, level).map((item) => (
                    <span key={item.id} className="chip">{item.short}</span>
                  ))}
                  <span className="chip mode">{level.modes.map((m) => exercise.modeLabel[m]).filter(Boolean).join(' / ')}</span>
                </span>
                <span className="level-status">
                  {!open && `Pass level ${level.id - 1} with ${PASS_ACCURACY * 100}% to unlock.`}
                  {open && !stat && `${QUESTIONS_PER_SESSION} questions. Score ${PASS_ACCURACY * 100}% to pass.`}
                  {open && stat && (
                    <>
                      {stat.best_accuracy === null
                        ? `${stat.sessions} unfinished ${stat.sessions === 1 ? 'session' : 'sessions'}`
                        : `Best ${Math.round(stat.best_accuracy * 100)}%`}
                      {' · '}
                      {stat.sessions} {stat.sessions === 1 ? 'session' : 'sessions'}
                    </>
                  )}
                </span>
              </span>
            </>
          )
          return (
            <li key={level.id} className={`level ${state}`}>
              {open ? (
                <Link to={`/practice/${exercise.id}/${level.id}`} className="level-link">{body}</Link>
              ) : (
                <div className="level-link">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}
