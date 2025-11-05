import { describe, expect, it } from 'vitest'
import { computeOrdersDebugDiff } from '../computeOrdersDebugDiff'
import type { NormalizedOrder, ToastOrder } from '../normalizeOrders'

const ORDER_GUID = '123e4567-e89b-12d3-a456-426614174000'
const SECOND_ORDER_GUID = '123e4567-e89b-12d3-a456-426614174111'

const createNormalizedOrder = (overrides: Partial<NormalizedOrder> = {}): NormalizedOrder => ({
  id: ORDER_GUID,
  guid: ORDER_GUID,
  status: 'IN_PROGRESS',
  fulfillmentStatus: 'IN_PROGRESS',
  items: [
    {
      id: 'b4f1c4f8-5f6b-4f27-9eea-4bb71daef111',
      name: 'Cheese Pizza',
      quantity: 1,
      modifiers: [],
    },
  ],
  ...overrides,
})

const createRawOrder = (overrides: Partial<ToastOrder> = {}): ToastOrder => ({
  guid: ORDER_GUID,
  status: 'IN_PROGRESS',
  fulfillmentStatus: 'IN_PROGRESS',
  checks: [
    {
      guid: '77ad8f5b-8c5c-4b06-a01b-0c7211d3a222',
      selections: [
        {
          guid: 'f14a8df0-1f9b-4c0d-8b08-48a116c3b333',
          itemGuid: 'b4f1c4f8-5f6b-4f27-9eea-4bb71daef111',
          quantity: 1,
          modifiers: [],
        },
      ],
    },
  ],
  ...overrides,
} as ToastOrder)

describe('computeOrdersDebugDiff', () => {
  it('returns an empty diff when normalized and raw orders align', () => {
    const normalized = [createNormalizedOrder()]
    const raw = [createRawOrder()]

    const result = computeOrdersDebugDiff(normalized, raw)

    expect(result.entries).toEqual([])
    expect(result.issues).toEqual([])
  })

  it('captures mismatched status values for shared GUIDs', () => {
    const normalized = [
      createNormalizedOrder({
        guid: SECOND_ORDER_GUID,
        id: SECOND_ORDER_GUID,
        status: 'READY',
        fulfillmentStatus: 'READY',
      }),
    ]
    const raw = [
      createRawOrder({
        guid: SECOND_ORDER_GUID,
        status: 'IN_PROGRESS',
        fulfillmentStatus: 'IN_PROGRESS',
      }),
    ]

    const result = computeOrdersDebugDiff(normalized, raw)

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.guid).toBe(SECOND_ORDER_GUID)
    expect(result.entries[0]?.mismatches).toEqual([
      {
        field: 'status',
        normalizedValue: 'READY',
        rawValue: 'IN_PROGRESS',
      },
      {
        field: 'fulfillmentStatus',
        normalizedValue: 'READY',
        rawValue: 'IN_PROGRESS',
      },
    ])
  })

  it('fails gracefully when provided malformed payloads', () => {
    const result = computeOrdersDebugDiff(null, undefined)

    expect(result.entries).toEqual([])
    expect(result.issues).toContain('Normalized orders payload was not an array.')
    expect(result.issues).toContain('Raw orders payload was not an array.')
  })
})
