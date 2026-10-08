import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { mergeProgress } from '../../store/merge'
import { getCachedProgress, getPending } from '../../store/pending'
import { useGoal } from '../../store/useGoal'
import { GOALS, goalProgress, setActiveGoal } from '../../theory/goals'
import { Book, Close, Ear, PianoIcon, Steps, Target } from './Icons'

const ICON: Record<string, typeof Book> = { 'chord-sheet': Book, 'by-ear': Ear, accompany: PianoIcon, improvise: Steps }

/**
 * The goal, top left (like a course switcher): its name, a ✕ to clear it, and a panel that drops down to pick
 * another, with how far along the chosen goal is.
 */
export function GoalChip() {
  const goal = useGoal()
  const [open, setOpen] = useState(false)
  const chip = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  // Read when the panel opens, so the progress bar is current.
  const progress = useMemo(() => (open ? mergeProgress(getCachedProgress(), getPending()) : null), [open])
  const shown = goal ?? GOALS[0]
  const p = progress ? goalProgress(shown, progress) : null

  const close = () => {
    setOpen(false)
    chip.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('button, a')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const Icon = goal ? ICON[goal.id] : Target
  return (
    <div className="goal-chip-wrap">
      <div className={`goal-chip ${goal ? 'set' : ''}`}>
        <button ref={chip} type="button" className="goal-chip-main" aria-expanded={open} aria-controls="goal-panel" onClick={() => setOpen((o) => !o)}>
          <Icon size={22} />
          <span className="goal-chip-name">{goal ? goal.name : 'Choose a goal'}</span>
        </button>
        {goal && (
          <button type="button" className="goal-chip-clear" aria-label={`Remove the goal ${goal.name}`} onClick={() => { setActiveGoal(null); setOpen(false) }}>
            <Close size={16} />
          </button>
        )}
      </div>
      {open && (
        <>
          <div className="goal-backdrop" onClick={close} />
          <div ref={panel} id="goal-panel" className="goal-panel" role="dialog" aria-label="Choose a goal">
            <div className="goal-tiles">
              {GOALS.map((g) => {
                const TileIcon = ICON[g.id]
                return (
                  <button key={g.id} type="button" className={`goal-tile ${goal?.id === g.id ? 'active' : ''}`} aria-pressed={goal?.id === g.id} onClick={() => { setActiveGoal(g.id); close() }}>
                    <span className="goal-tile-icon"><TileIcon size={30} /></span>
                    <span className="goal-tile-name">{g.short}</span>
                  </button>
                )
              })}
            </div>
            {p && (
              <div className="goal-summary">
                <strong>{goal ? shown.name : 'Pick a goal and the path shows only its lessons'}</strong>
                {goal && <p className="quiet">{shown.why}</p>}
                {goal && (
                  <>
                    <div className="goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done} aria-label="Lessons done">
                      <span style={{ width: `${Math.round((p.done / p.total) * 100)}%` }} />
                    </div>
                    <p className="quiet">{p.done} of {p.total} lessons done</p>
                  </>
                )}
                <Link to="/goals" className="goal-more" onClick={() => setOpen(false)}>More about {goal ? 'this goal' : 'the goals'}</Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
