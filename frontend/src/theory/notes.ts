/** MIDI numbers: 21 (A0) is the lowest piano key, 108 (C8) the highest. */
export const LOWEST_MIDI = 21
export const HIGHEST_MIDI = 108

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function noteName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12)
}
