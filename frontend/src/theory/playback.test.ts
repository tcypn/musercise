import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { canSlow, eventsFor, partOf, questionOffsetMs, soundingAt } from './playback'
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

describe('answer timing', () => {
  it('starts counting when the part you answer about begins, not when the key starts', () => {
    expect(questionOffsetMs({ root: 60, item: 'x', mode: 'major', notes: [60], events, answerFrom: 2 })).toBe(3150)
  })

  it('counts from the start for questions that are only the sound', () => {
    expect(questionOffsetMs({ root: 60, item: 'x', mode: 'ascending', notes: [60, 64] })).toBe(0)
  })
})

describe('soundingAt', () => {
  it('shows the notes just struck and the ones still ringing, like a left hand moving under a held chord', () => {
    const events = [
      { time: 0, hold: 2, notes: [60, 64, 67] }, // right hand holds C E G
      { time: 0, hold: 0.5, notes: [36] }, // left hand C
      { time: 0.5, hold: 0.5, notes: [43] }, // left hand G
      { time: 1, hold: 0.5, notes: [48] }, // left hand C, an octave up
      { time: 2, hold: 1, notes: [55, 59, 62] }, // next chord: the held one has stopped
    ]
    expect(soundingAt(events, 1)).toEqual([{ midi: 60, role: 'first' }, { midi: 64, role: 'first' }, { midi: 67, role: 'first' }, { midi: 36, role: 'first' }])
    expect(soundingAt(events, 2)).toEqual([{ midi: 43, role: 'first' }, { midi: 60, role: 'second' }, { midi: 64, role: 'second' }, { midi: 67, role: 'second' }])
    expect(soundingAt(events, 4)).toEqual([{ midi: 55, role: 'first' }, { midi: 59, role: 'first' }, { midi: 62, role: 'first' }])
  })
})
