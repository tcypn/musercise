import { Link } from 'react-router-dom'
import { getItem } from '../../theory/exercises'
import { MISTAKE_QUESTIONS, type WeakSpot } from '../../theory/mistakes'
import { Target } from './Icons'

/** Lessons with answers you often get wrong, each with a short practice session on exactly those. */
export function MistakesCard({ spots }: { spots: WeakSpot[] }) {
  if (spots.length === 0) return null
  return (
    <section className="d-card d-mistakes" aria-labelledby="d-mistakes-title">
      <h2 id="d-mistakes-title" className="d-card-title">Practise your mistakes</h2>
      <p className="d-note">{MISTAKE_QUESTIONS} questions on only the answers you mix up. Your level progress is not affected.</p>
      <ul className="d-rec-list">
        {spots.slice(0, 3).map((s) => (
          <li key={s.exercise.id} className="d-rec">
            <span className="d-rec-icon weak"><Target size={22} /></span>
            <span className="d-rec-text">
              <span className="d-rec-title">{s.exercise.name}</span>
              <span className="d-rec-reason">
                {s.weak.map((w) => `${getItem(s.exercise, w.item).short} (${Math.round((w.correct / w.asked) * 100)}%)`).join(', ')}
              </span>
            </span>
            <Link className="d-btn" to={`/mistakes/${s.exercise.id}`} aria-label={`Practise your mistakes in ${s.exercise.name}`}>Start</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
