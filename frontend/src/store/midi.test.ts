import { describe, expect, it } from 'vitest'
import { createMidi, type MidiAccessLike, type MidiInputLike } from './midi'

function fakePiano(names: string[]) {
  const inputs: MidiInputLike[] = names.map((name, i) => ({ id: `in${i}`, name, state: 'connected', onmidimessage: null }))
  const access: MidiAccessLike = { inputs: { forEach: (cb) => inputs.forEach(cb) }, onstatechange: null }
  const send = (i: number, ...bytes: number[]) => inputs[i].onmidimessage?.({ data: new Uint8Array(bytes) })
  return { inputs, access, send }
}

describe('MIDI piano', () => {
  it('says so when the browser has no Web MIDI', () => {
    expect(createMidi(undefined, false).getState().status).toBe('unsupported')
  })

  it('keeps the keys held down: note on, note off, and note on with velocity 0', async () => {
    const p = fakePiano(['CLP-845'])
    const m = createMidi({ requestMIDIAccess: async () => p.access }, false)
    await m.connect()
    expect(m.getState()).toMatchObject({ status: 'connected', names: ['CLP-845'] })
    p.send(0, 0x90, 64, 80)
    p.send(0, 0x90, 60, 70)
    p.send(0, 0x91, 67, 50) // any channel
    expect(m.getState().held).toEqual([60, 64, 67])
    p.send(0, 0x80, 64, 0)
    p.send(0, 0x90, 60, 0)
    expect(m.getState().held).toEqual([67])
    p.send(0, 0xb0, 64, 127) // the sustain pedal is not a key
    expect(m.getState().held).toEqual([67])
  })

  it('listens to every input, and forgets an unplugged one', async () => {
    const p = fakePiano(['CLP-845', 'Pad'])
    const m = createMidi({ requestMIDIAccess: async () => p.access }, false)
    await m.connect()
    p.send(0, 0x90, 60, 80)
    p.send(1, 0x90, 72, 80)
    expect(m.getState().held).toEqual([60, 72])
    p.inputs[1].state = 'disconnected'
    p.access.onstatechange!()
    expect(m.getState()).toMatchObject({ status: 'connected', names: ['CLP-845'], held: [60] })
    p.inputs[0].state = 'disconnected'
    p.access.onstatechange!()
    expect(m.getState()).toMatchObject({ status: 'waiting', held: [] })
  })

  it('reports a refused permission, and turns off on disconnect', async () => {
    const m = createMidi({ requestMIDIAccess: async () => { throw new Error('no') } }, false)
    await m.connect()
    expect(m.getState().status).toBe('denied')
    const p = fakePiano(['CLP-845'])
    const n = createMidi({ requestMIDIAccess: async () => p.access }, false)
    await n.connect()
    n.disconnect()
    expect(n.getState()).toMatchObject({ status: 'off', held: [] })
    expect(p.inputs[0].onmidimessage).toBeNull()
  })

  it('tells listeners about every key going down, with the time', async () => {
    const p = fakePiano(['CLP-845'])
    let clock = 1000
    const m = createMidi({ requestMIDIAccess: async () => p.access }, false, () => clock)
    await m.connect()
    const heard: [number, number][] = []
    const stop = m.onNote((n, t) => heard.push([n, t]))
    p.send(0, 0x90, 60, 80)
    clock = 1012
    p.send(0, 0x90, 64, 80)
    p.send(0, 0x80, 60, 0) // a key going up is not news
    p.send(0, 0x90, 67, 0)
    stop()
    p.send(0, 0x90, 72, 80)
    expect(heard).toEqual([[60, 1000], [64, 1012]])
  })
})
