import { describe, expect, it } from 'vitest'
import { CHARTS, judgeBar, schedule } from './playAlong'

// Independent: major-key chords as semitones above the tonic.
const CHORD: Record<string, number[]> = {
  I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 0], V: [7, 11, 2], vi: [9, 0, 4], iv: [5, 8, 0],
  I7: [0, 4, 7, 10], IV7: [5, 9, 0, 3], V7: [7, 11, 2, 5], ii7: [2, 5, 9, 0], Imaj7: [0, 4, 7, 11],
}
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b)

describe('play-along charts', () => {
  it('voices every chart in every key with the chords its numerals name, a bar of 4 beats each after a count-in', () => {
    for (const chart of CHARTS) {
      for (let key = 0; key < 12; key++) {
        const { bars, events } = schedule(chart.id, key, 90, 'basic', 2)
        expect(bars).toHaveLength(chart.bars.length * 2)
        bars.forEach((b, i) => {
          const numeral = chart.bars[i % chart.bars.length]
          expect(sorted(b.pcs), `${chart.id} ${key} ${numeral}`).toEqual(sorted(CHORD[numeral].map((x) => (x + key) % 12)))
          expect(b.root).toBe((CHORD[numeral][0] + key) % 12)
          expect(b.at).toBeCloseTo((i + 1) * 4 * (60 / 90), 6)
        })
        for (let i = 1; i < events.length; i++) expect(events[i].time).toBeGreaterThanOrEqual(events[i - 1].time)
      }
    }
  })

  it('counts in with four clicks and clicks every beat', () => {
    const { events, beatOf, barOf } = schedule('pop', 0, 120, 'click', 1)
    expect(events).toHaveLength(4 + 4 * 4)
    expect(barOf.slice(0, 4)).toEqual([-1, -1, -1, -1])
    expect(beatOf.slice(0, 8)).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
    expect(events.map((e) => e.time)).toEqual(events.map((_, i) => i * 0.5))
  })
})

describe('judging a bar', () => {
  const C = { pcs: [0, 4, 7], root: 0, third: 4 }
  const at = (t: number, ...midis: number[]) => midis.map((midi) => ({ midi, t }))
  it('is right on the beat, early or late a little, and missed outside the window', () => {
    expect(judgeBar(at(1000, 48, 64, 67, 72), C, 1000)).toEqual({ kind: 'right', offset: 0 })
    expect(judgeBar(at(1060, 60, 64, 67), C, 1000)).toEqual({ kind: 'right', offset: 60 })
    expect(judgeBar(at(880, 60, 64, 67), C, 1000)).toEqual({ kind: 'early', offset: -120 })
    expect(judgeBar(at(1200, 60, 64, 67), C, 1000)).toEqual({ kind: 'late', offset: 200 })
    expect(judgeBar(at(1300, 60, 64, 67), C, 1000)).toEqual({ kind: 'missed' })
    expect(judgeBar(at(800, 60, 64, 67), C, 1000)).toEqual({ kind: 'missed' })
    expect(judgeBar([], C, 1000)).toEqual({ kind: 'missed' })
  })
  it('allows the 5th to be left out and the bass a moment early, but not wrong notes or no 3rd', () => {
    expect(judgeBar(at(1000, 48, 64), C, 1000).kind).toBe('right')
    expect(judgeBar([...at(960, 36), ...at(1010, 64, 67, 72)], C, 1000)).toEqual({ kind: 'right', offset: -40 })
    expect(judgeBar(at(1000, 60, 63, 67), C, 1000).kind).toBe('wrong')
    expect(judgeBar(at(1000, 60, 67), C, 1000).kind).toBe('wrong')
    expect(judgeBar(at(1000, 60, 64, 67, 69), C, 1000).kind).toBe('wrong')
  })
})
