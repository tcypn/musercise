import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'

/** A song typed in by the learner: its chord chart and how they like to play it. Kept on this device only. */
export interface Song {
  id: string
  title: string
  /** The chart as typed: "[Verse] C G/B | Am F". */
  chart: string
  /** The song's key as written, set by hand; null means use the guess from its chords. */
  key: number | null
  /** Half steps up (or down) from the written key, to suit a voice. */
  transpose: number
  updated: string
}

const KEY = 'musercise.songs'
let songs: Song[] = readJson<Song[]>(KEY, [])
const listeners = new Set<() => void>()

function commit(next: Song[]) {
  songs = next
  writeJson(KEY, songs)
  listeners.forEach((l) => l())
}

export const getSongs = () => songs
export const getSong = (id: string | undefined) => songs.find((s) => s.id === id)

export function saveSong(song: Song) {
  const stamped = { ...song, updated: new Date().toISOString() }
  commit(songs.some((s) => s.id === song.id) ? songs.map((s) => (s.id === song.id ? stamped : s)) : [stamped, ...songs])
}

export function deleteSong(id: string) {
  commit(songs.filter((s) => s.id !== id))
}

export function newSong(title = 'New song', chart = ''): Song {
  const song: Song = { id: crypto.randomUUID().slice(0, 8), title, chart, key: null, transpose: 0, updated: new Date().toISOString() }
  saveSong(song)
  return song
}

export const EXAMPLE_CHART = '[Intro] C | G | Am | F\n[Verse] C G/B | Am F | C G | F\n[Chorus] F | G | Am | F C/E\n[Ending] Dm7 G7 | Cmaj7'

/** All songs, newest first, kept up to date when one is saved or deleted. */
export function useSongs(): Song[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    getSongs,
    getSongs,
  )
}
