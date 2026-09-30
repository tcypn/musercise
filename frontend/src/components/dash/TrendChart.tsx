import { useEffect, useState } from 'react'
import type { SeriesPoint } from '../../theory/dashboard'

interface Props {
  thisWeek: SeriesPoint[]
  lastWeek: SeriesPoint[]
}

// Geometry follows the real width of the card, so text stays a readable size on a phone.
const MIN_W = 300
const PAD_L = 46
const PAD_T = 22
const PAD_B = 36
const PASS = 0.8

/** The vertical axis starts at the lowest round number below the data, so a week of 70-90% is not squashed at the top. */
function domainFor(points: SeriesPoint[]): { lo: number; ticks: number[] } {
  const values = points.map((p) => p.accuracy).filter((v): v is number => v !== null)
  const min = values.length > 0 ? Math.min(...values) : 1
  if (min >= 0.55) return { lo: 0.5, ticks: [0.5, 0.6, 0.7, 0.8, 0.9, 1] }
  if (min >= 0.3) return { lo: 0.25, ticks: [0.25, 0.5, 0.75, 1] }
  return { lo: 0, ticks: [0, 0.25, 0.5, 0.75, 1] }
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/** Path segments for the days that have data; a day without answers breaks the line instead of joining across it. */
function segments(points: SeriesPoint[], xAt: (i: number) => number, yAt: (v: number) => number): { path: string; single: boolean }[] {
  const out: { path: string; single: boolean }[] = []
  let run: SeriesPoint[] = []
  const flush = () => {
    if (run.length > 0) {
      const d = run.map((p, k) => `${k === 0 ? 'M' : 'L'}${xAt(points.indexOf(p)).toFixed(1)} ${yAt(p.accuracy!).toFixed(1)}`).join(' ')
      out.push({ path: d, single: run.length === 1 })
    }
    run = []
  }
  for (const p of points) {
    if (p.accuracy === null) flush()
    else run.push(p)
  }
  flush()
  return out
}

export function TrendChart({ thisWeek, lastWeek }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const [width, setWidth] = useState(640)
  // The chart only exists once there is data, so watch whichever element is on screen (a plain ref would miss it).
  const [wrap, setWrap] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!wrap) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(MIN_W, Math.round(entry.contentRect.width))))
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [wrap])
  const W = width
  const H = W < 480 ? 250 : 290
  const padR = W < 480 ? 62 : 84 // room beside the plot for the pass-mark label
  const plotW = W - PAD_L - padR
  const plotH = H - PAD_T - PAD_B
  const band = plotW / 7
  const xAt = (i: number) => PAD_L + band * (i + 0.5)
  const { lo, ticks } = domainFor([...thisWeek, ...lastWeek])
  const yAt = (v: number) => PAD_T + plotH * (1 - (v - lo) / (1 - lo))
  const empty = [...thisWeek, ...lastWeek].every((p) => p.questions === 0)
  const lastPoint = [...thisWeek].reverse().find((p) => p.accuracy !== null)
  const lastIndex = lastPoint ? thisWeek.indexOf(lastPoint) : -1

  return (
    <section className="d-card d-trend" aria-labelledby="d-trend-title">
      <h2 id="d-trend-title" className="d-card-title">This week and last week</h2>
      <p className="d-note">Accuracy for each day you answered questions.</p>

      {empty ? (
        <p className="d-empty">Finish a session and your daily accuracy will be drawn here, this week against last week.</p>
      ) : (
        <div className="d-chart-wrap" ref={setWrap}>
          <svg className="d-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart of daily accuracy, this week and last week. A table with the same numbers follows.">
            {ticks.map((t) => (
              <g key={t}>
                <line className="d-grid" x1={PAD_L} x2={W - padR} y1={yAt(t)} y2={yAt(t)} />
                <text className="d-axis" x={PAD_L - 8} y={yAt(t) + 4} textAnchor="end">{pct(t)}</text>
              </g>
            ))}
            <line className="d-pass" x1={PAD_L} x2={W - padR} y1={yAt(PASS)} y2={yAt(PASS)} />
            <text className="d-pass-label" x={W - padR + 8} y={yAt(PASS) - 1}>80%</text>
            <text className="d-pass-label" x={W - padR + 8} y={yAt(PASS) + 11}>to pass</text>
            {thisWeek.map((p, i) => (
              <text key={p.date} className="d-axis" x={xAt(i)} y={H - 12} textAnchor="middle">{p.label}</text>
            ))}

            {active !== null && <line className="d-cross" x1={xAt(active)} x2={xAt(active)} y1={PAD_T} y2={PAD_T + plotH} />}

            {segments(lastWeek, xAt, yAt).map((s, i) => (
              <path key={`l${i}`} className="d-line last" d={s.path} />
            ))}
            {lastWeek.map((p, i) => p.accuracy !== null && <circle key={p.date} className="d-dot last" cx={xAt(i)} cy={yAt(p.accuracy)} r={4} />)}

            {segments(thisWeek, xAt, yAt).map((s, i) => (
              <path key={`t${i}`} className="d-line this" d={s.path} />
            ))}
            {thisWeek.map((p, i) => p.accuracy !== null && <circle key={p.date} className="d-dot this" cx={xAt(i)} cy={yAt(p.accuracy)} r={4.5} />)}
            {lastPoint && (
              <text className="d-end-label" x={xAt(lastIndex)} y={yAt(lastPoint.accuracy!) - 13} textAnchor="middle">{pct(lastPoint.accuracy!)}</text>
            )}

            {thisWeek.map((p, i) => (
              <rect
                key={p.date}
                className="d-hit"
                x={PAD_L + band * i}
                y={PAD_T}
                width={band}
                height={plotH}
                tabIndex={0}
                role="img"
                aria-label={`${p.label}: this week ${p.accuracy === null ? 'no questions' : `${pct(p.accuracy)} from ${p.questions} questions`}; last week ${lastWeek[i].accuracy === null ? 'no questions' : `${pct(lastWeek[i].accuracy!)} from ${lastWeek[i].questions} questions`}`}
                onPointerEnter={() => setActive(i)}
                onPointerMove={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            ))}
          </svg>

          {active !== null && (
            <div className="d-tip" style={{ left: `${Math.min(80, Math.max(20, (xAt(active) / W) * 100))}%` }} role="status">
              <p className="d-tip-day">{thisWeek[active].label}</p>
              <p className="d-tip-row"><span className="d-key-line this" />{thisWeek[active].accuracy === null ? 'This week: no questions' : <><strong>{pct(thisWeek[active].accuracy!)}</strong> this week · {thisWeek[active].questions} questions</>}</p>
              <p className="d-tip-row"><span className="d-key-line last" />{lastWeek[active].accuracy === null ? 'Last week: no questions' : <><strong>{pct(lastWeek[active].accuracy!)}</strong> last week · {lastWeek[active].questions} questions</>}</p>
            </div>
          )}
        </div>
      )}

      <ul className="d-legend" aria-label="Legend">
        <li><span className="d-key-line this" /> This week</li>
        <li><span className="d-key-line last" /> Last week</li>
      </ul>
      {!empty && lo > 0 && <p className="d-note">The vertical axis starts at {pct(lo)}.</p>}

      <details className="d-table-twin">
        <summary>Show the numbers as a table</summary>
        <table>
          <thead><tr><th scope="col">Day</th><th scope="col">This week</th><th scope="col">Last week</th></tr></thead>
          <tbody>
            {thisWeek.map((p, i) => (
              <tr key={p.date}>
                <th scope="row">{p.label}</th>
                <td>{p.accuracy === null ? 'no questions' : `${pct(p.accuracy)} (${p.questions})`}</td>
                <td>{lastWeek[i].accuracy === null ? 'no questions' : `${pct(lastWeek[i].accuracy!)} (${lastWeek[i].questions})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
