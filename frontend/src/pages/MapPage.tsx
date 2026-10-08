import { Link } from 'react-router-dom'
import { SyncNotice } from '../components/SyncNotice'
import { getDay } from '../store/practice'
import { useProgress } from '../store/useProgress'
import { getConcept, KIND_LABEL, SUGGESTED_ROUTE } from '../theory/curriculum'
import { activeGoal } from '../theory/goals'
import { EXERCISES, nextLevel } from '../theory/exercises'
import { summariseMap, type ConceptStatus } from '../theory/mapProgress'
import { keyForDate, localDateString, ROUTINE } from '../theory/practice'

const STATE_LABEL = { soon: 'Coming soon', ready: 'Ready', progress: 'In progress', mastered: 'Mastered' } as const

export function MapPage() {
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  const map = summariseMap(progress)
  const here = getConcept(map.here ?? undefined)
  const hereExercise = here?.exerciseId ? EXERCISES[here.exerciseId] : undefined
  const passed = new Set(
    hereExercise ? progress.exercises[hereExercise.id].levels.filter((l) => l.passed).map((l) => l.level) : [],
  )
  const resume = hereExercise ? nextLevel(hereExercise, passed) : undefined
  const started = progress.totals.sessions > 0
  const percent = Math.round(map.percent * 100)
  const today = localDateString()
  const todayDone = ROUTINE.filter((r) => getDay(today)[r.id]?.done).length

  return (
    <>
      <section className="hero">
        <h1>Your route to playing by ear</h1>
        <p className="lede">
          Seven stages take you from finding notes on the keyboard to accompanying a song and improvising. {map.openCount} of{' '}
          {map.conceptCount} lessons are ready. The rest are on the way, and you can read about each one now.
        </p>
        <div className="map-summary">
          <div
            className="map-meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Share of the whole map completed"
          >
            <span style={{ width: `${Math.max(percent, percent > 0 ? 1 : 0)}%` }} />
          </div>
          <p className="quiet">
            {map.masteredCount} of {map.conceptCount} lessons mastered · {percent}% of the map
            {progress.totals.streak_days > 0 && ` · ${progress.totals.streak_days}-day streak`}
          </p>
        </div>
        <div className="hero-actions">
          {here && resume && hereExercise && (
            <Link className="button primary" to={`/practice/${hereExercise.id}/${resume.id}`}>
              {started ? `Continue: ${here.name}, level ${resume.id}` : `Start with ${here.name.toLowerCase()}`}
            </Link>
          )}
          <Link className="button" to="/daily">Today&rsquo;s practice</Link>
          <span className="quiet">{keyForDate(today).label} major · {todayDone} of {ROUTINE.length} done</span>
        </div>
      </section>

      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />

      <p className="quiet route-legend">
        <span className="route-mark" aria-hidden="true">◆</span> {activeGoal() ? <>marks the lessons of your goal, <Link to="/goals">{activeGoal()!.name.toLowerCase()}</Link>.</> : <>marks the suggested route to accompanying a pop or R&amp;B song. <Link to="/goals">Choose a goal</Link> to mark your own.</>} Nothing is locked, so start anywhere.
      </p>

      <ol className="stages" aria-label="Stages">
        {map.stages.map(({ stage, statuses, open, mastered }) => (
          <li key={stage.id} className="stage">
            <div className="stage-head">
              <span className="stage-num" aria-hidden="true">{stage.id}</span>
              <div>
                <h2 className="stage-name">{stage.name}</h2>
                <p className="stage-blurb">{stage.blurb}</p>
                <p className="stage-count">
                  {open === 0 ? 'No lessons ready yet' : `${open} of ${statuses.length} ready`}
                  {mastered > 0 && ` · ${mastered} mastered`}
                </p>
              </div>
            </div>
            <ul className="concepts">
              {statuses.map((status) => (
                <ConceptRow key={status.concept.id} status={status} here={map.here === status.concept.id} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  )
}

function ConceptRow({ status, here }: { status: ConceptStatus; here: boolean }) {
  const { concept, state, passed, total } = status
  const onRoute = (activeGoal()?.lessons ?? SUGGESTED_ROUTE).includes(concept.id)
  const to = concept.exerciseId ? `/learn/${concept.exerciseId}` : `/soon/${concept.id}`
  return (
    <li className={`concept ${state}`}>
      <Link to={to} className="concept-link">
        <span className="concept-main">
          <span className="concept-name">
            {onRoute && <span className="route-mark" role="img" aria-label={activeGoal() ? "In your goal" : "On the suggested route"}>◆</span>}
            {concept.name}
            {here && <span className="here">You are here</span>}
          </span>
          <span className="concept-kind">{KIND_LABEL[concept.kind]}{concept.later ? ' · better later' : ''}</span>
        </span>
        <span className="concept-state">
          {total > 0 && state !== 'ready' ? (
            <span className="mini-meter" aria-label={`${passed} of ${total} levels passed`}>
              <span style={{ width: `${(passed / total) * 100}%` }} />
            </span>
          ) : null}
          <span className={`badge ${state}`}>
            {total > 0 && state === 'progress' ? `${passed}/${total} levels` : STATE_LABEL[state]}
          </span>
        </span>
      </Link>
    </li>
  )
}
