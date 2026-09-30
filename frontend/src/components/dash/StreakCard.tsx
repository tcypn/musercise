import type { Streak, StripDay } from '../../theory/dashboard'
import { weekStart } from '../../theory/dashboard'
import { Flame, Moon } from './Icons'

interface Props {
  streak: Streak
  strip: StripDay[]
  today: string
}

const STATE_WORD: Record<StripDay['state'], string> = {
  practised: 'practised',
  rest: 'rest day',
  missed: 'not practised',
  today: 'today, still to do',
  future: 'ahead',
}

function note(streak: Streak): string {
  if (streak.count === 0) return streak.status === 'done' ? 'Practised today.' : 'Practise today to start a streak.'
  if (streak.status === 'done') return 'Practised today. See you tomorrow.'
  if (streak.status === 'at-risk') return `Yesterday was your rest day. Practise today to keep your ${streak.count}-day streak.`
  return `Practise today to reach ${streak.count + 1}!`
}

export function StreakCard({ streak, strip, today }: Props) {
  const restThisWeek = streak.restDays.some((d) => weekStart(d) === weekStart(today))
  return (
    <section className="d-card d-streak" aria-labelledby="d-streak-title">
      <h2 id="d-streak-title" className="d-card-title">Day streak</h2>
      <p className="d-hero-row">
        <Flame size={44} className={streak.count === 0 ? 'd-flame off' : 'd-flame'} />
        <span className="d-hero-num">{streak.count}</span>
        <span className="d-unit">{streak.count === 1 ? 'day' : 'days'}</span>
      </p>
      <p className="d-note">{note(streak)}</p>
      <ol className="d-strip" aria-label="This week">
        {strip.map((d) => (
          <li key={d.date} className={`d-strip-day ${d.state}`}>
            <span className="d-strip-label">{d.label.slice(0, 1)}</span>
            <span className="d-strip-dot">
              {d.state === 'practised' && <Flame size={22} />}
              {d.state === 'rest' && <Moon size={20} />}
            </span>
            <span className="visually-hidden">{d.label}: {STATE_WORD[d.state]}</span>
          </li>
        ))}
      </ol>
      {streak.count > 0 && (
        <p className="d-rest-note">
          <Moon size={16} /> {restThisWeek ? 'Rest day used this week' : 'One free rest day this week'}
        </p>
      )}
    </section>
  )
}
