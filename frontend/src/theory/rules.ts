/** Keep in sync with backend/progress/rules.py. */
export const PASS_ACCURACY = 0.8
export const QUESTIONS_PER_SESSION = 20

export function isPassing(questionCount: number, correctCount: number): boolean {
  return questionCount >= QUESTIONS_PER_SESSION && correctCount / questionCount >= PASS_ACCURACY
}

/** Level N is open once level N-1 has been passed (level 1 is always open). */
export function isUnlocked(levelId: number, passed: ReadonlySet<number>): boolean {
  return levelId === 1 || passed.has(levelId - 1)
}
