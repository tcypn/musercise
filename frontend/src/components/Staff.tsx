import { BOTTOM_STEP } from '../theory/staffLayout'
import type { StaffItem, StaffSpec } from '../theory/types'

const GAP = 8 // between staff lines
const BOTTOM = 52 // y of the bottom line
const TOP = BOTTOM - 4 * GAP
const SPACING = 26

/** Where a step sits: 4 units per step, lines on even offsets from the bottom line. */
const yOf = (step: number, bottom: number) => BOTTOM - (step - bottom) * (GAP / 2)

function ledgers(step: number, bottom: number): number[] {
  const out: number[] = []
  for (let s = bottom - 2; s >= step; s -= 2) out.push(s)
  for (let s = bottom + 10; s <= step; s += 2) out.push(s)
  return out
}

function Note({ item, x, bottom, nextX }: { item: Extract<StaffItem, { kind: 'note' }>; x: number; bottom: number; nextX: number }) {
  const y = yOf(item.step, bottom)
  const open = item.value === 'whole' || item.value === 'half'
  const up = item.step < bottom + 4
  const stemX = up ? x + 4.4 : x - 4.4
  const stemEnd = up ? y - 26 : y + 26
  const flags = item.value === 'eighth' ? 1 : item.value === 'sixteenth' ? 2 : 0
  const onLine = (item.step - bottom) % 2 === 0
  return (
    <g className="staff-note">
      {ledgers(item.step, bottom).map((s) => <line key={s} x1={x - 8} x2={x + 8} y1={yOf(s, bottom)} y2={yOf(s, bottom)} className="staff-line" />)}
      {item.accidental && <text x={x - 15} y={y + 4.5} className="staff-acc">{item.accidental > 0 ? '♯' : '♭'}</text>}
      <ellipse cx={x} cy={y} rx={item.value === 'whole' ? 5.6 : 4.8} ry={3.6} transform={item.value === 'whole' ? undefined : `rotate(-20 ${x} ${y})`} className={open ? 'staff-head open' : 'staff-head'} />
      {item.value !== 'whole' && <line x1={stemX} x2={stemX} y1={y} y2={stemEnd} className="staff-stem" />}
      {Array.from({ length: flags }, (_, i) => {
        const sy = stemEnd + (up ? i * 6 : -i * 6)
        return <path key={i} d={up ? `M${stemX} ${sy} q 7 5 6 13` : `M${stemX} ${sy} q 7 -5 6 -13`} className="staff-flag" />
      })}
      {item.dot && <circle cx={x + 9} cy={onLine ? y - 2.5 : y} r={1.6} className="staff-dot" />}
      {item.tieToNext && <path d={`M${x + 4} ${y + 5} Q ${(x + nextX) / 2} ${y + 13} ${nextX - 4} ${y + 5}`} className="staff-tie" />}
    </g>
  )
}

function Rest({ item, x }: { item: Extract<StaffItem, { kind: 'rest' }>; x: number }) {
  const mid = BOTTOM - 2 * GAP
  let shape
  switch (item.value) {
    case 'whole': shape = <rect x={x - 5} y={TOP + GAP} width={10} height={4} className="staff-fill" />; break
    case 'half': shape = <rect x={x - 5} y={mid - 4} width={10} height={4} className="staff-fill" />; break
    case 'quarter': shape = <path d={`M${x - 2} ${mid - 13} l 5 6 l -4 5 l 5 6 q -6 -2 -3 6`} className="staff-rest" />; break
    case 'eighth': shape = <g><circle cx={x - 3} cy={mid - 4} r={2.2} className="staff-fill" /><path d={`M${x - 3} ${mid - 3} q 4 1 7 -3 l -6 16`} className="staff-rest" /></g>; break
    default: shape = <g><circle cx={x - 3} cy={mid - 4} r={2.2} className="staff-fill" /><circle cx={x - 5} cy={mid + 3} r={2.2} className="staff-fill" /><path d={`M${x - 3} ${mid - 3} q 4 1 7 -3 l -8 22 M${x - 5} ${mid + 4} q 4 1 7 -3`} className="staff-rest" /></g>
  }
  return <g>{shape}{item.dot && <circle cx={x + 9} cy={mid - 2} r={1.6} className="staff-dot" />}</g>
}

/** A short staff: five lines, a clef, and a few notes or rests. Drawn simply, for reading one thing at a time. */
export function Staff({ spec, label }: { spec: StaffSpec; label: string }) {
  const bottom = BOTTOM_STEP[spec.clef]
  const x0 = spec.clef === 'none' ? 18 : 40
  const xs = spec.items.map((_, i) => x0 + i * SPACING)
  const width = x0 + spec.items.length * SPACING + 4
  return (
    <svg className="staff" viewBox={`0 -6 ${width} 86`} role="img" aria-label={label}>
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={2} x2={width - 2} y1={BOTTOM - i * GAP} y2={BOTTOM - i * GAP} className="staff-line" />)}
      {spec.clef === 'treble' && <text x={3} y={BOTTOM + 7} className="staff-clef treble">𝄞</text>}
      {spec.clef === 'bass' && <text x={4} y={BOTTOM - 3} className="staff-clef bass">𝄢</text>}
      {spec.items.map((item, i) => item.kind === 'note'
        ? <Note key={i} item={item} x={xs[i]} bottom={bottom} nextX={xs[i + 1] ?? xs[i] + SPACING} />
        : <Rest key={i} item={item} x={xs[i]} />)}
      {spec.barEnd && <line x1={width - 3} x2={width - 3} y1={TOP} y2={BOTTOM} className="staff-line bar" />}
    </svg>
  )
}
