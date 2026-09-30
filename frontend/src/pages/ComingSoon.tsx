import { Link, Navigate, useParams } from 'react-router-dom'
import { getConcept, KIND_LABEL, stageOf } from '../theory/curriculum'

export function ComingSoon() {
  const { concept: id } = useParams()
  const concept = getConcept(id)
  if (!concept) return <Navigate to="/" replace />
  if (concept.exerciseId) return <Navigate to={`/learn/${concept.exerciseId}`} replace />
  const stage = stageOf(concept.id)
  const before = (concept.before ?? []).map(getConcept).filter((c) => c !== undefined)

  return (
    <section className="practice">
      <Link className="back" to="/">← Map</Link>
      <p className="level-tag">Stage {stage?.id}: {stage?.name}</p>
      <h1>{concept.name}</h1>
      <p className="soon-tag">
        <span className="badge soon">Coming soon</span> {KIND_LABEL[concept.kind]}
        {concept.later ? ' · better left until the basics are solid' : ''}
      </p>
      <p className="lede">{concept.blurb}</p>

      <h2>Why it matters</h2>
      <p className="prose">{concept.why}</p>

      {before.length > 0 && (
        <>
          <h2>Learn these first</h2>
          <ul className="anchors">
            {before.map((c) => (
              <li key={c.id}>
                <Link to={c.exerciseId ? `/learn/${c.exerciseId}` : `/soon/${c.id}`}>{c.name}</Link>{' '}
                <span className="quiet">· {c.exerciseId ? 'ready to practise' : 'coming soon'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="quiet">This lesson is not built yet. Until it is, the lessons above are the best way to get ready for it.</p>
    </section>
  )
}
