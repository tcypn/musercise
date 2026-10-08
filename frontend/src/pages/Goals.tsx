import { Link } from 'react-router-dom'
import { useProgress } from '../store/useProgress'
import { useGoal } from '../store/useGoal'
import { GOALS, goalProgress, setActiveGoal, type LessonState } from '../theory/goals'

const STATE_TEXT: Record<LessonState, string> = { done: 'Done', started: 'In progress', new: 'Not started', soon: 'Coming soon' }

/** Choose what you want to be able to do; the path on Home then shows only those lessons. */
export function Goals() {
  const { progress } = useProgress()
  const active = useGoal()?.id ?? null
  const choose = (id: string | null) => setActiveGoal(id)

  return (
    <section className="practice">
      <h1>Your goal</h1>
      <p className="lede">Pick what you want to be able to do. The path on Learn then shows only the lessons that lead there, and the Map marks them with ◆.</p>
      {GOALS.map((g) => {
        const p = goalProgress(g, progress)
        const percent = Math.round((p.done / p.total) * 100)
        const isActive = active === g.id
        return (
          <article key={g.id} className={`goal-card ${isActive ? 'active' : ''}`} aria-labelledby={`goal-${g.id}`}>
            <h2 id={`goal-${g.id}`}>{g.name}{isActive ? ' · your goal' : ''}</h2>
            <p className="quiet" style={{ margin: '0.25rem 0 0' }}>{g.why}</p>
            <div className="goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done} aria-label={`${g.name}: lessons done`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="quiet" style={{ margin: 0 }}>{p.done} of {p.total} lessons done{p.ready < p.total ? ` · ${p.total - p.ready} coming soon` : ''}</p>
            <ol className="goal-lessons">
              {p.lessons.map((l) => (
                <li key={l.conceptId} className={l.state}>
                  <Link to={l.to}>
                    <span>{l.name}</span>
                    <span className="goal-state">{l.state === 'started' ? `${l.passed} of ${l.levels} levels` : STATE_TEXT[l.state]}</span>
                  </Link>
                </li>
              ))}
            </ol>
            {isActive ? (
              <Link to="/" className="button primary">Go to the path</Link>
            ) : (
              <button type="button" className="button primary" onClick={() => choose(g.id)}>Set as my goal</button>
            )}
          </article>
        )
      })}
      <button type="button" className="button" onClick={() => choose(null)} aria-pressed={active === null}>
        Show me everything{active === null ? ' (now)' : ''}
      </button>
    </section>
  )
}
