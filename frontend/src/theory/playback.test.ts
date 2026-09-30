import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { canSlow, eventsFor, partOf } from './playback'
import { buildQuestions } from './questions'

const events = [
  { time: 0, hold: 0.9, notes: [48, 52, 55] },
  { time: 0.75, hold: 0.9, notes: [48, 53, 57] },
  { time: 3.0, hold: 2.4, notes: [60] },
]

describe('the two parts of a question', () => {
  it('plays everything by default', () => {
    expect(partOf(events, 2, 'all')).toEqual(events)
  })

  it('plays only the key: everything before the part you answer about', () => {
    expect(partOf(events, 2, 'key')).toEqual(events.slice(0, 2))
  })

  it('plays only the part you answer about, starting at once', () => {
    expect(partOf(events, 2, 'question')).toEqual([{ time: 0, hold: 2.4, notes: [60] }])
  })

  it('leaves questions without a key alone', () => {
    expect(partOf(events, undefined, 'question')).toEqual(events)
  })
})

describe.each(['scale-degrees', 'chord-function'] as const)('%s plays a key first, then the question', (id) => {
  const lesson = EXERCISES[id]
  const qs = lesson.levels.flatMap((level) => buildQuestions(lesson, level, 30, () => 0.37))

  it('marks the last event as the one to answer about, after a clear pause', () => {
    for (const q of qs) {
      expect(q.answerFrom).toBe(q.events!.length - 1)
      const key = q.events!.slice(0, q.answerFrom)
      const end = Math.max(...key.map((e) => e.time + e.hold))
      expect(q.events![q.answerFrom!].time - end, id).toBeGreaterThanOrEqual(0.85)
    }
  })

  it('can replay just the question, and just the key, and each is shorter than the whole', () => {
    for (const q of qs.slice(0, 40)) {
      const all = eventsFor(lesson, q)
      const key = eventsFor(lesson, q, false, 'key')
      const only = eventsFor(lesson, q, false, 'question')
      expect(key.length + only.length).toBe(all.length)
      expect(only).toHaveLength(1)
      expect(only[0].time).toBe(0)
      expect(only[0].notes).toEqual(all[all.length - 1].notes)
    }
  })

  it('stretches each part for a slow replay', () => {
    const q = qs[0]
    const key = eventsFor(lesson, q, false, 'key')
    const slowKey = eventsFor(lesson, q, true, 'key')
    expect(slowKey[slowKey.length - 1].time).toBeGreaterThan(key[key.length - 1].time)
    expect(canSlow(lesson, q)).toBe(true)
  })

  it('names the two parts for the screen', () => {
    expect(lesson.partLabels?.key).toBe('The key')
    expect(lesson.partLabels?.question).toMatch(/^Name this (note|chord)$/)
  })
})
