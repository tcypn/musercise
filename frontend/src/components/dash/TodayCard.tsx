import { Link } from 'react-router-dom'
import { ROUTINE, ROUTINE_MINUTES } from '../../theory/practice'
import { keyForDate } from '../../theory/practice'
import { getDay } from '../../store/practice'
import { keyName } from '../../theory/spelling'

export function TodayCard({ today }: { today: string }) {
  const day = getDay(today)
  const done = ROUTINE.filter((r) => day[r.id]?.done).length
  const minutes = Math.round(Object.values(day).reduce((sum, log) => sum + (log?.seconds ?? 0), 0) / 60)
  const all = done === ROUTINE.length
  const next = ROUTINE.find((r) => !day[r.id]?.done)
  return (
    <section className="d-card d-today" aria-labelledby="d-today-title">
      <h2 id="d-today-title" className="d-card-title">Today&rsquo;s practice</h2>
      <p className="d-key">{keyName(keyForDate(today))}</p>
      <div className="d-meter" role="progressbar" aria-valuemin={0} aria-valuemax={ROUTINE.length} aria-valuenow={done} aria-label="Rows of today's practice done">
        <span style={{ width: `${(done / ROUTINE.length) * 100}%` }} />
      </div>
      <p className="d-note">
        {done} of {ROUTINE.length} done · {minutes} of about {ROUTINE_MINUTES} min
      </p>
      {next && <p className="d-next">Next up: <strong>{next.title}</strong> · {next.minutes} min</p>}
      <Link className="d-btn primary" to="/daily">{all ? 'Review today' : done > 0 ? 'Keep going' : 'Start'}</Link>
    </section>
  )
}
