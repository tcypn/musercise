import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { loadPiano, playNotes, playSequence, prepareAudio, stopSound } from '../audio/piano'
import { Keyboard } from '../components/Keyboard'
import { deleteSong, saveSong, useSongs, type Song as SongData } from '../store/songs'
import { chartChords, chordLabel, CHORD_TYPES, guessKey, nashvilleLabel, noteNameIn, parseChart, romanLabel, transposeChart, type Chart, type ChordSym } from '../theory/chart'
import { BACKINGS, scheduleBars, type Backing, type SlotIn } from '../theory/playAlong'
import { zoneVoicing } from '../theory/voicing'

const KEY_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
type Labels = 'chords' | 'numbers' | 'roman'

/** The chart's chords as play-along slots: names in the key, notes, and the chord-zone voicing. */
function slotsOf(chart: Chart, keyPc: number): SlotIn[][] {
  return chart.sections.flatMap((sec) => sec.bars.map((bar) => bar.chords.map((c) => {
    const v = zoneVoicing(c)
    const pcs = [...new Set([...CHORD_TYPES[c.type].stack.map((s) => (c.rootPc + s) % 12), ...(c.bassPc === undefined ? [] : [c.bassPc])])]
    return { name: chordLabel(c, keyPc), rootPc: c.rootPc, pcs, voiced: { bass: v.left, upper: v.right } }
  })))
}

/** One song: its chart in any key, each chord's voicing, and ways to hear and play it. */
export function Song() {
  const { id } = useParams()
  const songs = useSongs()
  const song = songs.find((s) => s.id === id)
  const location = useLocation()
  const [editing, setEditing] = useState(() => !!(location.state as { edit?: boolean } | null)?.edit)
  if (!song) return <Navigate to="/songs" replace />
  return editing ? <SongEditor song={song} onDone={() => setEditing(false)} /> : <SongView song={song} onEdit={() => setEditing(true)} />
}

function SongEditor({ song, onDone }: { song: SongData; onDone: () => void }) {
  const [title, setTitle] = useState(song.title)
  const [chart, setChart] = useState(song.chart)
  const navigate = useNavigate()
  const parsed = parseChart(chart)
  return (
    <section className="practice songs-page">
      <h1>Edit song</h1>
      <div className="form song-form">
        <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>
          Chords
          <textarea className="song-chart-input" rows={8} value={chart} onChange={(e) => setChart(e.target.value)} placeholder={'[Verse] C G/B | Am F | C G | F\n[Chorus] F | G | Am | F'} spellCheck={false} autoCapitalize="off" />
        </label>
        <p className="quiet">One section per line, with its name in [brackets]. A bar line | between bars, a space between chords in one bar (they share its beats). % repeats the bar before. Chords: C, Cm, C7, Cmaj7, Cm7, Cdim, Caug, Csus2, Csus4, C6, Cm6, Cadd9, C9, Cmaj9, Cm9, Cm7b5, Cdim7, and slashes like G/B.</p>
        {parsed.errors.length > 0 && (
          <ul className="song-errors" role="alert">
            {parsed.errors.map((e, i) => <li key={i}>Line {e.line}, “{e.token}”: {e.message}</li>)}
          </ul>
        )}
      </div>
      <div className="songs-actions">
        <button className="button primary" onClick={() => { saveSong({ ...song, title: title.trim() || 'Untitled', chart }); onDone() }}>Save</button>
        <button className="button" onClick={onDone}>Cancel</button>
        <button className="button danger" onClick={() => { if (confirm(`Delete “${song.title}”?`)) { deleteSong(song.id); navigate('/songs') } }}>Delete</button>
      </div>
    </section>
  )
}

function SongView({ song, onEdit }: { song: SongData; onEdit: () => void }) {
  const navigate = useNavigate()
  const [labels, setLabels] = useState<Labels>('chords')
  /** The chord tapped, by its place in the song (so it stays picked when the key changes). */
  const [pickedAt, setPickedAt] = useState<number | null>(null)
  const [backing, setBacking] = useState<Backing>('basic')
  const [bpm, setBpm] = useState(80)
  const [nowPlaying, setNowPlaying] = useState<number | null>(null)
  useEffect(() => () => stopSound(), [])

  const written = parseChart(song.chart)
  const guessed = guessKey(chartChords(written))
  const baseKey = song.key ?? guessed
  const key = (baseKey + song.transpose + 120) % 12
  const chart = transposeChart(written, song.transpose)
  const label = (c: ChordSym) => (labels === 'chords' ? chordLabel(c, key) : labels === 'numbers' ? nashvilleLabel(c, key) : romanLabel(c, key))
  const keyName = (pc: number) => `${chordLabel({ rootPc: pc, type: 'maj', text: '' }, pc)} major`
  const update = (patch: Partial<SongData>) => saveSong({ ...song, ...patch })
  const flat = chartChords(chart)
  const picked = pickedAt === null ? null : flat[pickedAt] ?? null
  const voicing = picked ? zoneVoicing(picked) : null
  const name = (m: number) => noteNameIn(m % 12, key)

  const pick = (c: ChordSym, at: number) => {
    prepareAudio()
    setPickedAt(at)
    const v = zoneVoicing(c)
    void playNotes([v.left, ...v.right], { gap: 0, hold: 1.8 }).catch(() => {})
  }
  async function hear() {
    prepareAudio()
    await loadPiano()
    const plan = scheduleBars(slotsOf(chart, key), bpm, backing, 1)
    const handle = await playSequence(plan.events, (i) => setNowPlaying(i === null ? null : plan.barOf[i]))
    await handle.done
    setNowPlaying(null)
  }

  // Each chord's place in the song, in order, for highlighting.
  const places = chart.sections.map((sec, si) => sec.bars.map((bar, bi) => bar.chords.map((_, ci) => chart.sections.slice(0, si).reduce((n, x) => n + x.bars.reduce((m, b) => m + b.chords.length, 0), 0) + sec.bars.slice(0, bi).reduce((m, b) => m + b.chords.length, 0) + ci)))
  return (
    <section className="practice songs-page">
      <p><Link to="/songs">← My songs</Link></p>
      <div className="song-head">
        <h1>{song.title}</h1>
        <button className="button" onClick={onEdit}>Edit</button>
      </div>
      {written.errors.length > 0 && <p className="notice warn">{written.errors.length} chord{written.errors.length === 1 ? '' : 's'} could not be read and {written.errors.length === 1 ? 'is' : 'are'} left out. <button className="linkish" onClick={onEdit}>Edit</button></p>}
      {chartChords(chart).length === 0 ? <p className="quiet">No chords yet. <button className="linkish" onClick={onEdit}>Add them</button></p> : (
        <>
          <div className="song-tools">
            <label>Written in <select value={baseKey} onChange={(e) => update({ key: Number(e.target.value) })}>{KEY_PCS.map((pc) => <option key={pc} value={pc}>{keyName(pc)}{pc === guessed && song.key === null ? ' (guessed)' : ''}</option>)}</select></label>
            <span className="song-transpose">
              <button className="button" aria-label="Down a half step" onClick={() => update({ transpose: song.transpose - 1 })}>−</button>
              <span>{song.transpose === 0 ? 'Original key' : `Now in ${keyName(key)} (${song.transpose > 0 ? '+' : ''}${song.transpose})`}</span>
              <button className="button" aria-label="Up a half step" onClick={() => update({ transpose: song.transpose + 1 })}>+</button>
            </span>
            <span className="song-labels" role="group" aria-label="Show chords as">
              {(['chords', 'numbers', 'roman'] as const).map((l) => <button key={l} className={labels === l ? 'chip-btn on' : 'chip-btn'} onClick={() => setLabels(l)}>{l === 'chords' ? 'Chords' : l === 'numbers' ? '1 4 5' : 'I IV V'}</button>)}
            </span>
          </div>
          {chart.sections.map((sec, si) => (
            <div key={si} className="song-section">
              <p className="song-section-label">{sec.label}</p>
              <ol className="song-bars">
                {sec.bars.map((bar, bi) => (
                  <li key={bi} className="song-bar">
                    {bar.chords.map((c, ci) => {
                      const here = places[si][bi][ci]
                      return <button key={ci} className={['song-chord', pickedAt === here ? 'on' : '', nowPlaying === here ? 'playing' : ''].filter(Boolean).join(' ')} onClick={() => pick(c, here)}>{label(c)}</button>
                    })}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <div className="song-voicing">
            <Keyboard view={[36, 71]} lit={voicing ? [{ midi: voicing.left, role: 'first' as const }, ...voicing.right.map((m) => ({ midi: m, role: 'second' as const }))] : []} />
            <p className="quiet">{picked && voicing ? <><strong>{chordLabel(picked, key)}</strong>: right hand {voicing.right.map(name).join(' ')} ({voicing.inversion}), left hand {name(voicing.left)}. The right hand stays between the F below middle C and the F above it.</> : 'Tap a chord to see and hear how to play it: right hand in the chord zone (F to F around middle C), left hand on the bass.'}</p>
          </div>
          <div className="song-play">
            <label>Style <select value={backing} onChange={(e) => setBacking(e.target.value as Backing)}>{BACKINGS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label>Tempo: {bpm} bpm <input type="range" min={50} max={140} step={2} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} /></label>
            <div className="songs-actions">
              <button className="button" onClick={() => void hear()}>Hear it</button>
              {nowPlaying !== null && <button className="button" onClick={() => stopSound()}>Stop</button>}
              <button className="button primary" onClick={() => navigate('/play-along', { state: { song: { id: song.id, title: song.title, bars: slotsOf(chart, key) } } })}>Play along</button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
