import { useState } from 'react'
import { addDays, monthGrid, type CalendarCell } from '../../theory/dashboard'
import { Chevron } from './Icons'

interface Props {
  days: string[]
  restDays: string[]
  today: string
}

const HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATE_WORD: Record<CalendarCell['state'], string> = { practised: 'practised', rest: 'rest day', today: 'today', future: 'ahead', missed: 'not practised', none: 'not practised' }

const monthOf = (date: string) => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) })
const before = (a: { year: number; month: number }, b: { year: number; month: number }) => a.year * 12 + a.month < b.year * 12 + b.month

export function MonthCalendar({ days, restDays, today }: Props) {
  const current = monthOf(today)
  const earliest = monthOf(addDays(today, -120))
  const [view, setView] = useState(current)
  const grid = monthGrid(days, restDays, view.year, view.month, today)
  const step = (delta: number) => {
    const index = view.year * 12 + (view.month - 1) + delta
    setView({ year: Math.floor(index / 12), month: (index % 12) + 1 })
  }
  const title = new Date(view.year, view.month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const count = grid.flat().filter((c) => c.inMonth && c.state === 'practised').length

  return (
    <section className="d-card d-cal" aria-labelledby="d-cal-title">
      <div className="d-cal-head">
        <h2 id="d-cal-title" className="d-card-title">{title}</h2>
        <div className="d-cal-nav">
          <button className="d-icon-btn" onClick={() => step(-1)} disabled={!before(earliest, view)} aria-label="Previous month"><Chevron direction="left" size={18} /></button>
          <button className="d-icon-btn" onClick={() => step(1)} disabled={!before(view, current)} aria-label="Next month"><Chevron size={18} /></button>
        </div>
      </div>
      <p className="d-note">{count} {count === 1 ? 'day' : 'days'} practised this month</p>
      <table className="d-cal-grid">
        <thead>
          <tr>{HEAD.map((h) => <th key={h} scope="col"><span aria-hidden="true">{h.slice(0, 1)}</span><span className="visually-hidden">{h}</span></th>)}</tr>
        </thead>
        <tbody>
          {grid.map((week) => (
            <tr key={week[0].date}>
              {week.map((cell) => (
                <td key={cell.date} className={`${cell.inMonth ? '' : 'outside'} ${cell.state} ${cell.date === today ? 'is-today' : ''}`}>
                  <span
                    className="d-cal-day"
                    aria-label={`${new Date(`${cell.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}: ${STATE_WORD[cell.state]}`}
                  >
                    {Number(cell.date.slice(8))}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="d-legend" aria-label="Legend">
        <li><span className="d-swatch practised" /> Practised</li>
        <li><span className="d-swatch rest" /> Rest day</li>
        <li><span className="d-swatch today" /> Today</li>
      </ul>
    </section>
  )
}
