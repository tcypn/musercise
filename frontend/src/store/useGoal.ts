import { useSyncExternalStore } from 'react'
import { activeGoalId, getGoalById, subscribeGoal, type Goal } from '../theory/goals'

/** The active goal, shared by the app bar, Learn, the Map and the Goals page. */
export function useGoal(): Goal | undefined {
  return getGoalById(useSyncExternalStore(subscribeGoal, activeGoalId, () => null))
}
