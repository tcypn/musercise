import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Keyboard } from '../Keyboard'
import { midi, type MidiState } from '../../store/midi'
import { nameChord } from '../../theory/chordName'

/** Wide enough for two hands on a computer; three octaves on a phone, so the keys can be tapped. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 700)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}

/**
 * Play lessons answer with notes: keys held on a connected piano light gold, keys tapped here light green,
 * and what is held is named as you go.
 */
export function PlayAnswer({ piano, tapped, onTap, onClear, onCheck, result }: {
  piano: MidiState
  tapped: readonly number[]
  onTap: (midi: number) => void
  onClear: () => void
  /** "Your turn": its own Check button, and what it said. */
  onCheck?: () => void
  result?: ReactNode
}) {
  const narrow = useNarrow()
  useEffect(() => midi.resume(), [])
  const notes = [...new Set([...piano.held, ...tapped])]
  const reading = nameChord(notes)
  const lit = [...piano.held.map((m) => ({ midi: m, role: 'first' as const })), ...tapped.filter((m) => !piano.held.includes(m)).map((m) => ({ midi: m, role: 'second' as const }))]
  return (
    <div className="play-answer">
      <p className="play-reading" aria-live="polite">
        {reading.symbol ? <>You are playing <strong>{reading.symbol}</strong> <span className="quiet">{reading.notes.join(' ')}</span></> : 'Play the notes on your piano, or tap the keys.'}
      </p>
      <Keyboard lit={lit} onTap={onTap} view={narrow ? [48, 83] : [36, 95]} />
      <div className="play-tools">
        <span className="quiet">{piano.status === 'connected' ? `Piano connected: it checks itself when you play it right.` : <>No piano connected. <Link to="/piano">Connect one</Link> or tap the keys.</>}</span>
        <span className="play-buttons">
          <button type="button" className="button" onClick={onClear} disabled={tapped.length === 0}>Clear</button>
          {onCheck && <button type="button" className="button primary" onClick={onCheck} disabled={notes.length === 0}>Check</button>}
        </span>
      </div>
      {result && <p className="play-result" role="status">{result}</p>}
    </div>
  )
}
