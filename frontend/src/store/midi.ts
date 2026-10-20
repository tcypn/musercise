import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'

/**
 * A digital piano connected over USB MIDI (Web MIDI: Chrome and Edge; not Safari or iPad).
 * Keeps the keys held down right now, from every input at once.
 */

export type MidiStatus = 'unsupported' | 'off' | 'asking' | 'denied' | 'waiting' | 'connected'

export interface MidiState {
  status: MidiStatus
  /** The connected inputs' names ("CLP-845"), when connected. */
  names: string[]
  /** MIDI note numbers held down now, lowest first. */
  held: number[]
}

/** The small part of the Web MIDI API used here, so tests can pass a fake. */
export interface MidiInputLike {
  id: string
  name?: string | null
  state?: string
  onmidimessage: ((e: { data: Uint8Array | null }) => void) | null
}
export interface MidiAccessLike {
  inputs: { forEach(cb: (input: MidiInputLike) => void): void }
  onstatechange: (() => void) | null
}
export interface MidiHost {
  requestMIDIAccess?: () => Promise<MidiAccessLike>
}

const KEY = 'musercise.midi'

export function createMidi(host: MidiHost | undefined, remember = true) {
  const supported = !!host?.requestMIDIAccess
  let state: MidiState = { status: supported ? 'off' : 'unsupported', names: [], held: [] }
  let access: MidiAccessLike | null = null
  /** Held notes per input, so unplugging one clears only its notes. */
  const heldBy = new Map<string, Set<number>>()
  const listeners = new Set<() => void>()

  const set = (next: Partial<MidiState>) => {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const heldNow = () => [...new Set([...heldBy.values()].flatMap((s) => [...s]))].sort((a, b) => a - b)

  function onMessage(id: string, data: Uint8Array | null) {
    if (!data || data.length < 3) return
    const kind = data[0] & 0xf0
    const note = data[1]
    const notes = heldBy.get(id) ?? new Set<number>()
    if (kind === 0x90 && data[2] > 0) notes.add(note)
    else if (kind === 0x80 || kind === 0x90) notes.delete(note)
    else return
    heldBy.set(id, notes)
    set({ held: heldNow() })
  }

  /** Listen to every connected input; called again whenever something is plugged in or out. */
  function attach() {
    if (!access) return
    const live: MidiInputLike[] = []
    access.inputs.forEach((input) => {
      if (input.state && input.state !== 'connected') return
      live.push(input)
      input.onmidimessage = (e) => onMessage(input.id, e.data)
    })
    for (const id of [...heldBy.keys()]) if (!live.some((i) => i.id === id)) heldBy.delete(id)
    set({ status: live.length ? 'connected' : 'waiting', names: live.map((i) => i.name || 'MIDI keyboard'), held: heldNow() })
  }

  async function connect() {
    if (!supported) return
    set({ status: 'asking' })
    try {
      access = await host!.requestMIDIAccess!()
      access.onstatechange = attach
      if (remember) writeJson(KEY, true)
      attach()
    } catch {
      set({ status: 'denied' })
    }
  }

  function disconnect() {
    if (access) {
      access.inputs.forEach((input) => { input.onmidimessage = null })
      access.onstatechange = null
    }
    access = null
    heldBy.clear()
    if (remember) writeJson(KEY, false)
    set({ status: supported ? 'off' : 'unsupported', names: [], held: [] })
  }

  return {
    connect,
    disconnect,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** Reconnect on start if the learner connected before on this device. */
    resume() {
      if (supported && state.status === 'off' && readJson(KEY, false)) void connect()
    },
  }
}

const host = typeof navigator === 'undefined' ? undefined : (navigator as unknown as MidiHost)
export const midi = createMidi(host?.requestMIDIAccess ? { requestMIDIAccess: () => host.requestMIDIAccess!.call(navigator) } : undefined)

/** The piano's state, kept up to date as keys go down and up. */
export function useMidi(): MidiState {
  return useSyncExternalStore(midi.subscribe, midi.getState, midi.getState)
}
