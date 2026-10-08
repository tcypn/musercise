import { useEffect, useRef, useState } from 'react'
import { playSequence, prepareAudio, stopSound } from '../../audio/piano'
import { eventsFor, soundingAt, stepFor } from '../../theory/playback'
import type { ExerciseDef, Item, Level, Question } from '../../theory/types'
import { Keyboard } from '../Keyboard'
import { Snail, Speaker } from '../dash/Icons'

interface Props {
  exercise: ExerciseDef
  level: Level
  items: Item[]
}

/** Listen first: every answer of the level, one card each, played in a fresh random key. Nothing is scored or saved. */
export function Listen({ exercise, level, items }: Props) {
  const [examples, setExamples] = useState<Record<string, Question>>({})
  const [playingId, setPlayingId] = useState<string | null>(null)
  /** Which chord or note of the example is sounding, so the keyboard shows what you hear. */
  const [step, setStep] = useState(0)
  /** Exactly the keys sounding now, while an example plays. */
  const [sounding, setSounding] = useState<{ midi: number; role: 'first' | 'second' }[] | null>(null)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string>()
  const token = useRef(0)

  useEffect(() => stopSound, [])

  async function play(item: Item, again: boolean) {
    prepareAudio()
    setError(undefined)
    const mine = ++token.current
    const existing = examples[item.id]
    const mode = level.modes[Math.floor(Math.random() * level.modes.length)]
    const question = existing && !again ? existing : exercise.makeQuestion(level, item, mode, Math.random)
    setExamples((prev) => ({ ...prev, [item.id]: question }))
    setPlayingId(item.id)
    try {
      setStep(0)
      const played = eventsFor(exercise, question, slow)
      const handle = await playSequence(played, (i) => {
        if (token.current !== mine) return
        setSounding(i === null ? null : soundingAt(played, i))
        const s = i === null ? null : stepFor(question, 'all', i)
        if (s !== null) setStep(s)
      })
      await handle.done
    } catch {
      setError('The piano could not play. Check your connection, then try again.')
    } finally {
      if (token.current === mine) setPlayingId(null)
    }
  }

  return (
    <div className="listen">
      <p className="quiet" style={{ margin: 0 }}>
        Just listen, nothing is scored. Press play to hear each answer in a new key; press it again for another example.
      </p>
      <button type="button" className="button" aria-pressed={slow} onClick={() => setSlow((s) => !s)}>
          <Snail size={18} /> Slow {slow ? 'on' : 'off'}
        </button>
      {error && <p className="notice warn" role="alert">{error}</p>}
      <ul className="listen-list">
        {items.map((item) => {
          const q = examples[item.id]
          return (
            <li key={item.id} className="listen-card" data-playing={playingId === item.id}>
              <div className="listen-head">
                <div>
                  <strong>{item.short}</strong> {item.name}
                  <div className="quiet">{item.hint}</div>
                </div>
                <button type="button" className="speak small" aria-label={`Play ${item.name}`} aria-busy={playingId === item.id} onClick={() => void play(item, true)}>
                  <Speaker size={28} />
                </button>
              </div>
              {q && (
                <div className="lesson-keys">
                  <Keyboard
                    range={level.lowRange}
                    lit={(playingId === item.id && sounding) || (q.steps ? q.steps[Math.min(playingId === item.id ? step : 0, q.steps.length - 1)].notes : (q.lit ?? q.notes)).map((midi, i) => ({ midi, role: (q.steps ? i === 0 : midi === q.root) ? 'first' : 'second' }))}
                  />
                  <p className="hero-caption">{exercise.describe(q)}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
