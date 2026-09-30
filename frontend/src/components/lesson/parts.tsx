import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flame, Close as CloseIcon } from '../dash/Icons'

interface HeaderProps {
  /** Answers checked so far, out of the session length. */
  done: number
  total: number
  /** Correct answers in a row. */
  combo: number
  quitTo: string
  /** Ask before leaving when this returns text. */
  confirmQuit?: string
}

export function LessonHeader({ done, total, combo, quitTo, confirmQuit }: HeaderProps) {
  return (
    <div className="lesson-top">
      <Link
        to={quitTo}
        className="lesson-x"
        aria-label="Quit lesson"
        onClick={(e) => {
          if (confirmQuit && !window.confirm(confirmQuit)) e.preventDefault()
        }}
      >
        <CloseIcon size={28} />
      </Link>
      <div className="lesson-bar" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="lesson-bar-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <div className="lesson-combo" aria-label={`${combo} correct in a row`}>
        <Flame size={26} className={combo === 0 ? 'd-flame off' : 'd-flame'} />
        <span>{combo}</span>
      </div>
    </div>
  )
}

interface TileProps {
  short: string
  name: string
  /** 1 to 9 on the keyboard. */
  keyHint?: number
  state: 'idle' | 'selected' | 'right' | 'wrong' | 'dim'
  disabled: boolean
  onPick: () => void
  id: string
}

export function AnswerTile({ short, name, keyHint, state, disabled, onPick, id }: TileProps) {
  return (
    <button type="button" data-tile={id} className={`tile ${state === 'idle' ? '' : state}`} aria-pressed={state === 'selected'} disabled={disabled} onClick={onPick}>
      {keyHint !== undefined && <span className="tile-key" aria-hidden="true">{keyHint}</span>}
      <span className="tile-short">{short}</span>
      <span className="tile-name">{name}</span>
      {state === 'right' && <span className="tile-mark"><Check size={22} title="Correct answer" /></span>}
      {state === 'wrong' && <span className="tile-mark"><CloseIcon size={22} title="Your answer" /></span>}
    </button>
  )
}

interface BannerProps {
  correct: boolean
  title: string
  detail: ReactNode
  cta: string
  onNext: () => void
}

/** The strip that slides up after Check: green when right, red when wrong. */
export function FeedbackBanner({ correct, title, detail, cta, onNext }: BannerProps) {
  return (
    <footer className={`lesson-foot slide ${correct ? 'right' : 'wrong'}`} role="status" aria-live="polite">
      <div className="lesson-foot-in">
        <div className="verdict-row">
          <span className="verdict-badge">{correct ? <Check size={36} /> : <CloseIcon size={36} />}</span>
          <div>
            <h2 className="verdict-title">{title}</h2>
            <p className="verdict-detail">{detail}</p>
          </div>
        </div>
        <button type="button" className={`button big-btn ${correct ? 'primary' : 'danger'}`} onClick={onNext} autoFocus>
          {cta}
        </button>
      </div>
    </footer>
  )
}

const CONFETTI = ['#ffc800', '#58cc02', '#1cb0f6', '#ff4b4b', '#a560e8']
/** A few falling pieces for a passed level. Hidden for people who asked for less motion. */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 6) * 0.35}s`, animationDuration: `${2.2 + (i % 4) * 0.4}s` }} />
      ))}
    </div>
  )
}
