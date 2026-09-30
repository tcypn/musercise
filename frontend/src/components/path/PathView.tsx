import { Link } from 'react-router-dom'
import type { NodeState, PathNode, PathStage } from '../../theory/path'
import { Book, CheckBold, Ear, Lock } from '../dash/Icons'

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

function NodeIcon({ state }: { state: NodeState }) {
  if (state === 'done') return <CheckBold size={32} />
  if (state === 'locked' || state === 'soon') return <Lock size={28} />
  return <Ear size={state === 'current' ? 38 : 32} />
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
      <span className={`node-face ${node.state}`}>
        <NodeIcon state={node.state} />
      </span>
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
  onOpen: (id: number) => void
}

export function PathView({ stages, openId, onOpen }: Props) {
  return (
    <div className="path-view">
      {stages.map((s) => {
        const open = s.stage.id === openId
        return (
          <section key={s.stage.id} className={`stage-block ${open ? 'open' : 'closed'}`} aria-labelledby={`stage-${s.stage.id}`}>
            {open ? (
              <header className="stage-banner">
                <div>
                  <p className="stage-eyebrow">
                    Stage {s.stage.id} · {s.ready === 0 ? 'coming soon' : `${s.ready} of ${s.total} lessons ready`}
                  </p>
                  <h2 id={`stage-${s.stage.id}`}>{s.stage.name}</h2>
                </div>
                <Link to="/map" className="guide-btn" aria-label={`Open the map to read about stage ${s.stage.id}`}>
                  <Book size={24} />
                </Link>
              </header>
            ) : (
              <header className="stage-card">
                <div>
                  <p className="stage-eyebrow">
                    Stage {s.stage.id} · {s.ready === 0 ? 'coming soon' : `${s.ready} of ${s.total} lessons ready`}
                  </p>
                  <h2 id={`stage-${s.stage.id}`}>{s.stage.name}</h2>
                </div>
                <button type="button" className="button" onClick={() => onOpen(s.stage.id)} aria-label={`Show stage ${s.stage.id}: ${s.stage.name}`}>
                  Jump here?
                </button>
              </header>
            )}
            {open && <Nodes nodes={s.nodes} />}
          </section>
        )
      })}
    </div>
  )
}
