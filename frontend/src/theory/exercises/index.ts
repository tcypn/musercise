import type { ExerciseDef, ExerciseId, Item, Level } from '../types'
import { approachNotesExercise } from './approachNotes'
import { bassLinesExercise } from './bassLines'
import { borrowedChordsExercise } from './borrowedChords'
import { byEarExercise } from './byEar'
import { cadencesExercise } from './cadences'
import { chordFunctionExercise } from './chordFunction'
import { circleOfFifthsExercise } from './circleOfFifths'
import { compingExercise } from './comping'
import { chordsExercise } from './chords'
import { chordTonesExercise } from './chordTones'
import { chordSpellingExercise } from './chordSpelling'
import { diatonicChordsExercise } from './diatonicChords'
import { extensionsExercise } from './extensions'
import { intervalsExercise } from './intervals'
import { leadSheetsExercise } from './leadSheets'
import { leftHandExercise } from './leftHand'
import { majorScaleExercise } from './majorScale'
import { minorScalesExercise } from './minorScales'
import { modesExercise } from './modes'
import { modulationExercise } from './modulation'
import { nashvilleExercise } from './nashville'
import { noteNamesExercise } from './noteNames'
import { pentatonicExercise } from './pentatonic'
import { phrasingExercise } from './phrasing'
import { meterExercise } from './meter'
import { subdivisionsExercise } from './subdivisions'
import { grooveExercise } from './groove'
import { rhythmDictationExercise } from './rhythmDictation'
import { songFormExercise } from './songForm'
import { handRolesExercise } from './handRoles'
import { arpeggioHitsExercise } from './arpeggioHits'
import { fillsExercise } from './fills'
import { passingChordsExercise } from './passingChords'
import { introsEndingsExercise } from './introsEndings'
import { playChordsExercise } from './playChords'
import { playBackExercise } from './playBack'
import { staffExercise } from './staff'
import { noteValuesExercise } from './noteValues'
import { markingsExercise } from './markings'
import { noteNamingExercise } from './noteNaming'
import { melodicDictationExercise } from './melodicDictation'
import { classicalFormsExercise } from './classicalForms'
import { progressionsExercise } from './progressions'
import { scaleChoiceExercise } from './scaleChoice'
import { scaleDegreesExercise } from './scaleDegrees'
import { transpositionExercise } from './transposition'
import { twoFiveOneExercise } from './twoFiveOne'
import { voiceLeadingExercise } from './voiceLeading'
import { slashChordsExercise } from './slashChords'

export const EXERCISES: Record<ExerciseId, ExerciseDef> = {
  intervals: intervalsExercise,
  chords: chordsExercise,
  'scale-degrees': scaleDegreesExercise,
  extensions: extensionsExercise,
  'note-names': noteNamesExercise,
  'major-scale': majorScaleExercise,
  'chord-function': chordFunctionExercise,
  'diatonic-chords': diatonicChordsExercise,
  progressions: progressionsExercise,
  'chord-spelling': chordSpellingExercise,
  pentatonic: pentatonicExercise,
  cadences: cadencesExercise,
  'slash-chords': slashChordsExercise,
  'chord-tones': chordTonesExercise,
  'two-five-one': twoFiveOneExercise,
  'by-ear': byEarExercise,
  'minor-scales': minorScalesExercise,
  modes: modesExercise,
  comping: compingExercise,
  'voice-leading': voiceLeadingExercise,
  'left-hand': leftHandExercise,
  'bass-lines': bassLinesExercise,
  'lead-sheets': leadSheetsExercise,
  transposition: transpositionExercise,
  modulation: modulationExercise,
  'borrowed-chords': borrowedChordsExercise,
  nashville: nashvilleExercise,
  'circle-of-fifths': circleOfFifthsExercise,
  'scale-choice': scaleChoiceExercise,
  'approach-notes': approachNotesExercise,
  phrasing: phrasingExercise,
  meter: meterExercise,
  subdivisions: subdivisionsExercise,
  groove: grooveExercise,
  'rhythm-dictation': rhythmDictationExercise,
  'song-form': songFormExercise,
  'hand-roles': handRolesExercise,
  'arpeggio-hits': arpeggioHitsExercise,
  fills: fillsExercise,
  'passing-chords': passingChordsExercise,
  'intros-endings': introsEndingsExercise,
  'play-chords': playChordsExercise,
  'play-back': playBackExercise,
  staff: staffExercise,
  'note-values': noteValuesExercise,
  markings: markingsExercise,
  'note-naming': noteNamingExercise,
  'melodic-dictation': melodicDictationExercise,
  'classical-forms': classicalFormsExercise,
}

export const EXERCISE_LIST: readonly ExerciseDef[] = [intervalsExercise, chordsExercise, scaleDegreesExercise, extensionsExercise, noteNamesExercise, majorScaleExercise, chordFunctionExercise, diatonicChordsExercise, progressionsExercise, chordSpellingExercise, pentatonicExercise, cadencesExercise, slashChordsExercise, chordTonesExercise, twoFiveOneExercise, byEarExercise, minorScalesExercise, modesExercise, compingExercise, voiceLeadingExercise, leftHandExercise, bassLinesExercise, leadSheetsExercise, transpositionExercise, modulationExercise, borrowedChordsExercise, nashvilleExercise, circleOfFifthsExercise, scaleChoiceExercise, approachNotesExercise, phrasingExercise, meterExercise, subdivisionsExercise, grooveExercise, rhythmDictationExercise, songFormExercise, handRolesExercise, arpeggioHitsExercise, fillsExercise, passingChordsExercise, introsEndingsExercise, playChordsExercise, playBackExercise, staffExercise, noteValuesExercise, markingsExercise, noteNamingExercise, melodicDictationExercise, classicalFormsExercise]

export function getExercise(id: string | undefined): ExerciseDef | undefined {
  return EXERCISE_LIST.find((e) => e.id === id)
}

export function getLevel(exercise: ExerciseDef, id: number): Level | undefined {
  return exercise.levels.find((l) => l.id === id)
}

/** The level's answer choices, in the exercise's own order. */
export function levelItems(exercise: ExerciseDef, level: Level): Item[] {
  return exercise.items.filter((item) => level.items.includes(item.id))
}

/** What a play lesson records when the notes played match none of its answers. */
export const OTHER: Item = { id: 'other', short: 'Other', name: 'something else', hint: 'Notes that make none of the answers' }

export function getItem(exercise: ExerciseDef, id: string): Item {
  if (id === OTHER.id) return OTHER
  const found = exercise.items.find((item) => item.id === id)
  if (!found) throw new Error(`${exercise.id} has no item ${id}`)
  return found
}

/** The level to practise next: the first one not passed yet (all earlier ones are passed), else the last. */
export function nextLevel(exercise: ExerciseDef, passed: ReadonlySet<number>): Level {
  return exercise.levels.find((l) => !passed.has(l.id)) ?? exercise.levels[exercise.levels.length - 1]
}
