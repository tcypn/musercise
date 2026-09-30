import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPiano, playSequence, prepareAudio, warmUp, type SequenceHandle } from '../audio/piano'
import { Keyboard, type LitKey } from '../components/Keyboard'
import { SyncNotice } from '../components/SyncNotice'
import { TempoSlider } from '../components/TempoSlider'
import { usePracticeDay } from '../store/practice'
import { readJson, writeJson } from '../store/storage'
import { useProgress } from '../store/useProgress'
import { EXERCISE_LIST, nextLevel } from '../theory/exercises'
import { keyForDate, localDateString, ROUTINE, ROUTINE_MINUTES, sectionsFor, toTimed, type PracticeItem, type RoutineRow, type Section } from '../theory/practice'
import { getKey, keyName, KEYS_BY_FIFTHS } from '../theory/spelling'

const KEY_STORAGE = 'musercise.daily.key'
const BPM_STORAGE = 'musercise.daily.bpm'

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

interface Playing {
  row: PracticeItem
  section: string
  notes: number[]
}

export function Daily() {
  const today = useMemo(() => localDateString(), [])
  const { progress, sync, message, pendingCount, rejectedCount } = useProgress()
  const { day, update } = usePracticeDay(today)

  const suggested = useMemo(() => keyForDate(today), [today])
  const [keyId, setKeyId] = useState(() => {
    const stored = readJson<{ date?: string; id?: string }>(KEY_STORAGE, {})
    return stored.date === today && stored.id && getKey(stored.id) ? stored.id : suggested.id
  })
  const key = getKey(keyId) ?? suggested
  const [bpm, setBpm] = useState(() => {
    const stored = readJson<number>(BPM_STORAGE, 60)
    return Number.isFinite(stored) ? Math.min(120, Math.max(40, stored)) : 60
  })

  const [playing, setPlaying] = useState<Playing | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>()
  const handle = useRef<SequenceHandle | null>(null)
  const run = useRef(0)

  const stop = useCallback(() => {
    run.current++
    handle.current?.stop()
    handle.current = null
    setPlaying(null)
    setLoading(null)
  }, [])
  useEffect(() => stop, [stop])
  useEffect(() => warmUp(), [])

  function chooseKey(id: string) {
    stop()
    setKeyId(id)
    writeJson(KEY_STORAGE, { date: today, id })
  }
  const stepKey = (delta: number) => {
    const index = KEYS_BY_FIFTHS.findIndex((k) => k.id === key.id)
    chooseKey(KEYS_BY_FIFTHS[(index + delta + 12) % 12].id)
  }
  function chooseBpm(next: number) {
    setBpm(next)
    writeJson(BPM_STORAGE, next)
  }

  async function hear(row: PracticeItem, section: Section) {
    prepareAudio() // first, inside the tap: phones only allow sound to start here
    stop()
    const mine = ++run.current
    setError(undefined)
    setLoading(section.id)
    try {
      await loadPiano() // inside the click, so the browser allows audio
      const started = await playSequence(toTimed(section.events, bpm), (index) => {
        if (run.current !== mine) return
        setPlaying(index === null ? null : { row, section: section.id, notes: section.events[index].notes })
      })
      if (run.current !== mine) {
        started.stop()
        return
      }
      handle.current = started
      setLoading(null)
      await started.done
    } catch {
      if (run.current === mine) setError('The piano could not play. Check your connection, then try again.')
      setLoading(null)
    }
  }

  // The ear row ticks itself when a session finished today.
  const earToday = progress.history.some((h) => localDateString(new Date(h.ended_at)) === today)
  useEffect(() => {
    if (earToday && !day.ear?.done) update('ear', { done: true })
  }, [earToday, day.ear?.done, update])

  // Suggest the exercise practised least recently.
  const earPick = useMemo(() => {
    const last = (id: string) => progress.history.find((h) => h.exercise === id)?.ended_at ?? ''
    const exercise = [...EXERCISE_LIST].sort((a, b) => last(a.id).localeCompare(last(b.id)))[0]
    const passed = new Set(progress.exercises[exercise.id].levels.filter((l) => l.passed).map((l) => l.level))
    return { exercise, level: nextLevel(exercise, passed) }
  }, [progress])

  const doneCount = ROUTINE.filter((r) => day[r.id]?.done).length
  const minutes = Math.round(Object.values(day).reduce((sum, log) => sum + (log?.seconds ?? 0), 0) / 60)
  const firstOpen = ROUTINE.find((r) => !day[r.id]?.done)?.id
  const heading = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const overridden = key.id !== suggested.id

  return (
    <section className="practice daily">
      <p className="level-tag">{heading}</p>
      <h1>Today&rsquo;s practice</h1>
      <p className="lede">
        About {ROUTINE_MINUTES} minutes. Each row shows what to play, and the piano can play it back for reference. The app cannot hear you, so it
        times each row and keeps a log.
      </p>

      <SyncNotice sync={sync} message={message} pendingCount={pendingCount} rejectedCount={rejectedCount} />

      <div className="daily-key">
        <p className="quiet" id="key-label">Key of the day</p>
        <p className="daily-key-name">{keyName(key)}</p>
        <div className="key-controls">
          <button className="button" onClick={() => stepKey(-1)} aria-label="Previous key on the circle of fifths">←</button>
          <select value={key.id} onChange={(e) => chooseKey(e.target.value)} aria-labelledby="key-label">
            {KEYS_BY_FIFTHS.map((k) => (
              <option key={k.id} value={k.id}>{keyName(k)}</option>
            ))}
          </select>
          <button className="button" onClick={() => stepKey(1)} aria-label="Next key on the circle of fifths">→</button>
          {overridden && <button className="button" onClick={() => chooseKey(suggested.id)}>Back to today&rsquo;s key</button>}
        </div>
        <p className="quiet">
          {overridden ? `Today's suggested key is ${suggested.label} major. ` : 'One new key each day, following the circle of fifths. '}
          Every row uses this key and its relative minor.
        </p>
      </div>

      <div className="daily-summary">
        <div className="map-meter" role="progressbar" aria-valuemin={0} aria-valuemax={ROUTINE.length} aria-valuenow={doneCount} aria-label="Rows done today">
          <span style={{ width: `${(doneCount / ROUTINE.length) * 100}%` }} />
        </div>
        <p className="quiet">
          {doneCount} of {ROUTINE.length} done · {minutes} min practised
          {progress.totals.streak_days > 0 && ` · ${progress.totals.streak_days}-day streak`}
        </p>
      </div>

      <TempoSlider bpm={bpm} onChange={chooseBpm} />
      {error && <p className="notice warn" role="alert">{error}</p>}

      <ol className="sheet" aria-label="Today's routine">
        {ROUTINE.map((row, index) => (
          <SheetRow
            key={row.id}
            row={row}
            number={index + 1}
            seconds={day[row.id]?.seconds ?? 0}
            done={!!day[row.id]?.done}
            open={row.id === firstOpen}
            sections={sectionsFor(row.id, key)}
            playing={playing?.row === row.id ? playing : null}
            playingSection={playing?.section}
            loading={loading}
            onSeconds={(seconds) => update(row.id, { seconds })}
            onDone={(done) => update(row.id, { done })}
            onHear={(section) => void hear(row.id, section)}
            onStop={stop}
            ear={row.id === 'ear' ? earPick : undefined}
          />
        ))}
      </ol>

      <p className="quiet">
        No fingering numbers are shown, because good fingering depends on the key and on your hands. Use the fingering you know, or your teacher&rsquo;s.
        Brass keys are the right hand, green keys the left.
      </p>
    </section>
  )
}

interface RowProps {
  row: RoutineRow
  number: number
  seconds: number
  done: boolean
  open: boolean
  sections: Section[]
  playing: Playing | null
  playingSection: string | undefined
  loading: string | null
  onSeconds: (seconds: number) => void
  onDone: (done: boolean) => void
  onHear: (section: Section) => void
  onStop: () => void
  ear?: { exercise: (typeof EXERCISE_LIST)[number]; level: { id: number; name: string } }
}

function SheetRow({ row, number, seconds, done, open, sections, playing, playingSection, loading, onSeconds, onDone, onHear, onStop, ear }: RowProps) {
  const lit: LitKey[] = playing ? playing.notes.map((midi) => ({ midi, role: midi >= 55 ? 'first' : 'second' })) : []
  const target = row.minutes * 60
  return (
    <li className={`sheet-row ${done ? 'done' : ''}`}>
      <div className="sheet-head">
        <span className="sheet-num" aria-hidden="true">{done ? '✓' : number}</span>
        <div className="sheet-title">
          <h2>{row.title}</h2>
          <p className="quiet">{row.block} · {row.minutes} min</p>
        </div>
        <div className="sheet-controls">
          <Timer seconds={seconds} target={target} onSave={onSeconds} label={row.title} />
          <label className="done-box">
            <input type="checkbox" checked={done} onChange={(e) => onDone(e.target.checked)} />
            <span>Done</span>
          </label>
        </div>
      </div>

      <details className="sheet-body" open={open}>
        <summary>What to do</summary>
        <p className="prose">{row.how}</p>

        {ear && (
          <p>
            <Link className="button primary" to={`/practice/${ear.exercise.id}/${ear.level.id}`}>
              Start {ear.exercise.name.toLowerCase()}, level {ear.level.id}
            </Link>{' '}
            <span className="quiet">Ticks itself once you finish a session today.</span>
          </p>
        )}

        {sections.map((section) => {
          const active = playingSection === section.id
          return (
            <div key={section.id} className="material">
              <h3>{section.heading}</h3>
              {section.lines.map((line, i) => (
                <p key={i} className="notes-line">{line}</p>
              ))}
              {active ? (
                <button className="button" onClick={onStop}>Stop</button>
              ) : (
                <button className="button" onClick={() => onHear(section)} disabled={loading === section.id}>
                  {loading === section.id ? 'Loading the piano…' : 'Hear it'}
                </button>
              )}
            </div>
          )
        })}
        {sections.length > 0 && <Keyboard lit={lit} />}
      </details>
    </li>
  )
}

interface TimerProps {
  seconds: number
  target: number
  onSave: (seconds: number) => void
  label: string
}

function Timer({ seconds, target, onSave, label }: TimerProps) {
  // While running, `live` holds the ticking value; otherwise the stored `seconds` is shown.
  const [running, setRunning] = useState(false)
  const [live, setLive] = useState(seconds)
  const base = useRef(0)
  const startedAt = useRef(0)
  const elapsed = () => base.current + (Date.now() - startedAt.current) / 1000

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => setLive(elapsed()), 500)
    const persist = setInterval(() => onSave(Math.floor(elapsed())), 10_000)
    return () => {
      clearInterval(tick)
      clearInterval(persist)
    }
  }, [running, onSave])

  // Leaving the page while the timer runs keeps the time.
  const leaving = useRef<() => void>(() => {})
  useEffect(() => {
    leaving.current = () => {
      if (running) onSave(Math.floor(elapsed()))
    }
  })
  useEffect(() => () => leaving.current(), [])

  function toggle() {
    if (running) {
      onSave(Math.floor(elapsed()))
      setRunning(false)
    } else {
      base.current = seconds
      startedAt.current = Date.now()
      setLive(seconds)
      setRunning(true)
    }
  }

  const shown = running ? live : seconds
  return (
    <div className="timer">
      <button className="button" onClick={toggle} aria-pressed={running} aria-label={`${running ? 'Pause' : 'Start'} the timer for ${label}`}>
        {running ? 'Pause' : shown > 0 ? 'Resume' : 'Start'}
      </button>
      <span className={`time ${shown >= target ? 'reached' : ''}`} aria-label={`${clock(shown)} of ${clock(target)}`}>
        {clock(shown)} <span className="quiet">/ {clock(target)}</span>
      </span>
    </div>
  )
}
