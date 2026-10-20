import { describe, expect, it } from 'vitest'
import { matchesTarget, yourTurnTarget } from './yourTurn'
import type { Question } from './types'

const q = (extra: Partial<Question>): Question => ({ root: 60, item: 'x', mode: 'major', notes: [60, 64, 67], ...extra })

describe('your turn', () => {
  it('asks for the step shown, or the lit keys, or the notes', () => {
    expect(yourTurnTarget(q({}), 0)).toEqual([60, 64, 67])
    expect(yourTurnTarget(q({ lit: [62, 65] }), 0)).toEqual([62, 65])
    const steps = [{ label: 'C', notes: [48, 60, 64, 67] }, { label: 'F', notes: [53, 60, 65, 69] }]
    expect(yourTurnTarget(q({ steps }), 1)).toEqual([53, 60, 65, 69])
    expect(yourTurnTarget(q({ steps }), 5)).toEqual([53, 60, 65, 69])
  })

  it('accepts the same notes in any octave, order or doubling, and nothing else', () => {
    expect(matchesTarget([64, 67, 72], [60, 64, 67])).toBe(true)
    expect(matchesTarget([36, 48, 52, 55, 60], [60, 64, 67])).toBe(true)
    expect(matchesTarget([60, 63, 67], [60, 64, 67])).toBe(false)
    expect(matchesTarget([60, 64], [60, 64, 67])).toBe(false)
    expect(matchesTarget([60, 64, 67, 70], [60, 64, 67])).toBe(false)
    expect(matchesTarget([], [60])).toBe(false)
  })
})
