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
