import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A stand-in for Tone.js: it records what is scheduled, so the tests can check what would be heard. */
const fake = vi.hoisted(() => {
  const state = {
    now: 10,
    scheduled: [] as { time: number; cb: (t: number) => void }[],
    played: [] as { notes: string[]; hold: number; time: number }[],
    cancels: 0,
    stops: 0,
    starts: 0,
    releaseAll: [] as (number | undefined)[],
    gainCalls: [] as string[],
    contextState: 'running',
    toneStarts: 0,
  }
  return state
})

vi.mock('tone', () => {
  class Param {
    value = 1
    cancelScheduledValues() { fake.gainCalls.push('cancel') }
    setValueAtTime(v: number, t: number) { fake.gainCalls.push(`set ${v} @${(t - fake.now).toFixed(3)}`) }
    linearRampToValueAtTime(v: number, t: number) { fake.gainCalls.push(`ramp ${v} @${(t - fake.now).toFixed(3)}`) }
  }
  class Gain {
    gain = new Param()
    toDestination() { return this }
  }
  class Sampler {
    constructor(opts: { onload: () => void }) { queueMicrotask(opts.onload) }
    connect() { return this }
    triggerAttackRelease(notes: string[], hold: number, time: number) { fake.played.push({ notes, hold, time }) }
    releaseAll(t?: number) { fake.releaseAll.push(t) }
  }
  const transport = {
    schedule: (cb: (t: number) => void, time: number) => fake.scheduled.push({ time, cb }),
    cancel: () => { fake.cancels++; fake.scheduled.length = 0 },
    stop: () => { fake.stops++ },
    start: () => { fake.starts++ },
  }
  const draw = { schedule: (cb: () => void) => cb() }
  return {
    start: async () => { fake.toneStarts++ },
    now: () => fake.now,
    immediate: () => fake.now,
    getContext: () => ({ state: fake.contextState }),
    getTransport: () => transport,
    getDraw: () => draw,
    Frequency: (midi: number) => ({ toNote: () => `n${midi}` }),
    Gain,
    Sampler,
  }
})

import { loadPiano, playNotes, playSequence, stopSound } from './piano'

/** Plays every scheduled callback whose time has come, as the transport would. */
function runTransportUntil(time: number) {
  fake.scheduled.filter((e) => e.time <= time).sort((a, b) => a.time - b.time).forEach((e) => e.cb(fake.now + e.time))
}

beforeEach(async () => {
  await loadPiano()
  stopSound()
  Object.assign(fake, { scheduled: [], played: [], cancels: 0, stops: 0, starts: 0, releaseAll: [], gainCalls: [], contextState: 'running', toneStarts: 0 })
  fake.now += 100 // any earlier fade-out is long over
})

describe('piano playback', () => {
  it('schedules one note per event on the transport, spaced by the gap', async () => {
    void playNotes([60, 64], { gap: 0.5, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    const times = fake.scheduled.map((e) => e.time).sort((a, b) => a - b)
    expect(times[1] - times[0]).toBeCloseTo(0.5)
    runTransportUntil(0.6)
    expect(fake.played.map((p) => p.notes)).toEqual([['n60'], ['n64']])
  })

  it('plays notes together when the gap is zero', async () => {
    void playNotes([60, 64, 67], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    runTransportUntil(0.06)
    expect(fake.played).toHaveLength(3)
  })

  it('stopSound removes notes that have not sounded yet and releases the ones that have', async () => {
    const done = playNotes([60, 64], { gap: 0.5, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    runTransportUntil(0.06) // first note sounds
    stopSound()
    expect(fake.scheduled).toHaveLength(0) // the second note is gone
    expect(fake.cancels).toBeGreaterThan(0)
    expect(fake.releaseAll.length).toBe(1)
    expect(fake.gainCalls.some((c) => c.startsWith('ramp 0'))).toBe(true)
    await expect(done).resolves.toBeUndefined() // the caller is not left hanging
    expect(fake.played).toHaveLength(1)
  })

  it('a new playback ends the old one first', async () => {
    const first = playNotes([60, 64], { gap: 0.5, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    runTransportUntil(0.06)
    const second = playNotes([72], { gap: 0, hold: 1 })
    await first // resolved because it was replaced
    await vi.waitFor(() => expect(fake.starts).toBe(2))
    expect(fake.releaseAll.length).toBe(1)
    runTransportUntil(5)
    // the old second note (64) never sounds; the new note does
    expect(fake.played.map((p) => p.notes[0])).toEqual(['n60', 'n72'])
    stopSound()
    await second
  })

  it('waits for a fade-out in progress before the next notes', async () => {
    void playNotes([60], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    stopSound() // fade-out begins at the current clock time
    void playNotes([62], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(2))
    const first = Math.min(...fake.scheduled.map((e) => e.time))
    expect(first).toBeGreaterThan(0.15) // after the fade and release
  })

  it('stays muted after a stop until the next playback is about to sound', async () => {
    void playNotes([60], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    stopSound()
    expect(fake.gainCalls.filter((c) => c.startsWith('set 1') && !c.endsWith('@0.000'))).toEqual(['set 1 @0.040']) // only the first playback's own raise; the stop adds none
    fake.gainCalls.length = 0
    void playNotes([62], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(2))
    const raise = fake.gainCalls.find((c) => c.startsWith('set 1'))!
    const at = Number(raise.split('@')[1])
    expect(at).toBeGreaterThan(0.2) // after the settle time, just before the first note
    expect(at).toBeLessThan(Math.min(...fake.scheduled.map((e) => e.time)))
  })

  it('does nothing if stopped while the piano is still loading', async () => {
    const pending = playNotes([60], { gap: 0, hold: 1 })
    stopSound()
    await pending
    expect(fake.starts).toBe(0)
    expect(fake.played).toHaveLength(0)
  })

  it('stopping with nothing playing is harmless', () => {
    expect(() => { stopSound(); stopSound() }).not.toThrow()
  })

  it('calls onEvent with the sounding index, then null when it ends', async () => {
    const seen: (number | null)[] = []
    const handle = await playSequence([{ time: 0, hold: 0.3, notes: [60] }, { time: 0.5, hold: 0.3, notes: [62] }], (i) => seen.push(i))
    runTransportUntil(5)
    await handle.done
    expect(seen).toEqual([0, 1, null])
  })

  it('does not ask the context to start again when it is already running', async () => {
    void playNotes([60], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    expect(fake.toneStarts).toBe(0)
    stopSound()
  })

  it('resumes a suspended context', async () => {
    fake.contextState = 'suspended'
    void playNotes([60], { gap: 0, hold: 1 })
    await vi.waitFor(() => expect(fake.starts).toBe(1))
    expect(fake.toneStarts).toBe(1)
    stopSound()
  })
})
