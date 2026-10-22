import { CHORD_TYPES, type ChordSym } from './chart'

/** The right hand's home: from the F below middle C to the F above it. */
export const ZONE: readonly [number, number] = [53, 65]
/** Named by the chord tone at the bottom of the right hand, in half steps above the root. */
const BOTTOM: Record<number, string> = { 0: 'root position', 2: '9th at the bottom', 3: '1st inversion', 4: '1st inversion', 5: '4th at the bottom', 6: '2nd inversion', 7: '2nd inversion', 8: '2nd inversion', 9: '6th at the bottom', 10: '3rd inversion', 11: '3rd inversion' }

export interface ZoneVoicing {
  /** Right hand, lowest first, all inside the zone. */
  right: number[]
  /** Left hand: the bass (the root, or the slash note), low. */
  left: number
  /** Which chord tone is at the bottom of the right hand. */
  inversion: string
}

/**
 * The chord in the right hand inside the zone: the close position whose notes all fit, nearest the middle of the
 * zone when more than one does. Five-note chords leave out the 5th so they fit. The left hand takes the bass.
 */
export function zoneVoicing(c: ChordSym, zone: readonly [number, number] = ZONE): ZoneVoicing {
  let tones = CHORD_TYPES[c.type].stack.map((s) => (c.rootPc + s) % 12)
  if (tones.length > 4) tones = tones.filter((_, i) => i !== 2) // drop the 5th of a 9th chord
  // In pitch order above the root, so each turn of the circle is a real inversion (9ths sit just above the root).
  const unique = [...new Set(tones)].sort((a, b) => ((a - c.rootPc + 12) % 12) - ((b - c.rootPc + 12) % 12))
  const fits: { right: number[] }[] = []
  unique.forEach((_, inv) => {
    const order = [...unique.slice(inv), ...unique.slice(0, inv)]
    const right: number[] = []
    for (const pc of order) {
      let m = right.length ? right[right.length - 1] + 1 : zone[0]
      while (m % 12 !== pc) m++
      right.push(m)
    }
    if (right[right.length - 1] <= zone[1]) fits.push({ right })
  })
  const middle = (zone[0] + zone[1]) / 2
  const centre = (r: number[]) => Math.abs(r.reduce((a, b) => a + b, 0) / r.length - middle)
  const best = fits.sort((a, b) => centre(a.right) - centre(b.right))[0] ?? { right: unique.map((pc, i) => 48 + pc + (i ? 12 : 0)).sort((a, b) => a - b) }
  const bassPc = c.bassPc ?? c.rootPc
  return { right: best.right, left: 36 + bassPc, inversion: BOTTOM[(best.right[0] - c.rootPc + 120) % 12] }
}
