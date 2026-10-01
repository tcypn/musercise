import { useState } from 'react'
import type { ExerciseProgress } from '../../api/types'
import { radarData, type RadarAxis } from '../../theory/dashboard'
import { EXERCISE_LIST } from '../../theory/exercises'
import type { ExerciseId } from '../../theory/types'

interface Props {
  exercises: Record<ExerciseId, ExerciseProgress>
}

const SIZE = 380
const C = SIZE / 2
const R = 118
const RINGS = [0.25, 0.5, 0.75, 1]
const PASS = 0.8

const pct = (v: number) => `${Math.round(v * 100)}%`
const polar = (i: number, n: number, radius: number) => {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle), cos: Math.cos(angle), sin: Math.sin(angle) }
}

function readout(a: RadarAxis | undefined): string {
  if (!a) return 'Point at or tab to a point to read its value.'
  return a.accuracy === null ? `${a.name}: not heard yet` : `${a.name}: ${pct(a.accuracy)} right, from ${a.asked} ${a.asked === 1 ? 'answer' : 'answers'}`
}

export function EarRadar({ exercises }: Props) {
  const [exerciseId, setExerciseId] = useState<ExerciseId>('intervals')
  const [view, setView] = useState<'shape' | 'bars'>('shape')
  const [focus, setFocus] = useState<number | null>(null)
  const def = EXERCISE_LIST.find((e) => e.id === exerciseId)!
  const axes = radarData(exercises[exerciseId], def.items)
  const n = axes.length
  const total = axes.reduce((sum, a) => sum + a.asked, 0)
  const known = axes.map((a, i) => (a.accuracy === null ? null : { i, ...polar(i, n, R * a.accuracy) })).filter((p) => p !== null)
  // Answers never heard are left out of the shape (their labels turn grey) rather than drawn as zero.
  const shape = known.length > 0 ? known.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + (known.length > 2 ? 'Z' : '') : ''

  return (
    <section className="d-card d-radar" aria-labelledby="d-radar-title">
      <div className="d-cal-head">
        <h2 id="d-radar-title" className="d-card-title">Your ear, answer by answer</h2>
      </div>
      <div className="d-toggles">
        <select className="d-select" aria-label="Lesson" value={exerciseId} onChange={(e) => { setExerciseId(e.target.value as ExerciseId); setFocus(null) }}>
          {EXERCISE_LIST.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <div className="d-seg" role="group" aria-label="View">
          <button aria-pressed={view === 'shape'} onClick={() => setView('shape')}>Shape</button>
          <button aria-pressed={view === 'bars'} onClick={() => setView('bars')}>Bars</button>
        </div>
      </div>

      {total === 0 ? (
        <p className="d-empty">Answer a few {def.name.toLowerCase()} questions and your strengths and blind spots will show up here.</p>
      ) : view === 'shape' ? (
        <>
          <svg className="d-chart radar" viewBox={`-40 0 ${SIZE + 80} ${SIZE}`} role="img" aria-label={`Radar chart of your accuracy for each ${def.name.toLowerCase()} answer. A table with the same numbers follows.`}>
            {RINGS.map((r) => (
              <polygon key={r} className="d-grid" fill="none" points={axes.map((_, i) => { const p = polar(i, n, R * r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')} />
            ))}
            <polygon className="d-pass-ring" fill="none" points={axes.map((_, i) => { const p = polar(i, n, R * PASS); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')} />
            {axes.map((_, i) => { const p = polar(i, n, R); return <line key={i} className="d-grid" x1={C} y1={C} x2={p.x} y2={p.y} /> })}
            <text className="d-pass-label" x={C + 5} y={C - R * PASS - 4}>80%</text>

            <path className="d-shape" d={shape} />
            {known.map((p) => (
              <circle key={axes[p.i].id} className="d-dot this" cx={p.x} cy={p.y} r={4.5} />
            ))}
            {axes.map((a, i) => {
              const l = polar(i, n, R + 20)
              const anchor = l.cos > 0.3 ? 'start' : l.cos < -0.3 ? 'end' : 'middle'
              const dy = l.sin > 0.5 ? 12 : l.sin < -0.5 ? 0 : 4
              return (
                <text key={a.id} className={`d-axis ${a.accuracy === null ? 'muted' : ''}`} x={l.x} y={l.y + dy} textAnchor={anchor}>{a.short}</text>
              )
            })}
            {axes.map((a, i) => {
              const p = polar(i, n, R)
              return (
                <circle
                  key={`hit-${a.id}`}
                  className="d-hit-dot"
                  cx={p.x}
                  cy={p.y}
                  r={16}
                  tabIndex={0}
                  role="img"
                  aria-label={readout(a)}
                  onPointerEnter={() => setFocus(i)}
                  onPointerLeave={() => setFocus(null)}
                  onFocus={() => setFocus(i)}
                  onBlur={() => setFocus(null)}
                />
              )
            })}
          </svg>
          <p className="d-readout" aria-live="polite">{readout(focus === null ? undefined : axes[focus])}</p>
          {known.length < axes.length && <p className="d-note center">Grey labels are answers you have not heard yet.</p>}
        </>
      ) : (
        <ul className="d-bars">
          {axes.map((a) => (
            <li key={a.id}>
              <span className="d-bar-label">{a.short}</span>
              <span className="d-bar-track" aria-hidden="true">
                <span className="d-bar-fill" style={{ width: a.accuracy === null ? 0 : `${a.accuracy * 100}%` }} />
                <span className="d-bar-pass" />
              </span>
              <span className="d-bar-value">{a.accuracy === null ? 'not yet' : `${pct(a.accuracy)}`}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="d-table-twin">
        <summary>Show the numbers as a table</summary>
        <table>
          <thead><tr><th scope="col">Answer</th><th scope="col">Right</th><th scope="col">Heard</th></tr></thead>
          <tbody>
            {axes.map((a) => (
              <tr key={a.id}>
                <th scope="row">{a.short} {a.name}</th>
                <td>{a.accuracy === null ? 'not heard yet' : pct(a.accuracy)}</td>
                <td>{a.asked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
