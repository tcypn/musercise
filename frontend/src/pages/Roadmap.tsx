import { Link } from 'react-router-dom'
import { Keyboard } from '../components/Keyboard'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { INTERVAL_LEVELS, isUnlocked, levelIntervals, PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/roadmap'

const MODE_LABEL = { ascending: 'up', descending: 'down', harmonic: 'together' } as const

export function Roadmap() {
  const { progress, passed, nextLevel, sync, message, pendingCount } = useProgress()
  const stats = new Map(progress.levels.map((l) => [l.level, l]))
  const { totals } = progress
  const allPassed = passed.size === INTERVAL_LEVELS.length

  return (
    <>
      <section className="hero">
        <h1>Interval recognition</h1>
        <p className="lede">
          Hear two notes, name the distance between them. Ten levels take you from the fifth and octave to every interval
          across all 88 keys.
        </p>
        <Keyboard range={nextLevel.lowRange} />
        <p className="hero-caption">
          The lit strip is where level {nextLevel.id} places its lower note.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to={`/practice/${nextLevel.id}`}>
            {allPassed ? 'Practice level 10 again' : totals.sessions === 0 ? 'Start level 1' : `Continue with level ${nextLevel.id}`}
          </Link>
          {totals.sessions > 0 && (
            <span className="quiet">
              {totals.questions} questions answered
              {totals.streak_days > 0 && `, ${totals.streak_days}-day streak`}
            </span>
          )}
        </div>
      </section>

      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} />

      <ol className="levels" aria-label="Levels">
        {INTERVAL_LEVELS.map((level) => {
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
                <span className="chips" aria-label="Intervals in this level">
                  {levelIntervals(level).map((i) => (
                    <span key={i.semitones} className="chip">{i.short}</span>
                  ))}
                  <span className="chip mode">{level.modes.map((m) => MODE_LABEL[m]).join(' / ')}</span>
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
                <Link to={`/practice/${level.id}`} className="level-link">{body}</Link>
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
