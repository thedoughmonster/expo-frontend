import { describe, expect, it } from 'vitest'
import {
  FULFILLMENT_FILTERS,
  FULFILLMENT_STATUSES,
  fulfillmentStatusToClassName,
  normalizeStatusValue,
  resolveFulfillmentFilterKey,
} from '../fulfillmentFilters'

describe('fulfillmentFilters', () => {
  it('normalizes status values using schema-defined casing', () => {
    expect(normalizeStatusValue(' ready ')).toBe(FULFILLMENT_STATUSES.READY)
    expect(normalizeStatusValue(null)).toBe('')
  })

  it('matches canonical fulfillment statuses without regex', () => {
    const readyFilter = FULFILLMENT_FILTERS.find((filter) => filter.key === 'ready')
    expect(readyFilter).toBeDefined()
    expect(readyFilter?.matches(FULFILLMENT_STATUSES.READY)).toBe(true)
    expect(readyFilter?.matches(FULFILLMENT_STATUSES.NEW)).toBe(false)
  })

  it('resolves filter keys based on schema fields', () => {
    const result = resolveFulfillmentFilterKey({ fulfillmentStatus: 'hold' })
    expect(result).toBe('hold')
  })

  it('falls back to legacy status handling for preparation states', () => {
    expect(fulfillmentStatusToClassName('in_progress')).toBe('is-in-preparation')
  })

  it('maps canonical statuses to deterministic class names', () => {
    expect(fulfillmentStatusToClassName('new')).toBe('is-new')
    expect(fulfillmentStatusToClassName('sent')).toBe('is-sent')
  })
})
