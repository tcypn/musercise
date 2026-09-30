import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { AttemptPayload, SessionPayload } from '../api/types'
import { loadPiano, playNotes } from '../audio/piano'
import { Keyboard } from '../components/Keyboard'
import { addPending, flushPending } from '../store/pending'
import { passedLevels } from '../store/pending'
import { intervalBySemitones } from '../theory/intervals'
import { noteName } from '../theory/notes'
import { buildQuestions, type Question } from '../theory/questions'
import {
  INTERVAL_LEVELS,
  isPassing,
  isUnlocked,
  levelById,
  levelIntervals,
  PASS_ACCURACY,
  QUESTIONS_PER_SESSION,
  type Level,
} from '../theory/roadmap'

type Phase = 'intro' | 'question' | 'answered' | 'summary'
type SaveState = 'saving' | 'saved' | 'queued'

const MODE_WORD = { ascending: 'rising', descending: 'falling', harmonic: 'together' } as const

export function Exercise() {
  const { levelId } = useParams()
  const level = levelById(Number(levelId))
  // Read fresh on every level change, so finishing level N really does open level N+1.
  const passed = passedLevels()
  if (!level || !isUnlocked(level.id, passed)) return <Navigate to="/" replace />
  return <Session key={level.id} level={level} />
}

function Session({ level }: { level: Level }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [attempts, setAttempts] = useState<AttemptPayload[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [save, setSave] = useState<SaveState>('saving')
  const startedAt = useRef<Date | null>(null)
  const heardAt = useRef(0)
  const choices = useMemo(() => levelIntervals(level), [level])
  const question = questions[index]

  const play = useCallback(
    async (q: Question) => {
      setPlaying(true)
      try {
        await playNotes(q.notes, q.mode)
      } catch {
        setLoadError('The piano could not play. Check your connection, then try again.')
      } finally {
        setPlaying(false)
      }
    },
    [],
  )

  async function start() {
    setLoadError(undefined)
    try {
      await loadPiano() // inside the click, so the browser allows audio
    } catch {
      setLoadError('The piano sounds could not load. Check your connection, then try again.')
      return
    }
    const qs = buildQuestions(level, QUESTIONS_PER_SESSION)
    startedAt.current = new Date()
    setQuestions(qs)
    setIndex(0)
    setAttempts([])
    setPicked(null)
    setPhase('question')
    heardAt.current = performance.now()
    void play(qs[0])
  }

  function answer(semitones: number) {
    if (phase !== 'question' || !question) return
    const attempt: AttemptPayload = {
      root_midi: question.root,
      interval_semitones: question.semitones,
      mode: question.mode,
      answered_semitones: semitones,
      correct: semitones === question.semitones,
      response_ms: Math.round(performance.now() - heardAt.current),
    }
    setPicked(semitones)
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
      exercise: 'intervals',
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
        <BackLink />
        <p className="level-tag">Level {level.id}</p>
        <h1>{level.name}</h1>
        <p className="lede">{level.blurb}</p>
        <Keyboard range={level.lowRange} />
        <p className="hero-caption">The lit strip is where the lower note will fall.</p>
        <ul className="anchors">
          {choices.map((i) => (
            <li key={i.semitones}>
              <strong>{i.short}</strong> {i.name} <span className="quiet">· {i.anchor}</span>
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
    return <Summary level={level} attempts={attempts} save={save} onAgain={() => setPhase('intro')} />
  }

  const revealed = phase === 'answered'
  const correct = revealed && picked === question.semitones
  const truth = intervalBySemitones(question.semitones)
  return (
    <section className="practice">
      <BackLink />
      <div className="progress-line" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + (revealed ? 1 : 0)} aria-label="Session progress">
        <span style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <p className="quiet">Question {index + 1} of {questions.length}</p>

      <Keyboard
        range={level.lowRange}
        lit={revealed ? [{ midi: question.notes[0], role: 'first' }, { midi: question.notes[1], role: 'second' }] : []}
      />

      <div className="play-row">
        <button className="button" onClick={() => void play(question)} disabled={playing} aria-label="Play the interval again">
          {playing ? 'Playing…' : 'Play again'}
        </button>
        <span className="quiet">or press R</span>
      </div>

      {loadError && <p className="notice warn" role="alert">{loadError}</p>}

      <div className="answers" role="group" aria-label="Choose the interval">
        {choices.map((i) => {
          const state = !revealed ? '' : i.semitones === question.semitones ? 'right' : i.semitones === picked ? 'wrong' : 'dim'
          return (
            <button key={i.semitones} className={`answer ${state}`} onClick={() => answer(i.semitones)} disabled={revealed}>
              <span className="answer-short">{i.short}</span>
              <span className="answer-name">{i.name}</span>
            </button>
          )
        })}
      </div>

      <div className="feedback" aria-live="polite">
        {revealed && (
          <>
            <p className={`verdict ${correct ? 'right' : 'wrong'}`}>
              {correct ? 'Correct.' : `Not quite. That was the ${truth.name.toLowerCase()}.`}
            </p>
            <p>
              {noteName(question.notes[0])} to {noteName(question.notes[1])}, {MODE_WORD[question.mode]}, {truth.short}.
              {!correct && <> Anchor: {truth.anchor}.</>}
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

function BackLink() {
  return <Link className="back" to="/">← Roadmap</Link>
}

function Summary({ level, attempts, save, onAgain }: { level: Level; attempts: AttemptPayload[]; save: SaveState; onAgain: () => void }) {
  const correct = attempts.filter((a) => a.correct).length
  const pass = isPassing(attempts.length, correct)
  const percent = Math.round((correct / attempts.length) * 100)
  const missed = new Map<number, number>()
  attempts.filter((a) => !a.correct).forEach((a) => missed.set(a.interval_semitones, (missed.get(a.interval_semitones) ?? 0) + 1))
  const hasNext = level.id < INTERVAL_LEVELS.length

  return (
    <section className="practice">
      <BackLink />
      <p className="level-tag">Level {level.id}: {level.name}</p>
      <h1>{pass ? 'Level passed' : 'Not yet'}</h1>
      <p className="lede">
        {correct} of {attempts.length} correct ({percent}%).{' '}
        {pass
          ? hasNext ? `Level ${level.id + 1} is open.` : 'You have finished the whole roadmap.'
          : `You need ${PASS_ACCURACY * 100}% to move on. Try again while it is fresh.`}
      </p>
      {missed.size > 0 && (
        <>
          <h2>Worth another listen</h2>
          <ul className="anchors">
            {[...missed.entries()].sort((a, b) => b[1] - a[1]).map(([semitones, count]) => {
              const i = intervalBySemitones(semitones)
              return (
                <li key={semitones}>
                  <strong>{i.short}</strong> {i.name}, missed {count} {count === 1 ? 'time' : 'times'} <span className="quiet">· {i.anchor}</span>
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
        {pass && hasNext && <Link className="button primary" to={`/practice/${level.id + 1}`}>Go to level {level.id + 1}</Link>}
        <button className={`button ${pass && hasNext ? '' : 'primary'}`} onClick={onAgain}>Practice level {level.id} again</button>
        <Link className="button" to="/progress">See progress</Link>
      </div>
    </section>
  )
}
