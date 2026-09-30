import { memo } from 'react'
import { HIGHEST_MIDI, LOWEST_MIDI, isBlackKey, noteName } from '../theory/notes'

const WHITE_W = 10
const BLACK_W = 6.2
const WHITE_H = 64
const BLACK_H = 40

interface Key {
  midi: number
  x: number
  black: boolean
}

// Built once: white keys sit on a 10-unit grid, black keys straddle the gap before their neighbour.
const KEYS: Key[] = []
let whiteCount = 0
for (let midi = LOWEST_MIDI; midi <= HIGHEST_MIDI; midi++) {
  if (isBlackKey(midi)) KEYS.push({ midi, x: whiteCount * WHITE_W - BLACK_W / 2, black: true })
  else KEYS.push({ midi, x: whiteCount++ * WHITE_W, black: false })
}
const WHITE_KEYS = KEYS.filter((k) => !k.black)
const BLACK_KEYS = KEYS.filter((k) => k.black)
const WIDTH = whiteCount * WHITE_W

export interface LitKey {
  midi: number
  /** `first` is the note heard first; `second` is the other one. */
  role: 'first' | 'second'
}

interface Props {
  /** The playable register: keys outside it are dimmed. */
  range?: readonly [number, number]
  lit?: readonly LitKey[]
}

function KeyboardImpl({ range = [LOWEST_MIDI, HIGHEST_MIDI], lit = [] }: Props) {
  const roleOf = new Map(lit.map((k) => [k.midi, k.role]))
  const keyClass = (k: Key) => {
    const role = roleOf.get(k.midi)
    const inRange = k.midi >= range[0] && k.midi <= range[1]
    return ['key', k.black ? 'black' : 'white', role ? `lit-${role}` : '', inRange ? '' : 'out'].filter(Boolean).join(' ')
  }
  const label = lit.length
    ? `Piano keyboard with ${lit.map((k) => noteName(k.midi)).join(' and ')} highlighted`
    : 'Piano keyboard, 88 keys'

  return (
    <svg className="keyboard" viewBox={`0 0 ${WIDTH} ${WHITE_H}`} role="img" aria-label={label} preserveAspectRatio="none">
      {WHITE_KEYS.map((k) => (
        <rect key={k.midi} className={keyClass(k)} x={k.x + 0.25} y={0} width={WHITE_W - 0.5} height={WHITE_H} rx={1.2} />
      ))}
      {BLACK_KEYS.map((k) => (
        <rect key={k.midi} className={keyClass(k)} x={k.x} y={0} width={BLACK_W} height={BLACK_H} rx={1} />
      ))}
    </svg>
  )
}

export const Keyboard = memo(KeyboardImpl)
