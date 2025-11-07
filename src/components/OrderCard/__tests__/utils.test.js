import { describe, expect, it } from 'vitest'
import { statusToClassName } from '../utils'

describe('statusToClassName', () => {
  it('returns an empty class when status is missing', () => {
    expect(statusToClassName(undefined)).toBe('')
    expect(statusToClassName(null)).toBe('')
  })

  it('converts multi-word statuses into kebab-case slugs', () => {
    expect(statusToClassName('Ready for Pickup')).toBe('order-status--ready-for-pickup')
    expect(statusToClassName('In Progress')).toBe('order-status--in-progress')
  })

  it('collapses repeated separators without regex', () => {
    expect(statusToClassName('  Ready---NOW!! ')).toBe('order-status--ready-now')
  })
})
