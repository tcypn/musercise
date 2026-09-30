import type { AccuracyView } from '../../theory/dashboard'
import { ArrowDown, ArrowUp, Equal } from './Icons'

const pct = (v: number) => `${Math.round(v * 100)}%`

export function AccuracyCard({ view }: { view: AccuracyView }) {
  const { thisWeek, delta, direction } = view
  return (
    <section className="d-card d-accuracy" aria-labelledby="d-acc-title">
      <h2 id="d-acc-title" className="d-card-title">Accuracy</h2>
      <p className="d-hero-row">
        <span className="d-hero-num">{thisWeek.accuracy === null ? '–' : Math.round(thisWeek.accuracy * 100)}</span>
        {thisWeek.accuracy !== null && <span className="d-unit">%</span>}
      </p>

      {direction === 'up' && (
        <p className="d-delta up"><ArrowUp size={18} /> {delta} {delta === 1 ? 'point' : 'points'} up on the week before</p>
      )}
      {direction === 'down' && (
        <p className="d-delta down"><ArrowDown size={18} /> {Math.abs(delta!)} {Math.abs(delta!) === 1 ? 'point' : 'points'} down on the week before</p>
      )}
      {direction === 'flat' && <p className="d-delta flat"><Equal size={18} /> Same as the week before</p>}
      {direction === 'not-enough-data' && (
        <p className="d-delta muted">
          {thisWeek.accuracy === null ? 'No questions in the last 7 days.' : 'Not enough questions yet to compare with the week before.'}
        </p>
      )}

      <p className="d-note">
        Last 7 days: {thisWeek.questions} {thisWeek.questions === 1 ? 'question' : 'questions'}
        {view.allTime !== null && <> · All time {pct(view.allTime)}</>}
      </p>
      {view.levelsPassedThisWeek > 0 && (
        <p className="d-chip">
          {view.levelsPassedThisWeek} {view.levelsPassedThisWeek === 1 ? 'level' : 'levels'} passed this week
        </p>
      )}
      {direction === 'down' && view.levelsPassedThisWeek > 0 && (
        <p className="d-note">New levels are harder, so a dip after moving up is normal.</p>
      )}
    </section>
  )
}
