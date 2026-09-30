import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { AttemptPayload, SessionPayload } from '../api/types'
import { loadPiano, playNotes } from '../audio/piano'
import { Keyboard } from '../components/Keyboard'
import { addPending, flushPending, passedLevels } from '../store/pending'
import { getExercise, getItem, getLevel, levelItems } from '../theory/exercises'
import { buildQuestions } from '../theory/questions'
import { isPassing, isUnlocked, PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/rules'
import type { ExerciseDef, Level, Question } from '../theory/types'

type Phase = 'intro' | 'question' | 'answered' | 'summary'
type SaveState = 'saving' | 'saved' | 'queued'

export function Exercise() {
  const { exercise: exerciseId, level: levelParam } = useParams()
  const exercise = getExercise(exerciseId)
  const level = exercise ? getLevel(exercise, Number(levelParam)) : undefined
  // Read fresh on every visit, so finishing level N really does open level N+1.
  const passed = exercise ? passedLevels(exercise.id) : new Set<number>()
  if (!exercise || !level || !isUnlocked(level.id, passed)) {
    return <Navigate to={exercise ? `/learn/${exercise.id}` : '/'} replace />
  }
  return <Session key={`${exercise.id}-${level.id}`} exercise={exercise} level={level} />
}

function Session({ exercise, level }: { exercise: ExerciseDef; level: Level }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [attempts, setAttempts] = useState<AttemptPayload[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [save, setSave] = useState<SaveState>('saving')
  const startedAt = useRef<Date | null>(null)
  const heardAt = useRef(0)
  const choices = useMemo(() => levelItems(exercise, level), [exercise, level])
  const question = questions[index]

  const play = useCallback(
    async (q: Question) => {
      setPlaying(true)
      try {
        await playNotes(q.notes, exercise.playStyle(q.mode))
      } catch {
        setLoadError('The piano could not play. Check your connection, then try again.')
      } finally {
        setPlaying(false)
      }
    },
    [exercise],
  )

  async function start() {
    setLoadError(undefined)
    try {
      await loadPiano() // inside the click, so the browser allows audio
    } catch {
      setLoadError('The piano sounds could not load. Check your connection, then try again.')
      return
    }
    const qs = buildQuestions(exercise, level, QUESTIONS_PER_SESSION)
    startedAt.current = new Date()
    setQuestions(qs)
    setIndex(0)
    setAttempts([])
    setPicked(null)
    setPhase('question')
    heardAt.current = performance.now()
    void play(qs[0])
  }

  function answer(itemId: string) {
    if (phase !== 'question' || !question) return
    const attempt: AttemptPayload = {
      root_midi: question.root,
      item: question.item,
      mode: question.mode,
      answered: itemId,
      correct: itemId === question.item,
      response_ms: Math.round(performance.now() - heardAt.current),
    }
    setPicked(itemId)
    setAttempts((prev) => [...prev, attempt])
    setPhase('answered')
    void play(question) // replay so the ear can check the answer
  }

  function next() {
    if (index + 1 >= questions.length) {
      void finish()
      return
    }
    const nextIndex = index + 1
    setIndex(nextIndex)
    setPicked(null)
    setPhase('question')
    heardAt.current = performance.now()
    void play(questions[nextIndex])
  }

  async function finish() {
    setPhase('summary')
    setSave('saving')
    const session: SessionPayload = {
      client_id: crypto.randomUUID(),
      exercise: exercise.id,
      level: level.id,
      started_at: (startedAt.current ?? new Date()).toISOString(),
      ended_at: new Date().toISOString(),
      attempts,
    }
    addPending(session)
    const result = await flushPending()
    setSave(result.remaining === 0 ? 'saved' : 'queued')
  }

  // R replays the current question.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'r' || event.metaKey || event.ctrlKey || event.altKey) return
      if (question && (phase === 'question' || phase === 'answered') && !playing) void play(question)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, question, playing, play])

  if (phase === 'intro') {
    return (
      <section className="practice">
        <BackLink exercise={exercise} />
        <p className="level-tag">{exercise.name}, level {level.id}</p>
        <h1>{level.name}</h1>
        <p className="lede">{level.blurb}</p>
        <Keyboard range={level.lowRange} />
        <p className="hero-caption">The lit strip is where the lowest note will fall.</p>
        <ul className="anchors">
          {choices.map((item) => (
            <li key={item.id}>
              <strong>{item.short}</strong> {item.name} <span className="quiet">· {item.hint}</span>
            </li>
          ))}
        </ul>
        <p className="quiet">
          {QUESTIONS_PER_SESSION} questions. Score {PASS_ACCURACY * 100}% or more to unlock the next level. Press R to hear a question again.
        </p>
        {loadError && <p className="notice warn" role="alert">{loadError}</p>}
        <button className="button primary" onClick={() => void start()}>Start</button>
      </section>
    )
  }

  if (phase === 'summary') {
    return <Summary exercise={exercise} level={level} attempts={attempts} save={save} onAgain={() => setPhase('intro')} />
  }

  const revealed = phase === 'answered'
  const correct = revealed && picked === question.item
  const truth = getItem(exercise, question.item)
  return (
    <section className="practice">
      <BackLink exercise={exercise} />
      <div className="progress-line" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + (revealed ? 1 : 0)} aria-label="Session progress">
        <span style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <p className="quiet">Question {index + 1} of {questions.length}</p>

      <Keyboard
        range={level.lowRange}
        lit={revealed ? question.notes.map((midi) => ({ midi, role: midi === question.root ? 'first' : 'second' })) : []}
      />

      <div className="play-row">
        <button className="button" onClick={() => void play(question)} disabled={playing} aria-label="Play the question again">
          {playing ? 'Playing…' : 'Play again'}
        </button>
        <span className="quiet">or press R</span>
      </div>

      {loadError && <p className="notice warn" role="alert">{loadError}</p>}

      <div className="answers" role="group" aria-label="Choose the answer">
        {choices.map((item) => {
          const state = !revealed ? '' : item.id === question.item ? 'right' : item.id === picked ? 'wrong' : 'dim'
          return (
            <button key={item.id} className={`answer ${state}`} onClick={() => answer(item.id)} disabled={revealed}>
              <span className="answer-short">{item.short}</span>
              <span className="answer-name">{item.name}</span>
            </button>
          )
        })}
      </div>

      <div className="feedback" aria-live="polite">
        {revealed && (
          <>
            <p className={`verdict ${correct ? 'right' : 'wrong'}`}>
              {correct ? 'Correct.' : `Not quite. That was ${exercise.phrase(truth)}.`}
            </p>
            <p>
              {exercise.describe(question)}
              {!correct && <> {exercise.hintLabel} {truth.hint}.</>}
            </p>
            <button className="button primary" onClick={next} autoFocus>
              {index + 1 >= questions.length ? 'See results' : 'Next question'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function BackLink({ exercise }: { exercise: ExerciseDef }) {
  return <Link className="back" to={`/learn/${exercise.id}`}>← {exercise.name}</Link>
}

function Summary({ exercise, level, attempts, save, onAgain }: { exercise: ExerciseDef; level: Level; attempts: AttemptPayload[]; save: SaveState; onAgain: () => void }) {
  const correct = attempts.filter((a) => a.correct).length
  const pass = isPassing(attempts.length, correct)
  const percent = Math.round((correct / attempts.length) * 100)
  const missed = new Map<string, number>()
  attempts.filter((a) => !a.correct).forEach((a) => missed.set(a.item, (missed.get(a.item) ?? 0) + 1))
  const hasNext = level.id < exercise.levels.length

  return (
    <section className="practice">
      <BackLink exercise={exercise} />
      <p className="level-tag">{exercise.name}, level {level.id}: {level.name}</p>
      <h1>{pass ? 'Level passed' : 'Not yet'}</h1>
      <p className="lede">
        {correct} of {attempts.length} correct ({percent}%).{' '}
        {pass
          ? hasNext ? `Level ${level.id + 1} is open.` : `You have finished the whole ${exercise.name.toLowerCase()} roadmap.`
          : `You need ${PASS_ACCURACY * 100}% to move on. Try again while it is fresh.`}
      </p>
      {missed.size > 0 && (
        <>
          <h2>Worth another listen</h2>
          <ul className="anchors">
            {[...missed.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => {
              const item = getItem(exercise, id)
              return (
                <li key={id}>
                  <strong>{item.short}</strong> {item.name}, missed {count} {count === 1 ? 'time' : 'times'} <span className="quiet">· {item.hint}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <p className="quiet" role="status">
        {save === 'saving' && 'Saving…'}
        {save === 'saved' && 'Saved to your progress.'}
        {save === 'queued' && 'Saved on this device. It will upload when the server is reachable.'}
      </p>
      <div className="hero-actions">
        {pass && hasNext && <Link className="button primary" to={`/practice/${exercise.id}/${level.id + 1}`}>Go to level {level.id + 1}</Link>}
        <button className={`button ${pass && hasNext ? '' : 'primary'}`} onClick={onAgain}>Practice level {level.id} again</button>
        <Link className="button" to="/progress">See progress</Link>
      </div>
    </section>
  )
}
