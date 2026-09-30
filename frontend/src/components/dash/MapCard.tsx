import { Link } from 'react-router-dom'
import type { MapSummary } from '../../theory/mapProgress'

export function MapCard({ map }: { map: MapSummary }) {
  const percent = Math.round(map.percent * 100)
  return (
    <section className="d-card d-map" aria-labelledby="d-map-title">
      <h2 id="d-map-title" className="d-card-title">Your route</h2>
      <p className="d-hero-row small">
        <span className="d-hero-num">{map.openCount}</span>
        <span className="d-unit">of {map.conceptCount} lessons ready</span>
      </p>
      <div className="d-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Share of the whole map completed">
        <span style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }} />
      </div>
      <p className="d-note">{map.masteredCount} mastered · {percent}% of the map</p>
      <ol className="d-stages" aria-label="Stages">
        {map.stages.map(({ stage, statuses, open, mastered }) => (
          <li key={stage.id}>
            <span className="d-stage-name">{stage.name}</span>
            <span className="d-stage-count">{open === 0 ? 'coming soon' : `${open} of ${statuses.length} ready${mastered > 0 ? `, ${mastered} mastered` : ''}`}</span>
            <span className="d-stage-meter" aria-hidden="true"><span style={{ width: `${(open / statuses.length) * 100}%` }} /></span>
          </li>
        ))}
      </ol>
      <Link className="d-btn" to="/map">Open the map</Link>
    </section>
  )
}
