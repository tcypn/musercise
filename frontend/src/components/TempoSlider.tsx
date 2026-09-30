interface Props {
  bpm: number
  onChange: (bpm: number) => void
}

export const MIN_BPM = 40
export const MAX_BPM = 120

export function TempoSlider({ bpm, onChange }: Props) {
  return (
    <label className="tempo">
      <span className="tempo-label">
        Playback tempo <output>{bpm} beats per minute</output>
      </span>
      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        step={5}
        value={bpm}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Playback tempo in beats per minute"
      />
    </label>
  )
}
