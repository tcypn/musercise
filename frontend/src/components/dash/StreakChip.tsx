import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { mergeProgress } from '../../store/merge'
import { getCachedProgress, getPending } from '../../store/pending'
import { computeStreak } from '../../theory/dashboard'
import { localDateString } from '../../theory/practice'
import { Flame } from './Icons'

/** The streak: just the flame and the number. It opens the streak page. */
export function StreakChip({ days }: { days?: readonly string[] }) {
  const today = useMemo(() => localDateString(), [])
  const streak = useMemo(() => computeStreak(days ?? mergeProgress(getCachedProgress(), getPending()).days, today), [days, today])
  return (
    <Link to="/streak" className={streak.count === 0 ? 'streak-chip idle' : 'streak-chip'} aria-label={`${streak.count}-day streak. Open the streak page`}>
      <Flame size={30} className={streak.count === 0 ? 'd-flame off' : 'd-flame'} />
      <span aria-hidden="true">{streak.count}</span>
    </Link>
  )
}
