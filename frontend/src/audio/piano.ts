import type * as ToneNamespace from 'tone'
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

/**
 * Plays any number of notes. `gap` is the time between note starts (0 plays them together);
 * every note rings for `hold` seconds. Resolves once the last note has finished ringing.
 */
export async function playNotes(notes: readonly number[], style: PlayStyle): Promise<void> {
  const { tone, sampler } = await loadPiano()
  await tone.start()
  sampler.releaseAll()
  const start = tone.now() + 0.05
  notes.forEach((midi, i) => {
    sampler.triggerAttackRelease(tone.Frequency(midi, 'midi').toNote(), style.hold, start + i * style.gap)
  })
  await wait(((notes.length - 1) * style.gap + style.hold) * 1000)
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
