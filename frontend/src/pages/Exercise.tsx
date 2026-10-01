import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { AttemptPayload, SessionPayload } from '../api/types'
import { loadPiano, playNotes, playSequence, prepareAudio, soundBlocked, stopSound, warmUp } from '../audio/piano'
import { Book, Ear, Snail, Speaker, Trophy } from '../components/dash/Icons'
import { AnswerTile, Confetti, FeedbackBanner, LessonHeader } from '../components/lesson/parts'
import { Keyboard } from '../components/Keyboard'
import { addPending, flushPending, passedLevels } from '../store/pending'
import { getExercise, getItem, getLevel, levelItems } from '../theory/exercises'
import { canSlow as questionCanSlow, eventsFor, questionOffsetMs, type Part } from '../theory/playback'
import { buildQuestions } from '../theory/questions'
import { localDateString } from '../theory/practice'
import { seconds as formatSeconds, sessionSpeed } from '../theory/speed'
import { isPassing, isUnlocked, PASS_ACCURACY, QUESTIONS_PER_SESSION } from '../theory/rules'
import type { ExerciseDef, Level, Question } from '../theory/types'

type Phase = 'intro' | 'question' | 'checked' | 'summary'
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
  /** Which part of a two-part question is sounding right now, for the labels on screen. */
  const [heard, setHeard] = useState<'key' | 'question' | null>(null)
  /** Which chord of a progression the answer keyboard shows: follows the sound, or the chord that was tapped. */
  const [step, setStep] = useState(0)
  const [loadError, setLoadError] = useState<string>()
  const [save, setSave] = useState<SaveState>('saving')
  const [seconds, setSeconds] = useState(0)
  const startedAt = useRef<Date | null>(null)
  const heardAt = useRef(0)
  const quiz = exercise.kind === 'quiz'
  const levelChoices = useMemo(() => levelItems(exercise, level), [exercise, level])
  const question = questions[index]
  // A quiz question may offer just a few of the level's answers; the order is always the lesson's own.
  const choices = useMemo(
    () => (question?.choices ? exercise.items.filter((i) => question.choices!.includes(i.id)) : levelChoices),
    [exercise, levelChoices, question],
  )
  /** Does this question make a sound? Ear lessons always do; quiz questions only when they carry events. */
  const sounds = (q: Question) => !quiz || !!q.events
  const back = `/learn/${exercise.id}`

  // Only the latest play() may touch `playing`, so a sound that was cut short cannot switch the button back on.
  const playId = useRef(0)
  const play = useCallback(
    async (q: Question, slow = false, part: Part = 'all') => {
      const mine = ++playId.current
      setPlaying(true)
      try {
        const from = q.answerFrom
        const handle = await playSequence(eventsFor(exercise, q, slow, part), (i) => {
          if (playId.current !== mine) return // a newer sound has taken over
          if (i !== null && from !== undefined && q.steps && i >= from) setStep(i - from)
          setHeard(i === null || from === undefined ? null : part === 'question' || (part === 'all' && i >= from) ? 'question' : 'key')
        })
        // A phone may still be holding the sound back; say so instead of leaving the learner in silence.
        setLoadError(soundBlocked() ? 'Your phone is holding the sound back. Tap the speaker button once to turn it on, and check that it is not on silent.' : undefined)
        await handle.done
      } catch {
        setLoadError('The piano could not play. Check your connection, then try again.')
      } finally {
        if (playId.current === mine) setPlaying(false)
      }
    },
    [exercise],
  )

  // Leaving the lesson (Quit, the back button, another tab of the app) silences the piano.
  useEffect(() => stopSound, [])
  // Fetch the piano while the intro is on screen, so the tap on Start can unlock sound straight away.
  useEffect(() => warmUp(), [])

  async function start() {
    prepareAudio() // first, inside the tap: phones only allow sound to start here
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
    setStep(0)
    setPhase('question')
    heardAt.current = performance.now()
    if (sounds(qs[0])) void play(qs[0])
  }

  /** Choosing only selects; nothing is recorded until Check. */
  function choose(itemId: string) {
    if (phase === 'question') setPicked(itemId)
  }

  function check() {
    if (phase !== 'question' || !question || picked === null) return
    const attempt: AttemptPayload = {
      root_midi: question.root,
      item: question.item,
      mode: question.mode,
      answered: picked,
      correct: picked === question.item,
      // Time to answer, not time to listen: when a key plays first, the clock starts when the question itself starts.
      response_ms: Math.max(0, Math.round(performance.now() - heardAt.current - questionOffsetMs(question))),
    }
    setAttempts((prev) => [...prev, attempt])
    setStep(0)
    setPhase('checked')
    if (sounds(question)) void play(question) // replaces what is sounding, so the ear can check the answer
  }

  function next() {
    if (phase !== 'checked') return
    stopSound() // the old question must not ring into the next one
    if (index + 1 >= questions.length) {
      void finish()
      return
    }
    const nextIndex = index + 1
    setIndex(nextIndex)
    setPicked(null)
    setStep(0)
    setPhase('question')
    heardAt.current = performance.now()
    if (sounds(questions[nextIndex])) void play(questions[nextIndex])
  }

  async function finish() {
    stopSound()
    const ended = new Date()
    setSeconds(Math.round((ended.getTime() - (startedAt.current ?? ended).getTime()) / 1000))
    setPhase('summary')
    setSave('saving')
    const session: SessionPayload = {
      client_id: crypto.randomUUID(),
      exercise: exercise.id,
      level: level.id,
      started_at: (startedAt.current ?? ended).toISOString(),
      ended_at: ended.toISOString(),
      local_date: localDateString(),
      attempts,
    }
    addPending(session)
    const result = await flushPending()
    setSave(result.remaining === 0 ? 'saved' : 'queued')
  }

  // R replays, 1-9 pick an answer, Enter checks or moves on.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || !question) return
      const target = event.target as HTMLElement
      if (target.closest('a, input, select, textarea')) return
      const key = event.key.toLowerCase()
      if (key === 'r' && (phase === 'question' || phase === 'checked') && sounds(question)) {
        void play(question)
      } else if (phase === 'question' && /^[1-9]$/.test(key) && choices[Number(key) - 1]) {
        setPicked(choices[Number(key) - 1].id)
      } else if (event.key === 'Enter') {
        const tile = target.closest<HTMLElement>('[data-tile]')
        // A focused button handles its own Enter, except an already selected tile, which confirms.
        if (target.closest('button') && !(tile && tile.dataset.tile === picked)) return
        if (phase === 'question' && picked !== null) {
          event.preventDefault()
          check()
        } else if (phase === 'checked') {
          event.preventDefault()
          next()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'intro') {
    return (
      <div className="lesson lesson-intro">
        <LessonHeader done={0} total={QUESTIONS_PER_SESSION} combo={0} quitTo={back} />
        <div className="lesson-main">
          <p className="lesson-label">{quiz ? <Book size={20} /> : <Ear size={20} />}{exercise.name}, level {level.id}</p>
          <h1 className="lesson-title">{level.name}</h1>
          <p className="lede" style={{ margin: 0 }}>{level.blurb}</p>
          <div>
            <Keyboard range={level.lowRange} />
            <p className="hero-caption">The lit strip is where the {exercise.rangeWord ?? 'lowest note'} will fall.</p>
          </div>
          <ul className="anchors">
            {levelChoices.map((item) => (
              <li key={item.id}>
                <strong>{item.short}</strong> {item.name} <span className="quiet">· {item.hint}</span>
              </li>
            ))}
          </ul>
          {exercise.partLabels && (
            <p className="notice" style={{ margin: 0 }}>
              Each question has two parts. First you hear the key, to set up what home sounds like; you do not answer about that. After a pause comes the one to answer about: <strong>{exercise.partLabels.question.toLowerCase()}</strong>. You can replay either part on its own.
            </p>
          )}
          <p className="quiet" style={{ margin: 0 }}>
            {QUESTIONS_PER_SESSION} questions. Score {PASS_ACCURACY * 100}% or more to unlock the next level. {quiz ? 'Press' : 'Press R to hear a question again,'} 1 to 9 to pick an answer and Enter to check it.
          </p>
          {loadError && <p className="notice warn" role="alert">{loadError}</p>}
        </div>
        <footer className="lesson-foot">
          <div className="lesson-foot-in end">
            <button className="button primary big-btn" onClick={() => void start()}>Start</button>
          </div>
        </footer>
      </div>
    )
  }

  if (phase === 'summary') {
    return <Complete exercise={exercise} level={level} attempts={attempts} save={save} seconds={seconds} onAgain={() => setPhase('intro')} />
  }

  const checked = phase === 'checked'
  const correct = checked && picked === question.item
  const truth = getItem(exercise, question.item)
  const combo = (() => {
    let run = 0
    for (let i = attempts.length - 1; i >= 0 && attempts[i].correct; i--) run++
    return run
  })()
  const canSlow = questionCanSlow(exercise, question)

  return (
    <div className="lesson">
      <LessonHeader
        done={attempts.length}
        total={questions.length}
        combo={combo}
        quitTo={back}
        confirmQuit="Quit this lesson? The answers you have given so far will not be saved."
      />
      <div className="lesson-main">
        <div>
          <p className="lesson-label">{quiz ? <Book size={20} /> : <Ear size={20} />}{exercise.name}, level {level.id} · question {index + 1} of {questions.length}</p>
          <h1 className="lesson-title" style={{ marginTop: '0.5rem' }}>{question.prompt?.text ?? exercise.question}</h1>
        </div>

        {question.prompt?.lit && (
          <div className="lesson-keys">
            <Keyboard range={level.lowRange} lit={question.prompt.lit.map((midi) => ({ midi, role: 'first' as const }))} />
          </div>
        )}

        {sounds(question) && (
          <div className="speak-row">
            <button type="button" className="speak" onClick={() => { prepareAudio(); void play(question) }} aria-busy={playing} aria-label="Play the question again (R)">
              <Speaker size={60} />
            </button>
            {canSlow && (
              <button type="button" className="slow" onClick={() => { prepareAudio(); void play(question, true) }} aria-label="Play it slower">
                <Snail size={26} />
                SLOW
              </button>
            )}
          </div>
        )}

        {question.answerFrom !== undefined && exercise.partLabels && (
          <div className="parts" role="group" aria-label="The two parts of the question">
            <button type="button" className={`part ${heard === 'key' ? 'on' : ''}`} onClick={() => { prepareAudio(); void play(question, false, 'key') }} aria-label={`Hear only the key (part 1)`}>
              1 · {exercise.partLabels.key}
            </button>
            <button type="button" className={`part answer ${heard === 'question' ? 'on' : ''}`} onClick={() => { prepareAudio(); void play(question, false, 'question') }} aria-label={`Hear only the part to answer about (part 2): ${exercise.partLabels.question}`}>
              2 · {exercise.partLabels.question}
            </button>
          </div>
        )}

        {loadError && <p className="notice warn" role="alert">{loadError}</p>}

        <div className="tiles" role="group" aria-label="Choose the answer">
          {choices.map((item, i) => {
            const state = !checked
              ? item.id === picked ? 'selected' : 'idle'
              : item.id === question.item ? 'right' : item.id === picked ? 'wrong' : 'dim'
            return (
              <AnswerTile key={item.id} id={item.id} short={item.short} name={item.name} keyHint={i < 9 ? i + 1 : undefined} state={state} disabled={checked} onPick={() => choose(item.id)} />
            )
          })}
        </div>

        {checked && !quiz && (
          <div className="lesson-keys">
            <Keyboard
              range={level.lowRange}
              lit={(question.steps ? question.steps[step].notes : (question.lit ?? question.notes)).map((midi) => ({ midi, role: midi === (question.steps ? question.steps[step].notes[0] : question.root) ? 'first' : 'second' }))}
            />
            {question.steps && (
              <div className="chord-steps" role="group" aria-label="Chords of the progression">
                {question.steps.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chord-step"
                    aria-pressed={step === i}
                    onClick={() => {
                      prepareAudio()
                      stopSound()
                      setStep(i)
                      void playNotes(s.notes, { gap: 0, hold: 1.6 }).catch(() => {})
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <p className="hero-caption">{exercise.describe(question)}</p>
          </div>
        )}
      </div>

      {checked ? (
        <FeedbackBanner
          correct={correct}
          title={correct ? (quiz ? 'Correct!' : 'Nice ear!') : 'Not quite'}
          detail={
            quiz ? exercise.describe(question)
            : correct ? <>{exercise.phrase(truth)}</>
            : <>That was {exercise.phrase(truth)}. {exercise.hintLabel} {truth.hint}.</>
          }
          cta={index + 1 >= questions.length ? 'See results' : 'Continue'}
          onNext={next}
        />
      ) : (
        <footer className="lesson-foot">
          <div className="lesson-foot-in end">
            <button type="button" className="button primary big-btn" disabled={picked === null} onClick={check}>Check</button>
          </div>
        </footer>
      )}
    </div>
  )
}

function Complete({ exercise, level, attempts, save, seconds, onAgain }: { exercise: ExerciseDef; level: Level; attempts: AttemptPayload[]; save: SaveState; seconds: number; onAgain: () => void }) {
  const correct = attempts.filter((a) => a.correct).length
  const pass = isPassing(attempts.length, correct)
  const percent = Math.round((correct / attempts.length) * 100)
  const missed = new Map<string, number>()
  attempts.filter((a) => !a.correct).forEach((a) => missed.set(a.item, (missed.get(a.item) ?? 0) + 1))
  const hasNext = level.id < exercise.levels.length
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const speed = sessionSpeed(attempts)

  return (
    <div className="lesson">
      <LessonHeader done={attempts.length} total={attempts.length} combo={0} quitTo={`/learn/${exercise.id}`} />
      <div className="lesson-main complete">
        {pass && <Confetti />}
        <span className={`trophy ${pass ? '' : 'no'}`}><Trophy size={64} /></span>
        <div>
          <h1>{pass ? 'Level passed!' : 'Not yet'}</h1>
          <p className="complete-sub" style={{ marginTop: '0.5rem' }}>
            {exercise.name}, level {level.id}: {level.name}.{' '}
            {pass
              ? hasNext ? `Level ${level.id + 1} is open.` : `You have finished the whole ${exercise.name.toLowerCase()} roadmap.`
              : `You need ${PASS_ACCURACY * 100}% to move on. Try again while it is fresh.`}
          </p>
        </div>
        <div className="stats">
          <div className="stat acc"><span className="stat-label">Accuracy</span><span className="stat-value">{percent}%</span></div>
          <div className="stat time"><span className="stat-label">Time</span><span className="stat-value">{time}</span></div>
          <div className="stat qs"><span className="stat-label">Correct</span><span className="stat-value">{correct}/{attempts.length}</span></div>
        </div>
        {speed && (
          <p className="complete-speed">
            <strong>{formatSeconds(speed.average)}</strong> per answer on average.
            {speed.slowest.length > 0 && speed.slowest[0].ms > speed.average * 1.3 && (
              <> Slowest: {speed.slowest.filter((s) => s.ms > speed.average * 1.3).map((s) => `${getItem(exercise, s.item).short} (${formatSeconds(s.ms)})`).join(', ')}.</>
            )}
          </p>
        )}
        {missed.size > 0 && (
          <>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{exercise.kind === 'quiz' ? 'Worth another look' : 'Worth another listen'}</h2>
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
        <p className="quiet" role="status" style={{ margin: 0 }}>
          {save === 'saving' && 'Saving…'}
          {save === 'saved' && 'Saved to your progress.'}
          {save === 'queued' && 'Saved on this device. It will upload when the server is reachable.'}
        </p>
      </div>
      <footer className="lesson-foot">
        <div className="lesson-foot-in">
          <button type="button" className="button big-btn" onClick={onAgain}>Review lesson</button>
          <Link className="button primary big-btn" to={pass && hasNext ? `/practice/${exercise.id}/${level.id + 1}` : '/'}>
            {pass && hasNext ? `Go to level ${level.id + 1}` : 'Continue'}
          </Link>
        </div>
      </footer>
    </div>
  )
}
