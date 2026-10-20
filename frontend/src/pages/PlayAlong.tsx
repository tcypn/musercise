import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPiano, playSequence, prepareAudio, stopSound } from '../audio/piano'
import { Keyboard } from '../components/Keyboard'
import { midi, useMidi } from '../store/midi'
import { readJson, writeJson } from '../store/storage'
import { keyLabel } from '../theory/harmony'
import { BACKINGS, CHARTS, judgeBar, schedule, WINDOW, type Backing, type Bar, type BarResult, type Struck } from '../theory/playAlong'

const STORE = 'musercise.play-along'
const KEY_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
interface Settings { chart: string; key: number; bpm: number; backing: Backing; rounds: number }
const DEFAULTS: Settings = { chart: 'pop', key: 0, bpm: 80, backing: 'bass', rounds: 2 }

const MARK: Record<BarResult['kind'], string> = { right: '✓', early: '✓ early', late: '✓ late', wrong: '✗', missed: '·' }

/** Play along with a chord chart: a count-in, the chart bar by bar, and (with a piano or taps) a check of each bar's beat 1. */
export function PlayAlong() {
  const piano = useMidi()
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, ...readJson<Partial<Settings>>(STORE, {}) }))
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup')
  const [bars, setBars] = useState<Bar[]>([])
  const [pos, setPos] = useState<{ bar: number; beat: number }>({ bar: -1, beat: 0 })
  const [results, setResults] = useState<Record<number, BarResult>>({})
  const [flash, setFlash] = useState<number[]>([])
  const struck = useRef<Struck[]>([])
  /** performance.now() at the sound's time 0, set when the first click sounds. */
  const anchor = useRef<number | null>(null)

  useEffect(() => {
    midi.resume()
    const off = midi.onNote((m, t) => struck.current.push({ midi: m, t }))
    return () => {
      off()
      stopSound()
    }
  }, [])

  const set = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    writeJson(STORE, next)
  }

  const judge = (list: Bar[], i: number) => {
    if (anchor.current === null || !list[i]) return
    const result = judgeBar(struck.current, list[i], anchor.current + list[i].at * 1000)
    setResults((r) => ({ ...r, [i]: result }))
  }

  async function start() {
    prepareAudio()
    await loadPiano()
    const plan = schedule(settings.chart, settings.key, settings.bpm, settings.backing, settings.rounds)
    struck.current = []
    anchor.current = null
    setBars(plan.bars)
    setResults({})
    setPos({ bar: -1, beat: 0 })
    setPhase('playing')
    const handle = await playSequence(plan.events, (i) => {
      if (i === null) return
      if (anchor.current === null) anchor.current = performance.now() - plan.events[i].time * 1000
      const b = plan.beatOf[i]
      const bar = plan.barOf[i]!
      if (b === null) return
      setPos({ bar, beat: b })
      // A bar is judged once the next one starts (its window has long closed by then).
      if (b === 0 && bar > 0) judge(plan.bars, bar - 1)
    })
    await handle.done
    finish(plan.bars)
  }

  function finish(list: Bar[]) {
    const now = performance.now()
    list.forEach((b, i) => {
      if (anchor.current !== null && anchor.current + b.at * 1000 + WINDOW.after <= now) judge(list, i)
    })
    setPhase('done')
  }

  function stop() {
    stopSound() // ends the playback; `done` resolves and finish() runs
  }

  const tap = (m: number) => {
    if (phase !== 'playing') return
    struck.current.push({ midi: m, t: performance.now() })
    setFlash((f) => [...f, m])
    setTimeout(() => setFlash((f) => f.filter((x) => x !== m)), 250)
  }

  const chart = CHARTS.find((c) => c.id === settings.chart)!
  const perRound = chart.bars.length
  const current = pos.bar >= 0 ? bars[pos.bar] : bars[0]
  const next = bars[pos.bar + 1]
  const round = Math.max(0, Math.floor(Math.max(pos.bar, 0) / perRound))
  const judged = Object.values(results)
  const good = judged.filter((r) => r.kind === 'right' || r.kind === 'early' || r.kind === 'late')
  const avg = good.length ? Math.round(good.reduce((s, r) => s + ('offset' in r ? r.offset : 0), 0) / good.length) : 0

  if (phase === 'setup') {
    return (
      <section className="practice play-along">
        <p><Link to="/piano">← Piano</Link></p>
        <h1>Play along</h1>
        <p className="lede">Play a chord chart in time. After a count-in of four clicks, play each bar's chord on beat 1.{piano.status === 'connected' ? ' Your piano is connected: every bar is checked.' : ' Connect a piano on the Piano tab to have every bar checked (tapping the keys below works too, less precisely).'}</p>
        <div className="form play-along-form">
          <label>Chart <select value={settings.chart} onChange={(e) => set({ chart: e.target.value })}>{CHARTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Key <select value={settings.key} onChange={(e) => set({ key: Number(e.target.value) })}>{KEY_PCS.map((pc) => <option key={pc} value={pc}>{keyLabel(pc, 'major').label}</option>)}</select></label>
          <label>Tempo: {settings.bpm} bpm <input type="range" min={50} max={140} step={2} value={settings.bpm} onChange={(e) => set({ bpm: Number(e.target.value) })} /></label>
          <label>Backing <select value={settings.backing} onChange={(e) => set({ backing: e.target.value as Backing })}>{BACKINGS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label>Rounds <select value={settings.rounds} onChange={(e) => set({ rounds: Number(e.target.value) })}>{[1, 2, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <button className="button primary big-btn" onClick={() => void start()}>Start</button>
      </section>
    )
  }

  const rows = phase === 'done' ? Array.from({ length: settings.rounds }, (_, r) => r) : [round]
  return (
    <section className="practice play-along">
      <h1>Play along</h1>
      {phase === 'playing' && current && (
        <div className="pa-now" data-bar={pos.bar} data-notes={current.notes.join(',')}>
          <p className="pa-count">{pos.bar < 0 ? `Get ready: ${pos.beat + 1}` : `Round ${round + 1} of ${settings.rounds}`}</p>
          <p className="pa-chord">{current.name}</p>
          <p className="pa-next quiet">{next ? `Next: ${next.name}` : 'Last bar'}</p>
          <p className="pa-beats" aria-hidden="true">{[0, 1, 2, 3].map((b) => <span key={b} className={b === pos.beat ? 'on' : ''} />)}</p>
        </div>
      )}
      {phase === 'done' && (
        <div className="pa-summary" role="status">
          <p className="pa-chord">{judged.length ? `${good.length} of ${judged.length} bars right` : 'Done'}</p>
          <p className="quiet">{good.length ? (Math.abs(avg) <= 15 ? 'Right on the beat, on average.' : `On average ${Math.abs(avg)} ms ${avg < 0 ? 'early' : 'late'}.`) : judged.some((r) => r.kind === 'wrong') ? 'The notes on beat 1 were not the chart\'s chords: look at the ✗ bars.' : 'Nothing was played on beat 1. Play each chord as its bar starts.'}</p>
        </div>
      )}
      {rows.map((r) => (
        <ol key={r} className="pa-grid" aria-label={`Round ${r + 1}`}>
          {chart.bars.map((_, i) => {
            const index = r * perRound + i
            const b = bars[index]
            const res = results[index]
            return (
              <li key={i} className={['pa-bar', index === pos.bar && phase === 'playing' ? 'on' : '', res ? `r-${res.kind}` : ''].filter(Boolean).join(' ')}>
                <span className="pa-bar-name">{b?.name}</span>
                {res && <span className="pa-mark">{MARK[res.kind]}</span>}
              </li>
            )
          })}
        </ol>
      ))}
      {phase === 'playing' && (
        <div className="pa-keys">
          <Keyboard lit={flash.map((m) => ({ midi: m, role: 'second' as const }))} onTap={tap} view={[48, 83]} />
        </div>
      )}
      <div className="pa-buttons">
        {phase === 'playing' ? <button className="button" onClick={stop}>Stop</button> : (
          <>
            <button className="button" onClick={() => setPhase('setup')}>Change settings</button>
            <button className="button primary" onClick={() => void start()}>Again</button>
          </>
        )}
      </div>
    </section>
  )
}
