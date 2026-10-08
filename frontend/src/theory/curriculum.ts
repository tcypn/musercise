import type { ExerciseId } from './types'

export type ConceptKind = 'ear' | 'theory' | 'ear+theory' | 'play'

export interface Concept {
  id: string
  name: string
  kind: ConceptKind
  /** What you practise. */
  blurb: string
  /** Why it matters for playing pop, R&B, classical pieces and, later, jazz. */
  why: string
  /** Concepts worth learning first (ids). Advice, never a lock. */
  before?: readonly string[]
  /** Set when an exercise exists. Concepts without one show as "Coming soon". */
  exerciseId?: ExerciseId
  /** Mostly used in jazz: fine to leave until the basics are solid. */
  later?: boolean
}

export interface Stage {
  id: number
  name: string
  blurb: string
  concepts: readonly Concept[]
}

export const KIND_LABEL: Record<ConceptKind, string> = {
  ear: 'Ear training',
  theory: 'Theory quiz',
  'ear+theory': 'Ear and theory',
  play: 'Playing',
}

/** A short route through the map to accompanying a pop or R&B song. Advice only. */
export const SUGGESTED_ROUTE: readonly string[] = [
  'chord-quality',
  'scale-degrees',
  'diatonic-chords',
  'progressions',
  'slash-chords',
  'extensions',
  'comping',
]

export const STAGES: readonly Stage[] = [
  {
    id: 1,
    name: 'The keyboard and pitch',
    blurb: 'Know where every note lives, read it on the page, and hear the distance between two notes.',
    concepts: [
      { id: 'keyboard-map', name: 'Keyboard map and note names', kind: 'theory', blurb: 'Find any note by name on the keyboard: white and black keys, sharps and flats, octaves.', why: 'Every other topic talks about notes by name. Fast note-finding also makes learning pieces quicker.', exerciseId: 'note-names' },
      { id: 'staff', name: 'Reading the staff and clefs', kind: 'theory', blurb: 'Read notes on the treble and bass staves, including ledger lines.', why: 'Classical pieces and lead sheets are written on the staff. Reading lets you learn music without a video.', before: ['keyboard-map'] },
      { id: 'note-values', name: 'Note values and rests', kind: 'theory', blurb: 'Whole, half, quarter and eighth notes, dots, ties and rests.', why: 'This is how a page of music tells you when to play, not just what to play.', before: ['staff'] },
      { id: 'markings', name: 'Dynamics, articulation and tempo words', kind: 'theory', blurb: 'Words like piano, crescendo, staccato and allegro, and what each asks of your hands.', why: 'They turn correct notes into music, especially in classical pieces.', before: ['note-values'] },
      { id: 'intervals', name: 'Intervals', kind: 'ear', blurb: 'Hear two notes and name the distance between them, across all 88 keys.', why: 'Melodies are made of intervals and chords are stacks of them. Everything else builds on this.', exerciseId: 'intervals' },
      { id: 'note-naming', name: 'Naming a note by ear', kind: 'ear', blurb: 'Hear one note and say which note it is, with a reference note to lean on.', why: 'Very hard to master, but a strong ear for note names helps you find melodies quickly.', before: ['intervals', 'scale-degrees'] },
    ],
  },
  {
    id: 2,
    name: 'Keys and scales',
    blurb: 'Learn which notes belong together, so a song has a home and you know where you are in it.',
    concepts: [
      { id: 'major-scale', name: 'Major scale and key signatures', kind: 'theory', blurb: 'Build the major scale from its pattern of whole and half steps, and read the sharps and flats of each key.', why: 'Most pop and classical music lives in a major or minor key. The scale tells you which notes fit.', before: ['keyboard-map'], exerciseId: 'major-scale' },
      { id: 'circle-of-fifths', name: 'The circle of fifths', kind: 'theory', blurb: 'See how the 12 keys relate, and how key signatures grow by one sharp or flat at a time.', why: 'It shows which keys are close, which chords belong together, and how songs change key.', before: ['major-scale'] },
      { id: 'scale-degrees', name: 'Scale degrees', kind: 'ear', blurb: 'Hear a key, then a note, and say its number in the scale (1 to 7).', why: 'This is the core of playing by ear: you hear a melody as numbers, so you can play it in any key.', before: ['intervals', 'major-scale'], exerciseId: 'scale-degrees' },
      { id: 'minor-scales', name: 'Minor scales', kind: 'ear', blurb: 'Tell natural, harmonic and melodic minor apart, and hear how they differ from major.', why: 'Much of R&B, pop ballads and classical music is in minor keys.', before: ['major-scale'] , exerciseId: 'minor-scales' },
      { id: 'pentatonic', name: 'Pentatonic and blues scales', kind: 'ear', blurb: 'Hear and play the five-note scales that almost always sound good over a song.', why: 'The safest first tool for improvising, and the sound of many R&B and pop melodies.', before: ['major-scale'], exerciseId: 'pentatonic' },
      { id: 'modes', name: 'Modes', kind: 'ear', blurb: 'Hear the seven modes, such as Dorian and Mixolydian, as different flavours of one scale.', why: 'Used to colour an improvisation over one chord. More important in jazz, so it can wait.', before: ['minor-scales'], exerciseId: 'modes' },
    ],
  },
  {
    id: 3,
    name: 'Chords',
    blurb: 'Learn what chords are made of and hear the difference between them.',
    concepts: [
      { id: 'chord-quality', name: 'Chord quality', kind: 'ear', blurb: 'Hear a chord and name it: major, minor, diminished, augmented, suspended and seventh chords.', why: 'Knowing the flavour of each chord lets you pick out what a song is doing and choose chords that fit.', before: ['intervals'], exerciseId: 'chords' },
      { id: 'chord-spelling', name: 'Chord spelling and symbols', kind: 'theory', blurb: 'Spell any chord from its name (Fmaj7, Am7, Bdim) and read chord symbols.', why: 'Chord charts and lead sheets use these symbols. You will need them to play from any chart.', before: ['chord-quality', 'major-scale'], exerciseId: 'chord-spelling' },
      { id: 'slash-chords', name: 'Inversions and slash chords', kind: 'ear', blurb: 'Hear a chord with a different note in the bass, such as C/E or G/B.', why: 'Slash chords make bass lines walk smoothly. They are everywhere in pop and R&B.', before: ['chord-quality'] , exerciseId: 'slash-chords' },
      { id: 'diatonic-chords', name: 'Chords on each scale note', kind: 'theory', blurb: 'Build a chord on each note of a major scale and label them with Roman numerals (I, ii, iii, IV, V, vi, vii°).', why: 'This tells you which chords belong to a key, and why most songs use the same handful of them.', before: ['major-scale', 'chord-spelling'], exerciseId: 'diatonic-chords' },
      { id: 'extensions', name: '9ths, 6ths and added notes', kind: 'ear', blurb: 'Hear chords with notes added to the triad: 6ths, add9, maj9, m9, 9, m11 and 13.', why: 'These added notes give modern pop and R&B chords their rich sound.', before: ['chord-quality'], exerciseId: 'extensions' },
    ],
  },
  {
    id: 4,
    name: 'Harmony and progressions',
    blurb: 'Learn how chords follow each other, so you can hear where a song is going.',
    concepts: [
      { id: 'chord-function', name: 'Chord function', kind: 'ear', blurb: 'Hear which chords feel like home, which build tension, and which resolve it.', why: 'It explains why a progression feels the way it does, and helps you guess the next chord.', before: ['diatonic-chords', 'scale-degrees'], exerciseId: 'chord-function' },
      { id: 'progressions', name: 'Common progressions', kind: 'ear', blurb: 'Recognise progressions such as I-V-vi-IV, I-IV-V and vi-IV-I-V by ear.', why: 'A huge number of pop songs use a small set of progressions. Recognise them and you can play along fast.', before: ['diatonic-chords', 'chord-function'], exerciseId: 'progressions' },
      { id: 'nashville', name: 'Nashville numbers', kind: 'theory', blurb: 'Write a progression as numbers (1-5-6-4) so it works in any key.', why: 'Lets you learn a song once and play it in any key, and lets you share charts with other musicians.', before: ['diatonic-chords'] },
      { id: 'cadences', name: 'Cadences', kind: 'ear', blurb: 'Hear the endings of phrases: authentic (V-I), plagal (IV-I), half and deceptive.', why: 'Cadences are the punctuation of music, in classical pieces and in songs alike.', before: ['chord-function'] , exerciseId: 'cadences' },
      { id: 'modulation', name: 'Key changes', kind: 'ear', blurb: 'Hear when a song moves to a new key, such as a lift up a step for the last chorus.', why: 'You will meet key changes in pop songs, ballads and classical pieces. Hearing one lets you follow it.', before: ['progressions'] },
      { id: 'borrowed-chords', name: 'Borrowed and secondary chords', kind: 'ear', blurb: 'Hear chords that step outside the key, such as a minor iv in a major key or V/V.', why: 'They add colour to R&B and pop. Worth learning once the basic progressions are easy.', before: ['progressions'], later: true },
      { id: 'two-five-one', name: 'ii-V-I', kind: 'ear', blurb: 'Hear the classic jazz progression in major and minor keys.', why: 'The backbone of jazz harmony. Skip it for now if jazz is a later goal.', before: ['progressions', 'extensions'], exerciseId: 'two-five-one' },
    ],
  },
  {
    id: 5,
    name: 'Rhythm and song form',
    blurb: 'Learn to feel the beat and know where you are in a song.',
    concepts: [
      { id: 'meter', name: 'Meter and time signatures', kind: 'ear+theory', blurb: 'Feel and name 4/4, 3/4 and 6/8, and count them.', why: 'Every accompaniment pattern depends on the meter. It also decides how to count a classical piece.', before: ['note-values'] },
      { id: 'subdivisions', name: 'Subdivisions and syncopation', kind: 'ear', blurb: 'Hear and count eighths, sixteenths, triplets and off-beat accents.', why: 'Syncopation is what makes pop and R&B rhythms groove.', before: ['meter'] },
      { id: 'groove', name: 'Swing and groove feel', kind: 'ear', blurb: 'Tell straight, swung and shuffled feels apart.', why: 'The feel changes how a chord pattern should be played, especially in R&B and jazz.', before: ['subdivisions'] },
      { id: 'rhythm-dictation', name: 'Rhythm dictation', kind: 'ear', blurb: 'Hear a rhythm and write it down or tap it back.', why: 'Trains you to copy rhythms from songs exactly.', before: ['subdivisions'] },
      { id: 'song-form', name: 'Song structure', kind: 'ear+theory', blurb: 'Recognise verse, chorus, bridge, the 12-bar blues, AABA and turnarounds.', why: 'Knowing where you are in a song lets you prepare the next section instead of chasing it.', before: ['progressions'] },
      { id: 'classical-forms', name: 'Classical forms', kind: 'ear+theory', blurb: 'Recognise binary, ternary, theme and variations and sonata form.', why: 'Understanding a classical piece\'s shape makes it easier to learn and to play with meaning.', before: ['cadences'] },
    ],
  },
  {
    id: 6,
    name: 'Melody and improvisation',
    blurb: 'Use what you know to invent melodies over chords.',
    concepts: [
      { id: 'melodic-dictation', name: 'Melodic dictation', kind: 'ear', blurb: 'Hear a short melody and play it back on the keyboard.', why: 'Brings everything together: it is how you learn a tune without sheet music.', before: ['scale-degrees', 'intervals'] },
      { id: 'chord-tones', name: 'Chord tones and guide tones', kind: 'ear', blurb: 'Hear which melody notes belong to the chord underneath, especially the 3rd and 7th.', why: 'Landing on chord tones is what makes an improvised line sound like it fits.', before: ['chord-quality', 'progressions'] , exerciseId: 'chord-tones' },
      { id: 'scale-choice', name: 'Which scale over which chord', kind: 'ear+theory', blurb: 'Choose a scale that suits each chord and hear how it colours the sound.', why: 'The practical core of improvising: it tells you which notes are safe and which add tension.', before: ['pentatonic', 'diatonic-chords'] },
      { id: 'approach-notes', name: 'Approach notes and embellishments', kind: 'ear', blurb: 'Hear passing notes, neighbour notes and grace notes that decorate a melody.', why: 'These make a line flow instead of sounding like a scale going up and down.', before: ['chord-tones'] },
      { id: 'phrasing', name: 'Phrasing, licks and call-and-response', kind: 'ear', blurb: 'Hear a short phrase and answer it with your own.', why: 'This is how improvising turns into music: short ideas with shape, space and repetition.', before: ['pentatonic', 'chord-tones'] },
    ],
  },
  {
    id: 7,
    name: 'Accompaniment and playing',
    blurb: 'Put it under your hands: play chords, bass and patterns behind a song.',
    concepts: [
      { id: 'lead-sheets', name: 'Reading lead sheets and chord charts', kind: 'theory', blurb: 'Read a melody with chord symbols above it, and follow repeats and endings.', why: 'The most common way pop and jazz musicians share songs.', before: ['chord-spelling', 'staff'] },
      { id: 'comping', name: 'Comping rhythms and pads', kind: 'play', blurb: 'Play chords in rhythmic patterns: sustained pads, quarter-note stabs, off-beat hits.', why: 'The first thing you need to accompany a singer or a band.', before: ['chord-spelling', 'meter'] , exerciseId: 'comping' },
      { id: 'left-hand', name: 'Left-hand patterns', kind: 'play', blurb: 'Alberti bass, octaves and fifths, broken chords, and stride.', why: 'Classical pieces use them constantly, and they work as ready-made pop accompaniment.', before: ['chord-spelling'] },
      { id: 'bass-lines', name: 'Bass lines', kind: 'play', blurb: 'Play root, fifth and passing-note bass lines that lock in with the chords.', why: 'A good bass line makes simple chords sound full.', before: ['slash-chords', 'meter'] },
      { id: 'voice-leading', name: 'Voice leading', kind: 'play', blurb: 'Move from chord to chord by the smallest steps, keeping common notes.', why: 'The difference between blocky chord jumping and smooth professional-sounding accompaniment.', before: ['slash-chords', 'diatonic-chords'] },
      { id: 'transposition', name: 'Transposition', kind: 'theory', blurb: 'Play a song or progression in a different key.', why: 'Singers need songs in their own range. It is also the best test of whether you understand a song.', before: ['circle-of-fifths', 'nashville'] },
      { id: 'by-ear', name: 'Finding the chords of a song by ear', kind: 'ear', blurb: 'Listen to a song and work out its chords and key.', why: 'The goal of most of this map: hear a song, then play it.', before: ['progressions', 'scale-degrees', 'slash-chords'] , exerciseId: 'by-ear' },
    ],
  },
]

export const ALL_CONCEPTS: readonly Concept[] = STAGES.flatMap((s) => s.concepts)

export function getConcept(id: string | undefined): Concept | undefined {
  return ALL_CONCEPTS.find((c) => c.id === id)
}

export function stageOf(conceptId: string): Stage | undefined {
  return STAGES.find((s) => s.concepts.some((c) => c.id === conceptId))
}
