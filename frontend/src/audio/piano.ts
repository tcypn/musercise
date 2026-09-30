import type * as ToneNamespace from 'tone'
import type { TimedEvent } from '../theory/practice'
import type { PlayStyle } from '../theory/types'

type ToneModule = typeof ToneNamespace

// Salamander Grand Piano, recorded at every minor third; Tone.Sampler
// pitch-shifts the nearest recording to cover all 88 keys (A0–C8).
const SAMPLE_URLS: Record<string, string> = { A0: 'A0.mp3', C8: 'C8.mp3' }
for (let octave = 1; octave <= 7; octave++) {
  SAMPLE_URLS[`C${octave}`] = `C${octave}.mp3`
  SAMPLE_URLS[`D#${octave}`] = `Ds${octave}.mp3`
  SAMPLE_URLS[`F#${octave}`] = `Fs${octave}.mp3`
  SAMPLE_URLS[`A${octave}`] = `A${octave}.mp3`
}

/** Start loading the library and the samples now (for example while a lesson's intro is on screen), so the first tap has nothing to wait for. */
export function warmUp(): void {
  loadPiano().catch(() => {})
}

/**
 * Call this first thing in a tap or click handler, before any waiting. Phones (iPhones especially) only let
 * sound start from inside the tap itself, not after a download has finished, and they keep the ringer switch
 * from silencing music apps when the page asks for "playback" audio.
 */
export function prepareAudio(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  } catch {
    // not supported: nothing to do
  }
  if (toneModule) void toneModule.start().catch(() => {})
  else warmUp()
}

/** True when the browser is holding the sound back (it has not allowed the audio clock to run). */
export function soundBlocked(): boolean {
  return toneModule !== null && toneModule.getContext().state !== 'running'
}

/** Seconds a note takes to die away after it is released. Short, so a cut-off never leaves a long tail. */
const RELEASE = 0.12
/** Seconds to fade everything out before a stop, so stopping does not click. */
const FADE = 0.03
/**
 * Tone hands notes to the audio clock a little ahead of time, so a note can already be queued when a stop
 * arrives and still start a moment later. The output stays muted for this long after a stop to catch it.
 */
const SETTLE = 0.2

interface Engine {
  tone: ToneModule
  sampler: ToneNamespace.Sampler
  /** Everything the piano plays goes through here, so it can be faded out in one go. */
  master: ToneNamespace.Gain
}

let loading: Promise<Engine> | null = null
/** Set as soon as the Tone library has loaded, so a tap can unlock sound without waiting for anything. */
let toneModule: ToneModule | null = null

/**
 * Loads Tone.js and the piano samples once. This does not start the audio clock: phones only allow that from
 * inside a tap, so `prepareAudio` does it at the start of each tap handler, and playback starts it again if needed.
 */
export function loadPiano() {
  if (!loading) {
    loading = (async () => {
      const tone = await import('tone')
      toneModule = tone
      const master = new tone.Gain(1).toDestination()
      const sampler = await new Promise<ToneNamespace.Sampler>((resolve, reject) => {
        const s: ToneNamespace.Sampler = new tone.Sampler({
          urls: SAMPLE_URLS,
          baseUrl: `${import.meta.env.BASE_URL}samples/`,
          release: RELEASE,
          onload: () => resolve(s),
          onerror: (e) => reject(e),
        }).connect(master)
      })
      return { tone, sampler, master }
    })().catch((error) => {
      loading = null // allow a retry after a failed load
      throw error
    })
  }
  return loading
}

export interface SequenceHandle {
  /** Resolves when the sequence has finished or been stopped. */
  done: Promise<void>
  stop: () => void
}

const INERT: SequenceHandle = { done: Promise.resolve(), stop: () => {} }

/** The one playback that may be sounding. A new playback or a stop always ends it first. */
let active: SequenceHandle | null = null
/** Bumped by every new playback and every stop, so a playback still waiting to start can tell it was overtaken. */
let epoch = 0
/** Audio-clock time until which a fade-out is still in progress; the next playback starts after it. */
let silentUntil = 0

/**
 * Fades everything out and releases it. Pending notes are removed separately, from the transport.
 * Uses the real audio clock (`immediate`): Tone's own `now()` runs a little ahead, which would start the fade late.
 */
function silence({ tone, sampler, master }: Engine) {
  const now = tone.immediate()
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(0, now + FADE)
  sampler.releaseAll(now + FADE)
  // Stays muted until the next playback raises it again, just before its first note (see playSequence).
  silentUntil = now + FADE + SETTLE
}

/** Stops whatever is playing, right now, and cancels notes that have not sounded yet. Safe to call at any time. */
export function stopSound(): void {
  epoch++
  active?.stop()
}

/**
 * Plays timed notes (seconds from the start). `onEvent` is called with the index of the event that
 * is sounding right now, kept in step with the audio, and with null when it ends.
 * Starting a playback ends the previous one, so two never overlap.
 */
export async function playSequence(events: readonly TimedEvent[], onEvent?: (index: number | null) => void): Promise<SequenceHandle> {
  const mine = ++epoch
  active?.stop()
  const piano = await loadPiano()
  const { tone, sampler } = piano
  // A phone that has not allowed sound may never answer this: wait a moment, then carry on so the page can say so.
  if (tone.getContext().state !== 'running') await Promise.race([tone.start(), new Promise<void>((resolve) => setTimeout(resolve, 1500))])
  if (mine !== epoch) return INERT // stopped, or replaced by a newer playback, while the piano was loading

  const transport = tone.getTransport()
  const draw = tone.getDraw()
  transport.stop()
  transport.cancel()

  let finished = false
  let resolve!: () => void
  const done = new Promise<void>((r) => {
    resolve = r
  })
  const finish = (cut: boolean) => {
    if (finished) return
    finished = true
    if (active === handle) active = null
    transport.stop()
    transport.cancel()
    if (cut) silence(piano)
    onEvent?.(null)
    resolve()
  }
  const handle: SequenceHandle = { done, stop: () => finish(true) }
  active = handle

  // If a fade-out is still running, start after it so the new notes are not swallowed.
  const lead = 0.05 + Math.max(0, silentUntil - tone.now())
  piano.master.gain.setValueAtTime(1, tone.now() + lead - 0.01)
  events.forEach((event, index) => {
    transport.schedule((time) => {
      sampler.triggerAttackRelease(event.notes.map((n) => tone.Frequency(n, 'midi').toNote()), event.hold, time)
      draw.schedule(() => {
        if (!finished) onEvent?.(index)
      }, time)
    }, event.time + lead)
  })
  const end = Math.max(0, ...events.map((e) => e.time + e.hold)) + lead + 0.1
  transport.schedule((time) => draw.schedule(() => finish(false), time), end)
  transport.start()
  return handle
}

/**
 * Plays any number of notes. `gap` is the time between note starts (0 plays them together);
 * every note rings for `hold` seconds. Resolves once the last note has finished ringing, or as
 * soon as it is stopped.
 */
export async function playNotes(notes: readonly number[], style: PlayStyle): Promise<void> {
  const handle = await playSequence(notes.map((midi, i) => ({ time: i * style.gap, hold: style.hold, notes: [midi] })))
  await handle.done
}
