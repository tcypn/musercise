import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { NodeState, PathNode, PathStage } from '../../theory/path'
import { Book, CheckBold, Chevron, Ear, Lock } from '../dash/Icons'

/** Vertical distance between node centres, and the room above the first node. */
const PITCH = 118
const TOP = 52

const STATE_WORD: Record<NodeState, string> = {
  done: 'passed',
  current: 'start here',
  open: 'open',
  locked: 'locked, pass the level before it first',
  soon: '',
}

/** A rounded 12-point star, the shape of a lesson's last-level badge. */
const BADGE = (() => {
  const pts: string[] = []
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 48 : 41
    const a = (Math.PI * i) / 12 - Math.PI / 2
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join(' L')} Z`
})()

function NodeIcon({ state }: { state: NodeState }) {
  if (state === 'done') return <CheckBold size={34} />
  if (state === 'locked' || state === 'soon') return <Lock size={30} />
  return <Ear size={state === 'current' ? 42 : 34} />
}

function NodeBody({ node }: { node: PathNode }) {
  const ring = node.state === 'current' ? (node.ring ?? 0) : null
  return (
    <>
      {ring !== null && (
        <svg className="node-ring" width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
          <circle cx="55" cy="55" r="50" className="node-ring-track" />
          <circle cx="55" cy="55" r="50" className="node-ring-fill" strokeDasharray={`${Math.max(ring, 0.02) * 314} 999`} transform="rotate(-90 55 55)" />
        </svg>
      )}
      {node.badge !== undefined ? (
        <span className={`node-badge ${node.state}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true"><path d={BADGE} /></svg>
          <span className="node-badge-num">{node.badge}</span>
        </span>
      ) : (
        <span className={`node-face ${node.state}`}>
          <NodeIcon state={node.state} />
        </span>
      )}
    </>
  )
}

function Connector({ from, to, index, done }: { from: PathNode; to: PathNode; index: number; done: boolean }) {
  const y1 = TOP + index * PITCH
  const y2 = y1 + PITCH
  const mid = PITCH / 2
  return (
    <path
      d={`M${from.offset} ${y1} C${from.offset} ${y1 + mid} ${to.offset} ${y2 - mid} ${to.offset} ${y2}`}
      className={done ? 'path-line done' : 'path-line'}
    />
  )
}

function Nodes({ nodes }: { nodes: PathNode[] }) {
  const height = TOP + (nodes.length - 1) * PITCH + 92
  return (
    <div className="path" style={{ height }}>
      <svg className="path-lines" width="100%" height={height} aria-hidden="true">
        <svg x="50%" y="0" overflow="visible">
          {nodes.slice(0, -1).map((n, i) => (
            <Connector key={n.id} from={n} to={nodes[i + 1]} index={i} done={n.state === 'done' && nodes[i + 1].state !== 'locked' && nodes[i + 1].state !== 'soon'} />
          ))}
        </svg>
      </svg>
      <ol className="path-nodes" aria-label="Lessons">
        {nodes.map((node, i) => {
          const label = node.state === 'soon' ? node.name : `${node.name} — ${STATE_WORD[node.state]}`
          const style = { top: TOP + i * PITCH, ['--dx' as string]: `${node.offset}px` }
          return (
            <li key={node.id} className={`path-node ${node.state}`} style={style}>
              {node.state === 'current' && <span className={`start-bubble ${node.offset > 0 ? 'left' : 'right'}`} aria-hidden="true">Start</span>}
              {node.to ? (
                <Link to={node.to} className="node-link" aria-label={label}>
                  <NodeBody node={node} />
                </Link>
              ) : (
                <button type="button" className="node-link" disabled aria-label={label}>
                  <NodeBody node={node} />
                </button>
              )}
              <span className="node-caption" aria-hidden="true">{node.caption}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

interface Props {
  stages: PathStage[]
  openId: number
  /** Show another stage (from the stage list or "Jump here"). */
  onOpen: (id: number) => void
}

/**
 * One stage at a time, like a Duolingo section: a sticky banner that names the lesson you are scrolling through,
 * each lesson's levels ending in its numbered badge, a divider before the next lesson, and "Up next" at the bottom.
 */
export function PathView({ stages, openId, onOpen }: Props) {
  const index = Math.max(0, stages.findIndex((s) => s.stage.id === openId))
  const s = stages[index]
  const next = stages[index + 1]
  const [unit, setUnit] = useState(0)
  const [listOpen, setListOpen] = useState(false)
  const banner = useRef<HTMLElement>(null)
  const units = useRef<(HTMLDivElement | null)[]>([])

  // The banner names the lesson whose part of the path is under it.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line = (banner.current?.getBoundingClientRect().bottom ?? 0) + 8
      let current = 0
      units.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) current = i
      })
      setUnit(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [openId])

  useEffect(() => {
    if (!listOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setListOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listOpen])

  if (!s) return null
  const lessons = s.lessons
  const shown = lessons[Math.min(unit, lessons.length - 1)]
  const show = (id: number) => {
    setListOpen(false)
    onOpen(id)
    requestAnimationFrame(() => document.querySelector('.path-view')?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  return (
    <div className="path-view">
      <section className="stage-block open" aria-labelledby={`stage-${s.stage.id}`}>
        <header ref={banner} className="stage-banner">
          <button type="button" className="stage-title" aria-expanded={listOpen} aria-controls="stage-list" onClick={() => setListOpen((o) => !o)}>
            <span className="stage-eyebrow">
              Stage {s.stage.id}{shown?.number !== undefined ? `, lesson ${shown.number}` : ''}
            </span>
            <h2 id={`stage-${s.stage.id}`}>{shown?.number !== undefined ? shown.name : s.stage.name}</h2>
          </button>
          <Link to="/map" className="guide-btn" aria-label={`Guidebook: open the map to read about stage ${s.stage.id}`}>
            <Book size={24} />
            <span className="guide-text" aria-hidden="true">Guidebook</span>
          </Link>
          {listOpen && (
            <>
              <div className="goal-backdrop" onClick={() => setListOpen(false)} />
              <div id="stage-list" className="goal-panel stage-list" role="dialog" aria-label="Stages">
                <ol>
                  {stages.map((st) => (
                    <li key={st.stage.id}>
                      <button type="button" className={`stage-pick ${st.stage.id === s.stage.id ? 'active' : ''}`} onClick={() => show(st.stage.id)}>
                        <span className="stage-pick-main">
                          <span className="stage-eyebrow">Stage {st.stage.id}{st.finished ? ' · finished' : ''}</span>
                          <strong>{st.stage.name}</strong>
                        </span>
                        <span className="quiet">{st.ready === 0 ? 'coming soon' : `${st.ready} of ${st.total} ready`}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </header>

        {lessons.map((lesson, i) => (
          <div key={lesson.id} className="path-unit" ref={(el) => void (units.current[i] = el)}>
            {i > 0 && (
              <div className="unit-divider" aria-hidden={lesson.number === undefined}>
                <span>{lesson.number !== undefined ? lesson.name : 'Coming soon'}</span>
              </div>
            )}
            <Nodes nodes={lesson.nodes} />
          </div>
        ))}
      </section>

      {next && (
        <section className="up-next" aria-labelledby="up-next-title">
          <span className="up-next-tag">Up next</span>
          <h2 id="up-next-title">
            {next.ready === 0 && <Lock size={26} />} Stage {next.stage.id}: {next.stage.name}
          </h2>
          <p>{next.stage.blurb}</p>
          <button type="button" className="button" onClick={() => show(next.stage.id)}>
            Jump here? <Chevron size={18} />
          </button>
        </section>
      )}
    </div>
  )
}
