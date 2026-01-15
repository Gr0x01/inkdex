import { describe, it, expect } from 'vitest'
import { normalizeInstagramHandle, generateSlugFromInstagram } from '../slug'

describe('normalizeInstagramHandle', () => {
  it('removes @ prefix', () => {
    expect(normalizeInstagramHandle('@username')).toBe('username')
  })

  it('removes multiple @ symbols', () => {
    expect(normalizeInstagramHandle('@@username')).toBe('username')
  })

  it('lowercases handle', () => {
    expect(normalizeInstagramHandle('UserName')).toBe('username')
  })

  it('lowercases handle with @ prefix', () => {
    expect(normalizeInstagramHandle('@Chou_tatt')).toBe('chou_tatt')
  })

  it('trims whitespace', () => {
    expect(normalizeInstagramHandle('  username  ')).toBe('username')
  })

  it('handles whitespace before @', () => {
    expect(normalizeInstagramHandle('  @username')).toBe('username')
  })

  it('preserves dots and underscores', () => {
    expect(normalizeInstagramHandle('@duh.tattoos')).toBe('duh.tattoos')
    expect(normalizeInstagramHandle('@_dr_woo_')).toBe('_dr_woo_')
  })

  it('handles mixed case with special chars', () => {
    expect(normalizeInstagramHandle('@Ink.By.STAX')).toBe('ink.by.stax')
  })

  it('throws on empty string', () => {
    expect(() => normalizeInstagramHandle('')).toThrow('Instagram handle cannot be empty')
  })

  it('throws on whitespace-only input', () => {
    expect(() => normalizeInstagramHandle('   ')).toThrow('empty after normalization')
  })

  it('throws on @-only input', () => {
    expect(() => normalizeInstagramHandle('@')).toThrow('empty after normalization')
  })

  it('throws on multiple @-only input', () => {
    expect(() => normalizeInstagramHandle('@@@')).toThrow('empty after normalization')
  })
})

describe('generateSlugFromInstagram', () => {
  it('generates valid slug from handle', () => {
    expect(generateSlugFromInstagram('@duh.tattoos')).toBe('duh-tattoos')
  })

  it('replaces underscores with hyphens', () => {
    expect(generateSlugFromInstagram('_dr_woo_')).toBe('dr-woo')
  })

  it('removes @ prefix', () => {
    expect(generateSlugFromInstagram('@ink_by_stax')).toBe('ink-by-stax')
  })

  it('throws on empty handle', () => {
    expect(() => generateSlugFromInstagram('')).toThrow('cannot be empty')
  })
})
