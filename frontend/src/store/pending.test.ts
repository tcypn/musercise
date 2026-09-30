import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionPayload } from '../api/types'
import { addPending, flushPending, getPending, getRejected, requeueRejected } from './pending'

function fakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const session = (id: string): SessionPayload => ({
  client_id: id, exercise: 'chords', level: 1, started_at: '2026-09-30T10:00:00Z', ended_at: '2026-09-30T10:05:00Z',
  attempts: [{ root_midi: 60, item: 'maj', mode: 'block', answered: 'maj', correct: true, response_ms: 500 }],
})

function respond(...statuses: number[]) {
  const fetchMock = vi.fn()
  statuses.forEach((status) =>
    fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => ({}) }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage({ 'musercise.settings': JSON.stringify({ apiUrl: 'https://api.test', token: 't' }) }))
})
afterEach(() => vi.unstubAllGlobals())

describe('offline queue', () => {
  it('uploads queued sessions in order and empties the queue', async () => {
    addPending(session('a'))
    addPending(session('b'))
    const fetchMock = respond(201, 200)
    expect(await flushPending()).toEqual({ remaining: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getPending()).toEqual([])
  })

  it('keeps everything when the server cannot be reached', async () => {
    addPending(session('a'))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const result = await flushPending()
    expect(result.remaining).toBe(1)
    expect(result.error).toMatch(/cannot reach/i)
    expect(getPending()).toHaveLength(1)
  })

  it('parks a session the server refuses instead of deleting it, and carries on with the rest', async () => {
    addPending(session('bad'))
    addPending(session('good'))
    respond(400, 201)
    expect(await flushPending()).toEqual({ remaining: 0 })
    expect(getPending()).toEqual([])
    expect(getRejected().map((s) => s.client_id)).toEqual(['bad'])
  })

  it('can send parked sessions again once the server is fixed', async () => {
    addPending(session('bad'))
    respond(400)
    await flushPending()
    expect(requeueRejected()).toBe(1)
    expect(getRejected()).toEqual([])
    respond(201)
    expect(await flushPending()).toEqual({ remaining: 0 })
    expect(getPending()).toEqual([])
  })

  it('does not try to upload when no server is set up', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    addPending(session('a'))
    const fetchMock = respond()
    expect(await flushPending()).toEqual({ remaining: 1 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
