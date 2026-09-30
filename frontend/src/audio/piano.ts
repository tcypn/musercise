import type * as ToneNamespace from 'tone'
import type { Mode } from '../theory/roadmap'

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

const GAP_S = 0.9 // time between the two notes of a melodic interval
const HOLD_S = 1.6 // how long each melodic note rings
const HARMONIC_HOLD_S = 2.4

let loading: Promise<{ tone: ToneModule; sampler: ToneNamespace.Sampler }> | null = null

/** Loads Tone.js and the piano samples once. Call from a click so the AudioContext may start. */
export function loadPiano() {
  if (!loading) {
    loading = (async () => {
      const tone = await import('tone')
      await tone.start()
      const sampler = await new Promise<ToneNamespace.Sampler>((resolve, reject) => {
        const s: ToneNamespace.Sampler = new tone.Sampler({
          urls: SAMPLE_URLS,
          baseUrl: `${import.meta.env.BASE_URL}samples/`,
          release: 1,
          onload: () => resolve(s),
          onerror: (e) => reject(e),
        }).toDestination()
      })
      return { tone, sampler }
    })().catch((error) => {
      loading = null // allow a retry after a failed load
      throw error
    })
  }
  return loading
}

/** Plays the notes in order (or together) and resolves after they have finished ringing. */
export async function playNotes(notes: readonly [number, number], mode: Mode): Promise<void> {
  const { tone, sampler } = await loadPiano()
  await tone.start()
  sampler.releaseAll()
  const name = (midi: number) => tone.Frequency(midi, 'midi').toNote()
  const start = tone.now() + 0.05
  if (mode === 'harmonic') {
    sampler.triggerAttackRelease([name(notes[0]), name(notes[1])], HARMONIC_HOLD_S, start)
    await wait(HARMONIC_HOLD_S * 1000)
  } else {
    sampler.triggerAttackRelease(name(notes[0]), HOLD_S, start)
    sampler.triggerAttackRelease(name(notes[1]), HOLD_S, start + GAP_S)
    await wait((GAP_S + HOLD_S) * 1000)
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
