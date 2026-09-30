import { describe, expect, it } from 'vitest'
import type { DailyRow, HistoryRow, Progress } from '../api/types'
import { emptyProgress } from '../store/normalise'
import {
  accuracyView,
  addDays,
  computeStreak,
  daysBetween,
  last7,
  monthGrid,
  radarData,
  recommendations,
  weekdayIndex,
  weekSeries,
  weekStart,
  weekStrip,
} from './dashboard'
import { EXERCISES } from './exercises'

// 30 September 2026 is a Wednesday. Weeks (Mon-Sun): 09-21..09-27, 09-28..10-04.
const TODAY = '2026-09-30'

describe('calendar helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29') // leap year
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('knows the weekday, Monday first', () => {
    expect(weekdayIndex('2026-09-28')).toBe(0)
    expect(weekdayIndex('2026-09-30')).toBe(2)
    expect(weekdayIndex('2026-10-04')).toBe(6)
    expect(weekStart('2026-10-04')).toBe('2026-09-28')
    expect(weekStart('2026-09-28')).toBe('2026-09-28')
  })
  it('counts days between dates', () => {
    expect(daysBetween('2026-09-27', '2026-09-30')).toBe(3)
    expect(daysBetween('2026-09-30', '2026-09-30')).toBe(0)
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
  })
})

describe('streak with a free rest day per week', () => {
  it('is zero and open with no practice', () => {
    expect(computeStreak([], TODAY)).toEqual({ count: 0, restDays: [], status: 'open' })
  })

  it('counts consecutive days, and is done once today is practised', () => {
    const s = computeStreak(['2026-09-28', '2026-09-29', '2026-09-30'], TODAY)
    expect(s).toEqual({ count: 3, restDays: [], status: 'done' })
  })

  it('does not break while today is still to do', () => {
    const s = computeStreak(['2026-09-28', '2026-09-29'], TODAY)
    expect(s).toEqual({ count: 2, restDays: [], status: 'open' })
  })

  it('forgives one missed day as a rest day', () => {
    // practised Sun 27, skipped Mon 28? no: practised Tue 29, skipped Mon 28 -> weekday rest, practised Sun 27
    const s = computeStreak(['2026-09-26', '2026-09-27', '2026-09-29', '2026-09-30'], TODAY)
    expect(s.count).toBe(4)
    expect(s.restDays).toEqual(['2026-09-28'])
    expect(s.status).toBe('done')
  })

  it('warns when yesterday was the rest day and today is still to do', () => {
    const s = computeStreak(['2026-09-27', '2026-09-28'], TODAY) // Tue 29 skipped, today Wed open
    expect(s).toEqual({ count: 2, restDays: ['2026-09-29'], status: 'at-risk' })
  })

  it('ends after two missed days in a row', () => {
    // 27th practised, 28th and 29th missed, today open: two misses before today
    expect(computeStreak(['2026-09-26', '2026-09-27'], TODAY).count).toBe(0)
    // practised today and 25/26, but 27, 28, 29 missed
    const s = computeStreak(['2026-09-25', '2026-09-26', '2026-09-30'], TODAY)
    expect(s.count).toBe(1)
    expect(s.restDays).toEqual([])
  })

  it('allows only one rest day in the same Monday-Sunday week', () => {
    // Week of Mon 21: practised Mon, Wed, Fri; Tue and Thu missed. Today is Fri 25.
    const s = computeStreak(['2026-09-21', '2026-09-23', '2026-09-25'], '2026-09-25')
    expect(s.restDays).toEqual(['2026-09-24']) // Thursday forgiven, Tuesday is not
    expect(s.count).toBe(2) // Friday and Wednesday; the streak stops at the second missed day
  })

  it('gives a fresh rest day every week', () => {
    // Sat 19 | Sun 20 rest | Mon 21, Tue 22 | Wed 23 rest | Thu 24
    const s = computeStreak(['2026-09-19', '2026-09-21', '2026-09-22', '2026-09-24'], '2026-09-24')
    expect(s.count).toBe(4)
    expect(s.restDays).toEqual(['2026-09-23', '2026-09-20'])
  })

  it('counts practised days only, so a long streak is a long streak', () => {
    const month = Array.from({ length: 30 }, (_, i) => addDays('2026-09-01', i))
    expect(computeStreak(month, TODAY).count).toBe(30)
  })

  it('needs a practised day before a rest day, so a lone old day with a gap after it does not count', () => {
    expect(computeStreak(['2026-09-20'], TODAY).count).toBe(0)
  })

  it('ignores days after today', () => {
    expect(computeStreak(['2026-10-02', '2026-10-03'], TODAY).count).toBe(0)
  })
})

describe('week strip', () => {
  it('shows Monday to Sunday with the right state for each day', () => {
    const strip = weekStrip(['2026-09-28'], ['2026-09-29'], TODAY)
    expect(strip.map((d) => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(strip.map((d) => d.state)).toEqual(['practised', 'rest', 'today', 'future', 'future', 'future', 'future'])
    expect(strip[0].date).toBe('2026-09-28')
    expect(strip[6].date).toBe('2026-10-04')
  })
  it('marks today practised, and a skipped day that was not forgiven as missed', () => {
    const strip = weekStrip(['2026-09-29', '2026-09-30'], [], TODAY)
    expect(strip.map((d) => d.state).slice(0, 3)).toEqual(['missed', 'practised', 'practised'])
  })
  it('on a Sunday, the whole week is behind or today', () => {
    const strip = weekStrip([], [], '2026-10-04')
    expect(strip.map((d) => d.state)).toEqual(['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'today'])
  })
})

function withDaily(daily: DailyRow[]): Progress {
  return { ...emptyProgress(), daily }
}
const day = (date: string, questions: number, correct: number): DailyRow => ({ date, sessions: 1, questions, correct, seconds: 300 })

describe('accuracy this week against the week before', () => {
  // this week = 09-24..09-30, previous week = 09-17..09-23
  it('is up when this week is better, comparing the numbers that are shown', () => {
    const view = accuracyView(withDaily([day('2026-09-20', 100, 76), day('2026-09-29', 100, 82)]), TODAY)
    expect(view.thisWeek.accuracy).toBeCloseTo(0.82)
    expect(view.previousWeek.accuracy).toBeCloseTo(0.76)
    expect(view.delta).toBe(6)
    expect(view.direction).toBe('up')
  })
  it('is down when this week is worse', () => {
    const view = accuracyView(withDaily([day('2026-09-20', 50, 45), day('2026-09-29', 50, 35)]), TODAY)
    expect(view.delta).toBe(-20)
    expect(view.direction).toBe('down')
  })
  it('is flat when the shown percentages match', () => {
    const view = accuracyView(withDaily([day('2026-09-20', 40, 30), day('2026-09-29', 40, 30)]), TODAY)
    expect(view.delta).toBe(0)
    expect(view.direction).toBe('flat')
  })
  it('does not draw a conclusion from too few questions in either week', () => {
    const fewNow = accuracyView(withDaily([day('2026-09-20', 100, 70), day('2026-09-29', 19, 19)]), TODAY)
    expect(fewNow.direction).toBe('not-enough-data')
    expect(fewNow.delta).toBeNull()
    expect(fewNow.thisWeek.accuracy).toBe(1) // the number itself is still shown
    const fewBefore = accuracyView(withDaily([day('2026-09-20', 5, 5), day('2026-09-29', 100, 90)]), TODAY)
    expect(fewBefore.direction).toBe('not-enough-data')
    expect(accuracyView(withDaily([day('2026-09-20', 20, 10), day('2026-09-29', 20, 12)]), TODAY).direction).toBe('up') // exactly 20 is enough
  })
  it('adds up questions rather than averaging days', () => {
    // one tiny perfect day and one big weak day: the week is 52%, not the 75% average of the two days
    const view = accuracyView(withDaily([day('2026-09-25', 2, 2), day('2026-09-29', 98, 50)]), TODAY)
    expect(view.thisWeek.questions).toBe(100)
    expect(view.thisWeek.accuracy).toBeCloseTo(0.52)
  })
  it('keeps the windows exact at the edges', () => {
    const view = accuracyView(withDaily([day('2026-09-16', 30, 30), day('2026-09-17', 30, 15), day('2026-09-23', 30, 15), day('2026-09-24', 30, 30)]), TODAY)
    expect(view.previousWeek.questions).toBe(60) // 17th and 23rd in, 16th out
    expect(view.thisWeek.questions).toBe(30) // 24th in
    expect(view.direction).toBe('up')
  })
  it('has no accuracy for a week with no questions, and reports the all-time figure', () => {
    const p = withDaily([])
    p.totals = { ...p.totals, questions: 200, correct: 150 }
    const view = accuracyView(p, TODAY)
    expect(view.thisWeek.accuracy).toBeNull()
    expect(view.allTime).toBe(0.75)
    expect(accuracyView(emptyProgress(), TODAY).allTime).toBeNull()
  })
  it('counts levels first passed in the last 7 days across both lessons', () => {
    const p = emptyProgress()
    p.exercises.intervals.levels = [
      { level: 1, sessions: 1, best_accuracy: 0.9, passed: true, first_passed: '2026-09-23' }, // 8 days ago: out
      { level: 2, sessions: 1, best_accuracy: 0.9, passed: true, first_passed: '2026-09-24' }, // in
      { level: 3, sessions: 1, best_accuracy: 0.5, passed: false, first_passed: null },
    ]
    p.exercises.chords.levels = [{ level: 1, sessions: 1, best_accuracy: 1, passed: true, first_passed: '2026-09-30' }]
    expect(accuracyView(p, TODAY).levelsPassedThisWeek).toBe(2)
  })
})

describe('this week against last week, day by day', () => {
  it('gives Monday to Sunday for both weeks, with gaps where nothing was answered', () => {
    const { thisWeek, lastWeek } = weekSeries([day('2026-09-21', 20, 10), day('2026-09-28', 10, 9), day('2026-09-30', 20, 16)], TODAY)
    expect(thisWeek.map((p) => p.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(thisWeek.map((p) => p.accuracy)).toEqual([0.9, null, 0.8, null, null, null, null])
    expect(lastWeek[0]).toEqual({ date: '2026-09-21', label: 'Mon', questions: 20, accuracy: 0.5 })
    expect(lastWeek.slice(1).every((p) => p.accuracy === null)).toBe(true)
  })
  it('never shows a future day, even if the data has one', () => {
    const { thisWeek } = weekSeries([day('2026-10-02', 10, 10)], TODAY)
    expect(thisWeek[4].accuracy).toBeNull()
  })
})

describe('month calendar', () => {
  it('lays October 2026 out in whole Monday-first weeks', () => {
    const weeks = monthGrid(['2026-10-01'], [], 2026, 10, '2026-10-15')
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0][0].date).toBe('2026-09-28') // starts on the Monday before the 1st
    expect(weeks[0][0].inMonth).toBe(false)
    expect(weeks[0][3]).toMatchObject({ date: '2026-10-01', inMonth: true, state: 'practised' }) // Thursday
    expect(weeks[4][6].date).toBe('2026-11-01')
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31)
  })
  it('marks practised, rest, today and future days', () => {
    const cells = monthGrid(['2026-09-28', '2026-09-30'], ['2026-09-29'], 2026, 9, TODAY).flat()
    const state = (date: string) => cells.find((c) => c.date === date)!.state
    expect(state('2026-09-28')).toBe('practised')
    expect(state('2026-09-29')).toBe('rest')
    expect(state('2026-09-30')).toBe('practised') // today, and practised
    expect(state('2026-09-27')).toBe('none')
    expect(state('2026-10-01')).toBe('future')
    expect(monthGrid([], [], 2026, 9, TODAY).flat().find((c) => c.date === TODAY)!.state).toBe('today')
  })
  it('handles February in a leap year and a month that starts on Monday', () => {
    expect(monthGrid([], [], 2028, 2, '2028-03-01').flat().filter((c) => c.inMonth)).toHaveLength(29)
    const june = monthGrid([], [], 2026, 6, '2026-07-01') // 1 June 2026 is a Monday
    expect(june[0][0]).toMatchObject({ date: '2026-06-01', inMonth: true })
    expect(monthGrid([], [], 2026, 12, '2027-01-01').flat().at(-1)!.date).toBe('2027-01-03')
  })
})

describe('ear profile radar', () => {
  it('gives one axis per item in order, with null for items never asked', () => {
    const p = emptyProgress()
    p.exercises.intervals.items = [{ item: '7', asked: 10, correct: 8 }, { item: '1', asked: 4, correct: 1 }]
    const axes = radarData(p.exercises.intervals, EXERCISES.intervals.items)
    expect(axes).toHaveLength(12)
    expect(axes.map((a) => a.short).slice(0, 3)).toEqual(['m2', 'M2', 'm3'])
    expect(axes.find((a) => a.id === '7')).toMatchObject({ asked: 10, accuracy: 0.8 })
    expect(axes.find((a) => a.id === '1')).toMatchObject({ asked: 4, accuracy: 0.25 })
    expect(axes.find((a) => a.id === '12')).toMatchObject({ asked: 0, accuracy: null })
    expect(radarData(p.exercises.chords, EXERCISES.chords.items)).toHaveLength(11)
  })
})

describe('recommendations', () => {
  const session = (exercise: 'intervals' | 'chords', day: string): HistoryRow => ({ id: 1, exercise, level: 1, ended_at: `${day}T10:00:00Z`, day, question_count: 20, accuracy: 0.8 })
  const level = (n: number, passed: boolean, best: number | null = passed ? 0.9 : null) => ({ level: n, sessions: 1, best_accuracy: best, passed, first_passed: passed ? '2026-09-01' : null })

  it('starts a brand-new learner at intervals level 1', () => {
    const recs = recommendations(emptyProgress(), TODAY)
    expect(recs).toHaveLength(1)
    expect(recs[0]).toMatchObject({ kind: 'stale', to: '/practice/intervals/1', reason: 'Not started yet' })
    expect(recs[0].title).toBe('Intervals, level 1: Perfect ground')
  })

  it('points at the weakest answer, naming what it is mistaken for, at the easiest open level that includes it', () => {
    const p = emptyProgress()
    p.exercises.intervals.levels = [level(1, true)] // level 2 is open
    p.exercises.intervals.items = [
      { item: '7', asked: 20, correct: 6 }, // 30%: worst
      { item: '5', asked: 20, correct: 19 },
      { item: '3', asked: 5, correct: 0 }, // too few answers to judge
      { item: '4', asked: 20, correct: 17 }, // 85%: fine
    ]
    p.exercises.intervals.confusions = [{ asked: '7', answered: '5', count: 10 }, { asked: '7', answered: '12', count: 2 }]
    p.history = [session('intervals', TODAY)]
    const [weak] = recommendations(p, TODAY)
    expect(weak).toMatchObject({ kind: 'weak', title: 'Work on the perfect 5th', to: '/practice/intervals/1' }) // level 2 is open too, but level 1 asks it more often
    expect(weak.reason).toBe('30% right so far, often heard as the perfect 4th')
  })

  it('skips the weak spot when every answer is at 80% or better', () => {
    const p = emptyProgress()
    p.exercises.intervals.items = [{ item: '7', asked: 20, correct: 16 }]
    expect(recommendations(p, TODAY).some((r) => r.kind === 'weak')).toBe(false)
  })

  it('suggests the next level of what you practised most recently, and how close you are', () => {
    const p = emptyProgress()
    p.exercises.chords.levels = [level(1, true), level(2, true), level(3, false, 0.75)]
    p.history = [session('chords', TODAY), session('intervals', '2026-09-27')]
    const recs = recommendations(p, TODAY)
    const next = recs.find((r) => r.kind === 'next')!
    expect(next.to).toBe('/practice/chords/3')
    expect(next.title).toBe('Chord quality, level 3: Restless')
    expect(next.reason).toBe('Best so far 75%. You need 80% to pass')
  })

  it('names how long ago the lesson you have left alone was practised, and never repeats a destination', () => {
    const p = emptyProgress()
    p.exercises.chords.levels = [level(1, true)]
    p.exercises.intervals.levels = [level(1, true)]
    p.history = [session('chords', TODAY), session('intervals', '2026-09-27')]
    const recs = recommendations(p, TODAY)
    expect(recs.map((r) => r.kind)).toEqual(['next', 'stale'])
    expect(recs[1]).toMatchObject({ to: '/practice/intervals/2', reason: 'Last practised 3 days ago' })
    expect(new Set(recs.map((r) => r.to)).size).toBe(recs.length)
    p.history = [session('chords', TODAY), session('intervals', '2026-09-29')]
    expect(recommendations(p, TODAY)[1].reason).toBe('Last practised yesterday')
  })

  it('returns at most three, in the order weak spot, next level, least recent', () => {
    const p = emptyProgress()
    p.exercises.intervals.levels = [level(1, true)]
    p.exercises.chords.levels = [level(1, true), level(2, true)]
    p.exercises.intervals.items = [{ item: '5', asked: 30, correct: 10 }]
    p.history = [session('chords', TODAY), session('intervals', '2026-09-20')]
    const recs = recommendations(p, TODAY)
    expect(recs.map((r) => r.kind)).toEqual(['weak', 'next', 'stale'])
    expect(recs).toHaveLength(3)
  })

  it('has nothing to suggest once every level of both lessons is passed', () => {
    const p = emptyProgress()
    const all = (n: number) => Array.from({ length: n }, (_, i) => level(i + 1, true))
    p.exercises.intervals.levels = all(10)
    p.exercises.chords.levels = all(10)
    p.history = [session('chords', TODAY)]
    expect(recommendations(p, TODAY)).toEqual([])
  })
})

describe('last 7 days', () => {
  const row = (date: string, questions: number, correct: number): DailyRow => ({ date, sessions: 1, questions, correct, seconds: 60 })

  it('covers the 7 days ending today, oldest first, labelled by weekday', () => {
    const days = last7([], TODAY)
    expect(days.map((d) => d.date)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'])
    expect(days.map((d) => d.label)).toEqual(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'])
    expect(days.every((d) => d.accuracy === null && d.questions === 0)).toBe(true)
  })

  it('gives each day its own accuracy and leaves days without questions empty', () => {
    const days = last7([row('2026-09-30', 20, 17), row('2026-09-28', 10, 5), row('2026-09-23', 20, 20)], TODAY)
    expect(days[6]).toMatchObject({ questions: 20, accuracy: 0.85 })
    expect(days[4]).toMatchObject({ questions: 10, accuracy: 0.5 })
    expect(days[5].accuracy).toBeNull()
    expect(days.some((d) => d.date === '2026-09-23')).toBe(false) // eight days back is out
  })
})
