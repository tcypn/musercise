/**
 * What each published version changed, newest first. Versions are x.y.z: x for a big change (accounts, say),
 * y for every publish that adds a lesson or feature, z for a publish that only fixes something.
 */
export interface Version {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: readonly Version[] = [
  { version: '1.20.0', date: '2026-10-07', changes: ['New lesson: modes (Dorian first)'] },
  { version: '1.19.0', date: '2026-10-06', changes: ['New lesson: minor scales'] },
  { version: '1.18.0', date: '2026-10-06', changes: ['New lesson: finding the chords by ear, with song-like loops'] },
  { version: '1.17.0', date: '2026-10-06', changes: ['New lesson: ii-V-I'] },
  { version: '1.16.0', date: '2026-10-06', changes: ['App version in Settings, with this list of what each version changed'] },
  { version: '1.15.0', date: '2026-10-06', changes: ['New lesson: chord tones and guide tones'] },
  { version: '1.14.0', date: '2026-10-06', changes: ['New lesson: inversions and slash chords'] },
  { version: '1.13.0', date: '2026-10-06', changes: ['New lesson: cadences'] },
  { version: '1.12.0', date: '2026-10-06', changes: ['New lesson: pentatonic scale'] },
  { version: '1.11.0', date: '2026-10-06', changes: ['New lesson: chord spelling and symbols'] },
  { version: '1.10.0', date: '2026-10-04', changes: ['Practise your mistakes: a short session on the answers you mix up'] },
  { version: '1.9.0', date: '2026-10-04', changes: ['Listen first: hear every answer of a level before you start', 'After a wrong answer, hear yours next to the correct one'] },
  { version: '1.8.1', date: '2026-10-01', changes: ['Every chord of a progression is shown after the answer', 'Pick the lesson from a list on Home'] },
  { version: '1.8.0', date: '2026-10-01', changes: ['New lesson: common progressions', 'Speed tracking: how long each answer takes'] },
  { version: '1.7.1', date: '2026-09-30', changes: ['Fix: no sound on phones', 'The two parts of a key-first question are clearer'] },
  { version: '1.7.0', date: '2026-09-30', changes: ['New lessons: chords on each scale note, chord function'] },
  { version: '1.6.0', date: '2026-09-30', changes: ['New lessons: keyboard map and note names, major scale and key signatures'] },
  { version: '1.5.0', date: '2026-09-30', changes: ['New lessons: scale degrees; 9ths, 6ths and added notes'] },
  { version: '1.4.1', date: '2026-09-30', changes: ['Fix: sounds never overlap, and the piano stops when you move on'] },
  { version: '1.4.0', date: '2026-09-30', changes: ['New look: lesson path, check-and-continue lessons, menu and streak page'] },
  { version: '1.3.1', date: '2026-09-30', changes: ['Fix: blank page after updating from an older version'] },
  { version: '1.3.0', date: '2026-09-30', changes: ['Home dashboard'] },
  { version: '1.2.0', date: '2026-09-30', changes: ['Daily practice'] },
  { version: '1.1.0', date: '2026-09-30', changes: ['The map of everything to learn', 'New lesson: chord quality'] },
  { version: '1.0.0', date: '2026-09-30', changes: ['First version: the intervals lesson, with progress saved to your server'] },
]

export const APP_VERSION = CHANGELOG[0].version
