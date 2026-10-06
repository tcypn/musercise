import { describe, expect, it } from 'vitest'
import { APP_VERSION, CHANGELOG } from './changelog'

const parts = (v: string) => v.split('.').map(Number)
const newer = (a: string, b: string) => {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

describe('changelog', () => {
  it('lists x.y.z versions, newest first, with real dates in order and at least one change each', () => {
    for (const v of CHANGELOG) {
      expect(v.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(v.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(`${v.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(v.date)
      expect(v.changes.length).toBeGreaterThan(0)
    }
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(newer(CHANGELOG[i - 1].version, CHANGELOG[i].version), CHANGELOG[i].version).toBe(true)
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true)
    }
  })

  it('shows the newest version as the app version', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version)
  })
})
