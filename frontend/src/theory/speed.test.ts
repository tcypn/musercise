import { describe, expect, it } from 'vitest'
import type { AttemptPayload } from '../api/types'
import { seconds, sessionSpeed, speedView } from './speed'

const attempt = (item: string, ms: number): AttemptPayload => ({ root_midi: 60, item, mode: 'block', answered: item, correct: true, response_ms: ms })

describe('seconds', () => {
  it('shows one decimal', () => {
    expect(seconds(3200)).toBe('3.2 s')
    expect(seconds(1000)).toBe('1.0 s')
    expect(seconds(12040)).toBe('12.0 s')
  })
})

describe('session speed', () => {
  it('averages every answer and lists the slowest answers first', () => {
    const view = sessionSpeed([attempt('maj', 2000), attempt('maj', 4000), attempt('min', 9000), attempt('dim', 1000)])!
    expect(view.average).toBe(4000)
    expect(view.slowest.map((s) => s.item)).toEqual(['min', 'maj', 'dim'])
    expect(view.slowest[1]).toMatchObject({ item: 'maj', ms: 3000, count: 2 })
  })

  it('caps an answer left open, so one pause does not decide the session', () => {
    const view = sessionSpeed([attempt('maj', 2000), attempt('maj', 900_000)])!
    expect(view.average).toBe(16000) // (2000 + 30000) / 2
  })

  it('shows at most the top three and nothing for an empty session', () => {
    expect(sessionSpeed([attempt('a', 1), attempt('b', 2), attempt('c', 3), attempt('d', 4)])!.slowest).toHaveLength(3)
    expect(sessionSpeed([])).toBeNull()
  })
})

describe('slow answers', () => {
  const row = (item: string, ms: number | null, asked = 10) => ({ item, asked, median_ms: ms })

  it('flags answers clearly slower than the learner\'s own typical time', () => {
    const view = speedView([row('C', 2000), row('D', 2200), row('E', 2400), row('Ab', 7000), row('Db', 6500)])
    expect(view.typical).toBe(2400)
    expect(view.slow).toEqual(['Ab', 'Db'])
  })

  it('does not flag when everything is about as fast', () => {
    expect(speedView([row('a', 4000), row('b', 4200), row('c', 4600), row('d', 5200)]).slow).toEqual([])
  })

  it('needs a gap of at least two seconds, however quick the typical time is', () => {
    expect(speedView([row('a', 800), row('b', 900), row('c', 1000), row('d', 2500)]).slow).toEqual([])
  })

  it('ignores answers asked too few times, and says nothing without enough data', () => {
    expect(speedView([row('a', 2000), row('b', 2000), row('c', 2000), row('d', 9000, 2)]).slow).toEqual([])
    expect(speedView([row('a', 2000), row('b', 9000)])).toEqual({ typical: null, slow: [] })
    expect(speedView([row('a', null), row('b', null), row('c', null)])).toEqual({ typical: null, slow: [] })
  })
})
