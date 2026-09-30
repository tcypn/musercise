import { Link } from 'react-router-dom'
import { SyncNotice } from '../components/SyncNotice'
import { useProgress } from '../store/useProgress'
import { INTERVALS, intervalBySemitones } from '../theory/intervals'
import { PASS_ACCURACY } from '../theory/roadmap'

function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

const percent = (value: number) => `${Math.round(value * 100)}%`

export function Progress() {
  const { progress, nextLevel, sync, message, pendingCount } = useProgress()
  const { totals, intervals, confusions, history } = progress
  const byInterval = new Map(intervals.map((i) => [i.semitones, i]))

  if (totals.sessions === 0) {
    return (
      <section className="practice">
        <h1>Progress</h1>
        <SyncNotice sync={sync} message={message} pendingCount={pendingCount} />
        <p className="lede">Nothing here yet. Finish a session and your accuracy, streak and trouble spots show up here.</p>
        <Link className="button primary" to={`/practice/${nextLevel.id}`}>Start level {nextLevel.id}</Link>
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
      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} />

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
          return (
            <g key={s.id}>
              <rect className={`bar ${s.accuracy >= PASS_ACCURACY ? 'ok' : 'low'}`} x={i * barW + 2} y={chartH - h} width={barW - 4} height={h} rx={2}>
                <title>{`Level ${s.level}: ${percent(s.accuracy)} on ${new Date(s.ended_at).toLocaleDateString()}`}</title>
              </rect>
              <text className="chart-label" x={i * barW + barW / 2} y={chartH + 16} textAnchor="middle">{s.level}</text>
            </g>
          )
        })}
      </svg>
      <p className="quiet">Each bar is one session. The number underneath is its level.</p>

      <h2>By interval</h2>
      <table className="interval-table">
        <thead>
          <tr><th scope="col">Interval</th><th scope="col">Accuracy</th><th scope="col">Heard</th></tr>
        </thead>
        <tbody>
          {INTERVALS.map((i) => {
            const row = byInterval.get(i.semitones)
            const acc = row && row.asked ? row.correct / row.asked : null
            return (
              <tr key={i.semitones}>
                <th scope="row"><strong>{i.short}</strong> {i.name}</th>
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

      {confusions.length > 0 && (
        <>
          <h2>What you mix up</h2>
          <ul className="anchors">
            {confusions.slice(0, 6).map((c) => (
              <li key={`${c.asked}-${c.answered}`}>
                {intervalBySemitones(c.asked).short} heard as {intervalBySemitones(c.answered).short}
                <span className="quiet"> · {c.count} {c.count === 1 ? 'time' : 'times'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
