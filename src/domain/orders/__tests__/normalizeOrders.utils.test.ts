import { describe, expect, it } from 'vitest'
import {
  extractOrderGuid,
  isLikelyGuid,
  normalizeLookupKey,
  toNumber,
} from '../normalizeOrders'

describe('normalizeOrders utilities', () => {
  it('normalizes lookup keys without using regex', () => {
    expect(normalizeLookupKey(' Dining-Option ')).toBe('dining option')
    expect(normalizeLookupKey('')).toBeUndefined()
  })

  it('coerces numeric strings using schema-friendly parsing', () => {
    expect(toNumber(' $12.34 ')).toBe(12.34)
    expect(toNumber('not-a-number')).toBeUndefined()
  })

  it('identifies GUID-like values without regular expressions', () => {
    expect(isLikelyGuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isLikelyGuid('invalid-guid')).toBe(false)
  })

  it('extracts order GUIDs from canonical fields', () => {
    const guid = '123e4567-e89b-12d3-a456-426614174000'
    expect(extractOrderGuid({ guid })).toBe(guid)
    expect(extractOrderGuid({})).toBeUndefined()
  })
})
