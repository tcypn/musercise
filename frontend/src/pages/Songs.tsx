import { Link, useNavigate } from 'react-router-dom'
import { EXAMPLE_CHART, newSong, useSongs } from '../store/songs'
import { chartChords, guessKey, noteNameIn, parseChart } from '../theory/chart'

/** My songs: the learner's own chord charts, kept on this device. */
export function Songs() {
  const songs = useSongs()
  const navigate = useNavigate()
  const create = (title?: string, chart?: string) => {
    const song = newSong(title, chart)
    navigate(`/songs/${song.id}`, { state: { edit: !chart } })
  }
  return (
    <section className="practice songs-page">
      <p><Link to="/piano">← Piano</Link></p>
      <h1>My songs</h1>
      <p className="lede">Type the chords of a song you sing. Move it to your key, see how to voice each chord, and play along with it.</p>
      <div className="songs-actions">
        <button className="button primary" onClick={() => create()}>New song</button>
        {songs.length === 0 && <button className="button" onClick={() => create('Example', EXAMPLE_CHART)}>Try an example</button>}
      </div>
      {songs.length === 0 ? <p className="quiet">No songs yet. Songs are kept in this browser only.</p> : (
        <ul className="songs-list">
          {songs.map((s) => {
            const chart = parseChart(s.chart)
            const chords = chartChords(chart)
            const key = ((s.key ?? guessKey(chords)) + s.transpose + 12) % 12
            const bars = chart.sections.reduce((n, sec) => n + sec.bars.length, 0)
            return (
              <li key={s.id}>
                <Link to={`/songs/${s.id}`} className="song-card">
                  <strong>{s.title || 'Untitled'}</strong>
                  <span className="quiet">{chords.length ? `${noteNameIn(key, key)} major · ${bars} bar${bars === 1 ? '' : 's'}` : 'No chords yet'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
