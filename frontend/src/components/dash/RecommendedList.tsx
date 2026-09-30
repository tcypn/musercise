import { Link } from 'react-router-dom'
import type { Recommendation } from '../../theory/dashboard'
import { Clock, Steps, Target } from './Icons'

const ICON = { weak: Target, next: Steps, stale: Clock } as const
const KIND_WORD = { weak: 'Weak spot', next: 'Next level', stale: 'Left alone a while' } as const

export function RecommendedList({ items }: { items: Recommendation[] }) {
  return (
    <section className="d-card d-recs" aria-labelledby="d-recs-title">
      <h2 id="d-recs-title" className="d-card-title">Recommended today</h2>
      {items.length === 0 ? (
        <p className="d-note">You have finished every level. Practise any level to keep your ear sharp.</p>
      ) : (
        <ul className="d-rec-list">
          {items.map((r) => {
            const Icon = ICON[r.kind]
            return (
              <li key={r.to} className="d-rec">
                <span className={`d-rec-icon ${r.kind}`}><Icon size={22} /></span>
                <span className="d-rec-text">
                  <span className="d-rec-kind">{KIND_WORD[r.kind]}</span>
                  <span className="d-rec-title">{r.title}</span>
                  <span className="d-rec-reason">{r.reason}</span>
                </span>
                <Link className="d-btn" to={r.to} aria-label={`Start: ${r.title}`}>Start</Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
