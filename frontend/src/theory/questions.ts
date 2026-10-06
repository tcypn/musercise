import type { ExerciseDef, Level, Question } from './types'

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Builds a session's questions. Items are drawn from shuffled bags so every item
 * in the level shows up about equally often.
 *
 * With three or more items the same one never comes twice in a row. With one or two, that
 * rule would make the order predictable (major, minor, major, minor...) and the learner could
 * score full marks without listening, so repeats are allowed and each bag holds two of each.
 */
export function buildQuestions(
  exercise: ExerciseDef,
  level: Level,
  count: number,
  rand: () => number = Math.random,
): Question[] {
  const byId = new Map(exercise.items.map((item) => [item.id, item]))
  const questions: Question[] = []
  const avoidRepeats = level.items.length >= 3
  const copies = avoidRepeats ? 1 : 2
  let bag: string[] = []
  let previous = ''
  while (questions.length < count) {
    if (bag.length === 0) {
      bag = shuffle(level.items.flatMap((id) => Array<string>(copies).fill(id)), rand)
      if (avoidRepeats && bag[bag.length - 1] === previous) bag.reverse() // pop() takes the end
    }
    const id = bag.pop() as string
    previous = id
    const mode = level.modes[Math.floor(rand() * level.modes.length)]
    questions.push(exercise.makeQuestion(level, byId.get(id)!, mode, rand))
  }
  return questions
}

/** The key a question is set in: the home note of the key it plays first, or its lowest note when it plays no key. */
function setting(question: Question): number {
  if (question.answerFrom !== undefined && question.events) return Math.min(...question.events[0].notes) % 12
  return question.root
}

/**
 * A question for another answer, played in the same key (or from the same lowest note) as `question`, so the only
 * difference the learner hears is the answer itself. Draws questions for that answer until one lands in the same
 * setting. Some answers cannot start from some notes (a wide interval from a very high note would run off the
 * keyboard); then the same note in another octave is used. Null only if neither is possible.
 */
export function sameSetting(exercise: ExerciseDef, level: Level, question: Question, itemId: string, rand: () => number = Math.random): Question | null {
  const item = exercise.items.find((i) => i.id === itemId)
  if (!item) return null
  if (question.swap) return question.swap(itemId)
  const want = setting(question)
  let sameNote: Question | null = null
  for (let tries = 0; tries < 1500; tries++) {
    const candidate = exercise.makeQuestion(level, item, question.mode, rand)
    const got = setting(candidate)
    if (got === want) return candidate
    if (!sameNote && got % 12 === want % 12) sameNote = candidate
  }
  return sameNote
}
