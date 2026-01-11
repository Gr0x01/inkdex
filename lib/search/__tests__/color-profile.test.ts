import { describe, it, expect } from 'vitest'
import { calculateColorProfile } from '../color-profile'

describe('calculateColorProfile', () => {
  it('returns true when >60% of images are color', () => {
    const stats = [
      { is_color: true },
      { is_color: true },
      { is_color: true },
      { is_color: true },
      { is_color: false },
    ]
    expect(calculateColorProfile(stats)).toBe(true)
  })

  it('returns false when <40% of images are color', () => {
    const stats = [
      { is_color: false },
      { is_color: false },
      { is_color: false },
      { is_color: true },
      { is_color: false },
    ]
    expect(calculateColorProfile(stats)).toBe(false)
  })

  it('returns null (mixed) when between 40-60% are color', () => {
    const stats = [
      { is_color: true },
      { is_color: true },
      { is_color: false },
      { is_color: false },
    ]
    // 50% color = mixed
    expect(calculateColorProfile(stats)).toBe(null)
  })

  it('returns null for empty array', () => {
    expect(calculateColorProfile([])).toBe(null)
  })

  it('filters out null is_color values', () => {
    const stats = [
      { is_color: true },
      { is_color: true },
      { is_color: null },
      { is_color: null },
      { is_color: null },
    ]
    // 2/2 valid = 100% color
    expect(calculateColorProfile(stats)).toBe(true)
  })

  it('returns null when all values are null', () => {
    const stats = [{ is_color: null }, { is_color: null }]
    expect(calculateColorProfile(stats)).toBe(null)
  })

  it('handles boundary case of exactly 60%', () => {
    const stats = [
      { is_color: true },
      { is_color: true },
      { is_color: true },
      { is_color: false },
      { is_color: false },
    ]
    // 60% = still mixed (need >60%)
    expect(calculateColorProfile(stats)).toBe(null)
  })

  it('handles boundary case of exactly 40%', () => {
    const stats = [
      { is_color: true },
      { is_color: true },
      { is_color: false },
      { is_color: false },
      { is_color: false },
    ]
    // 40% = still mixed (need <40%)
    expect(calculateColorProfile(stats)).toBe(null)
  })
})
