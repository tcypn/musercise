import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SyncNotice } from '../components/SyncNotice'
import { daySeconds, practiceDays } from '../store/practice'
import { useProgress } from '../store/useProgress'
import { EXERCISE_LIST, EXERCISES } from '../theory/exercises'
import { localDateString } from '../theory/practice'
import { PASS_ACCURACY } from '../theory/rules'

function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

const percent = (value: number) => `${Math.round(value * 100)}%`

/** The last 14 days of the daily routine, oldest first. */
function lastDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (count - 1 - i))
    return { date: localDateString(d), label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) }
  })
}

function DailyPractice() {
  const practised = new Set(practiceDays())
  const [days] = useState(() => lastDays(14))
  const week = days.slice(-7).reduce((sum, d) => sum + daySeconds(d.date), 0)
  const count = days.filter((d) => practised.has(d.date)).length
  return (
    <>
      <h2>Daily practice</h2>
      <ol className="dots" aria-label="Days of daily practice, last 14 days">
        {days.map((d) => (
          <li key={d.date} className={practised.has(d.date) ? 'on' : ''} title={d.label}>
            <span className="visually-hidden">{d.label}: {practised.has(d.date) ? 'practised' : 'not practised'}</span>
          </li>
        ))}
      </ol>
      <p className="quiet">
        {count} of the last 14 days · {Math.round(week / 60)} min in the last 7 days. <Link to="/daily">Open today&rsquo;s practice</Link>
      </p>
    </>
  )
}

export function Progress() {
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  const { totals, history } = progress

  if (totals.sessions === 0) {
    return (
      <section className="practice">
        <h1>Progress</h1>
        <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />
        <p className="lede">Nothing here yet. Finish a session and your accuracy, streak and trouble spots show up here.</p>
        <Link className="button primary" to="/">Open the map</Link>
        <DailyPractice />
      </section>
    )
  }

  const recent = [...history].slice(0, 30).reverse() // oldest to newest, left to right
  const chartW = 600
  const chartH = 160
  const barW = chartW / Math.max(recent.length, 12)

  return (
    <section className="practice wide">
      <h1>Progress</h1>
      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />

      <dl className="totals">
        <div><dt>Sessions</dt><dd>{totals.sessions}</dd></div>
        <div><dt>Questions</dt><dd>{totals.questions}</dd></div>
        <div><dt>Accuracy</dt><dd>{percent(totals.questions ? totals.correct / totals.questions : 0)}</dd></div>
        <div><dt>Practice time</dt><dd>{duration(totals.practice_seconds)}</dd></div>
        <div><dt>Streak</dt><dd>{totals.streak_days} {totals.streak_days === 1 ? 'day' : 'days'}</dd></div>
      </dl>

      <h2>Recent sessions</h2>
      <svg className="chart" viewBox={`0 0 ${chartW} ${chartH + 24}`} role="img" aria-label={`Accuracy of your last ${recent.length} sessions`}>
        <line className="threshold" x1={0} x2={chartW} y1={chartH * (1 - PASS_ACCURACY)} y2={chartH * (1 - PASS_ACCURACY)} />
        <text className="chart-label" x={chartW - 2} y={chartH * (1 - PASS_ACCURACY) - 5} textAnchor="end">{PASS_ACCURACY * 100}% to pass</text>
        {recent.map((s, i) => {
          const h = Math.max(2, s.accuracy * chartH)
          const exercise = EXERCISES[s.exercise]
          return (
            <g key={s.id}>
              <rect className={`bar ${s.accuracy >= PASS_ACCURACY ? 'ok' : 'low'}`} x={i * barW + 2} y={chartH - h} width={barW - 4} height={h} rx={2}>
                <title>{`${exercise.name}, level ${s.level}: ${percent(s.accuracy)} on ${new Date(s.ended_at).toLocaleDateString()}`}</title>
              </rect>
              <text className="chart-label" x={i * barW + barW / 2} y={chartH + 16} textAnchor="middle">{exercise.name[0]}{s.level}</text>
            </g>
          )
        })}
      </svg>
      <p className="quiet">Each bar is one session. The label is the lesson's first letter and the level: I3 is Intervals level 3, C2 is Chord quality level 2.</p>

      <DailyPractice />

      {EXERCISE_LIST.map((exercise) => {
        const stats = progress.exercises[exercise.id]
        const byItem = new Map(stats.items.map((i) => [i.item, i]))
        const name = (id: string) => exercise.items.find((i) => i.id === id)
        return (
          <div key={exercise.id}>
            <h2>{exercise.name}</h2>
            {stats.items.length === 0 ? (
              <p className="quiet">Not practised yet. <Link to={`/learn/${exercise.id}`}>Open {exercise.name.toLowerCase()}</Link></p>
            ) : (
              <>
                <table className="interval-table">
                  <thead>
                    <tr><th scope="col">Answer</th><th scope="col">Accuracy</th><th scope="col">Heard</th></tr>
                  </thead>
                  <tbody>
                    {exercise.items.map((item) => {
                      const row = byItem.get(item.id)
                      const acc = row && row.asked ? row.correct / row.asked : null
                      return (
                        <tr key={item.id}>
                          <th scope="row"><strong>{item.short}</strong> {item.name}</th>
                          <td>
                            {acc === null ? <span className="quiet">not heard yet</span> : (
                              <span className="meter" aria-label={percent(acc)}>
                                <span className={acc >= PASS_ACCURACY ? 'ok' : 'low'} style={{ width: percent(acc) }} />
                                <em>{percent(acc)}</em>
                              </span>
                            )}
                          </td>
                          <td>{row?.asked ?? 0}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {stats.confusions.length > 0 && (
                  <>
                    <h3>What you mix up</h3>
                    <ul className="anchors">
                      {stats.confusions.slice(0, 6).map((c) => (
                        <li key={`${c.asked}-${c.answered}`}>
                          {name(c.asked)?.short} heard as {name(c.answered)?.short}
                          <span className="quiet"> · {c.count} {c.count === 1 ? 'time' : 'times'}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )
      })}
    </section>
  )
}
