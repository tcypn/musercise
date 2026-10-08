import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { playSequence, prepareAudio, stopSound } from '../audio/piano'
import { Close, Speaker } from '../components/dash/Icons'
import { passedLevels } from '../store/pending'
import { useGoal } from '../store/useGoal'
import { useProgress } from '../store/useProgress'
import { getExercise, nextLevel } from '../theory/exercises'
import { buildPath } from '../theory/path'
import { eventsFor } from '../theory/playback'
import type { Level } from '../theory/types'

/** The guide to one lesson, like a Duolingo unit guide: what you learn, each level, and a tip. */
export function Guide() {
  const { exercise: id } = useParams()
  const exercise = getExercise(id)
  const { progress } = useProgress()
  const goal = useGoal()
  const [playing, setPlaying] = useState<number | null>(null)
  let where: { stage: number; lesson?: number } | null = null
  for (const s of buildPath(progress, goal)) {
    const lesson = s.lessons.find((l) => l.id === id)
    if (lesson) where = { stage: s.stage.id, lesson: lesson.number }
  }

  useEffect(() => stopSound, [])
  if (!exercise) return <Navigate to="/" replace />

  const quiz = exercise.kind === 'quiz'
  const next = nextLevel(exercise, passedLevels(exercise.id))
  // One example from the level, in a new key each time; one sound at a time.
  async function play(level: Level) {
    prepareAudio()
    setPlaying(level.id)
    try {
      const item = exercise!.items.find((i) => i.id === level.items[Math.floor(Math.random() * level.items.length)])!
      const mode = level.modes[Math.floor(Math.random() * level.modes.length)]
      const handle = await playSequence(eventsFor(exercise!, exercise!.makeQuestion(level, item, mode, Math.random)))
      await handle.done
    } finally {
      setPlaying((p) => (p === level.id ? null : p))
    }
  }

  return (
    <div className="fullpage">
      <header className="fullpage-top">
        <Link to="/" className="lesson-x" aria-label="Close"><Close size={26} /></Link>
      </header>
      <div className="guide-head">
        <p className="stage-eyebrow">{where ? `Stage ${where.stage}${where.lesson ? `, lesson ${where.lesson}` : ''}` : 'Lesson'}</p>
        <h1>{exercise.name}</h1>
      </div>
      <section className="guide-section">
        <h2 className="guide-label">What you'll learn</h2>
        <p>{exercise.blurb}</p>
      </section>
      <section className="guide-section">
        <h2 className="guide-label">The levels</h2>
        <ol className="guide-levels">
          {exercise.levels.map((level) => (
            <li key={level.id} className="guide-level">
              {!quiz && (
                <button type="button" className="guide-play" aria-label={`Hear an example of level ${level.id}`} aria-busy={playing === level.id} onClick={() => void play(level)}>
                  <Speaker size={24} />
                </button>
              )}
              <div>
                <strong>{level.id}. {level.name}</strong>
                <p className="quiet">{level.blurb}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {exercise.tip && (
        <section className="guide-section">
          <h2 className="guide-label">Tip</h2>
          <p>{exercise.tip}</p>
        </section>
      )}
      <div className="guide-start">
        <Link to={`/practice/${exercise.id}/${next.id}`} className="button primary big-btn">Start level {next.id}</Link>
      </div>
    </div>
  )
}
