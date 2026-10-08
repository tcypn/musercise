import { GOALS } from '../../theory/goals'

interface Props {
  /** A goal id, or null for "show me everything". */
  onChoose: (id: string | null) => void
}

/** Shown once, above the path: what do you want to be able to do? */
export function GoalWelcome({ onChoose }: Props) {
  return (
    <section className="goal-welcome" aria-labelledby="goal-welcome-title">
      <h2 id="goal-welcome-title">What do you want to be able to do?</h2>
      <p className="quiet" style={{ margin: 0 }}>Pick a goal and the path shows only the lessons that lead there. You can change it any time from the line at the top of the path.</p>
      <div className="goal-choices">
        {GOALS.map((g) => (
          <button key={g.id} type="button" className="goal-choice" onClick={() => onChoose(g.id)}>
            <strong>{g.name}</strong>
            <span className="quiet">{g.why}</span>
          </button>
        ))}
      </div>
      <button type="button" className="button" onClick={() => onChoose(null)}>Show me everything</button>
    </section>
  )
}
