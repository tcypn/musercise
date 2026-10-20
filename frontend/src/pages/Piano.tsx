import { useEffect, useState } from 'react'
import { loadPiano, playNotes, prepareAudio } from '../audio/piano'
import { Keyboard } from '../components/Keyboard'
import { midi, useMidi, type MidiState } from '../store/midi'
import { readJson, writeJson } from '../store/storage'
import { nameChord } from '../theory/chordName'
import { keyLabel } from '../theory/harmony'

const KEY_STORE = 'musercise.piano-key'
/** The twelve major keys in the order of the circle of fifths. */
const KEY_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]

function status(m: MidiState): string {
  switch (m.status) {
    case 'unsupported': return 'This browser can\'t connect to a piano. Use Chrome or Edge on a Mac or PC, or tap the keys below.'
    case 'off': return 'Connect a digital piano with a USB cable (its USB to Host port) to see what you play.'
    case 'asking': return 'Allow "use MIDI devices" when the browser asks.'
    case 'denied': return 'The browser did not allow MIDI. Allow it in the site settings (the icon left of the address), then try again.'
    case 'waiting': return 'No piano found. Connect it with a USB cable (USB to Host port) and turn it on.'
    case 'connected': return `Connected: ${m.names.join(', ')}`
  }
}

/** Free play: the keys you press (on a connected piano, or tapped here) light up, and the chord is named. */
export function Piano() {
  const m = useMidi()
  const [tapped, setTapped] = useState<number[]>([])
  const [keyPc, setKeyPc] = useState<number | null>(() => readJson<number | null>(KEY_STORE, null))
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)

  useEffect(() => {
    midi.resume()
    loadPiano()
    const onResize = () => setNarrow(window.innerWidth < 700)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const notes = [...new Set([...m.held, ...tapped])].sort((a, b) => a - b)
  const reading = nameChord(notes, keyPc)
  const lit = [...m.held.map((n) => ({ midi: n, role: 'first' as const })), ...tapped.filter((n) => !m.held.includes(n)).map((n) => ({ midi: n, role: 'second' as const }))]

  const tap = (n: number) => {
    prepareAudio()
    if (tapped.includes(n)) setTapped(tapped.filter((x) => x !== n))
    else {
      setTapped([...tapped, n])
      void playNotes([n], { gap: 0, hold: 1.2 })
    }
  }
  const chooseKey = (value: string) => {
    const pc = value === '' ? null : Number(value)
    setKeyPc(pc)
    writeJson(KEY_STORE, pc)
  }

  return (
    <section className="practice piano-page">
      <h1>Piano</h1>
      <div className="piano-connect">
        <p className={m.status === 'connected' ? 'piano-status on' : 'piano-status'} role="status">{status(m)}</p>
        {(m.status === 'off' || m.status === 'denied') && <button className="button primary" onClick={() => void midi.connect()}>Connect piano</button>}
        {(m.status === 'connected' || m.status === 'waiting') && <button className="button" onClick={() => midi.disconnect()}>Disconnect</button>}
      </div>

      <div className="piano-reading" aria-live="polite">
        <p className="piano-symbol">{reading.symbol || 'Play or tap some keys'}</p>
        <p className="piano-detail">{[reading.detail, reading.numeral].filter(Boolean).join(' · ')}</p>
        {reading.notes.length > 0 && <p className="piano-notes quiet">{reading.notes.join(' ')}</p>}
      </div>

      <div className="piano-keys">
        <Keyboard lit={lit} onTap={tap} view={narrow ? [48, 83] : [36, 95]} />
      </div>

      <div className="piano-tools">
        <label>
          Key{' '}
          <select value={keyPc ?? ''} onChange={(e) => chooseKey(e.target.value)}>
            <option value="">None</option>
            {KEY_PCS.map((pc) => <option key={pc} value={pc}>{keyLabel(pc, 'major').label}</option>)}
          </select>
        </label>
        <button className="button" onClick={() => setTapped([])} disabled={tapped.length === 0}>Clear tapped keys</button>
      </div>
      <p className="quiet">Tap a key to add it to the chord (and hear it); tap it again to take it away. Keys pressed on a connected piano light in gold, tapped keys in green.</p>
    </section>
  )
}
