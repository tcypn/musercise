import type { AccuracyView, SeriesPoint } from '../../theory/dashboard'
import { ArrowDown, ArrowUp, Equal, Target } from './Icons'

const pct = (v: number) => `${Math.round(v * 100)}%`
const BAR_AREA = 64 // px, the height a 100% day reaches

interface Props {
  view: AccuracyView
  /** The last 7 days, oldest first; the last one is today. */
  days: SeriesPoint[]
}

export function AccuracyCard({ view, days }: Props) {
  const { thisWeek, delta, direction } = view
  const gap = delta === null ? 0 : Math.abs(delta)
  const points = `${gap} ${gap === 1 ? 'point' : 'points'}`
  return (
    <section className="d-card d-accuracy" aria-labelledby="d-acc-title">
      <div className="acc-head">
        <div>
          <h2 id="d-acc-title" className="acc-title">Accuracy, last 7 days</h2>
          <p className="acc-main">
            <span className="acc-num">{thisWeek.accuracy === null ? '–' : `${Math.round(thisWeek.accuracy * 100)}%`}</span>
            {direction === 'up' && <span className="acc-pill up"><ArrowUp size={14} /> {gap} pts<span className="visually-hidden">, up on the week before</span></span>}
            {direction === 'down' && <span className="acc-pill down"><ArrowDown size={14} /> {gap} pts<span className="visually-hidden">, down on the week before</span></span>}
            {direction === 'flat' && <span className="acc-pill flat"><Equal size={14} /> same<span className="visually-hidden"> as the week before</span></span>}
          </p>
        </div>
        <span className="acc-icon" aria-hidden="true"><Target size={26} /></span>
      </div>

      <ol className="acc-bars" aria-label="Accuracy on each of the last 7 days">
        {days.map((d, i) => {
          const today = i === days.length - 1
          return (
            <li key={d.date} className={today ? 'today' : ''}>
              <span className="acc-bar-area">
                <span
                  className={d.accuracy === null ? 'acc-bar empty' : 'acc-bar'}
                  style={{ height: d.accuracy === null ? 6 : Math.max(8, Math.round(d.accuracy * BAR_AREA)) }}
                />
              </span>
              <span className="acc-day" aria-hidden="true">{d.label.slice(0, 1)}</span>
              <span className="visually-hidden">
                {d.label}{today ? ' (today)' : ''}: {d.accuracy === null ? 'no questions' : `${pct(d.accuracy)} of ${d.questions}`}
              </span>
            </li>
          )
        })}
      </ol>

      {direction === 'up' && <p className="d-note">{points} up on the week before.</p>}
      {direction === 'down' && <p className="d-note">{points} down on the week before.</p>}
      {direction === 'flat' && <p className="d-note">Same as the week before.</p>}
      {direction === 'not-enough-data' && (
        <p className="d-note">
          {thisWeek.accuracy === null ? 'No questions in the last 7 days.' : 'Not enough questions yet to compare with the week before.'}
        </p>
      )}
      <p className="d-note">
        {thisWeek.questions} {thisWeek.questions === 1 ? 'question' : 'questions'} this week
        {view.allTime !== null && <> · all time {pct(view.allTime)}</>}
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
