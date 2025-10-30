import { describe, expect, it } from 'vitest'
import {
  normalizeItemModifiers,
  normalizeOrders,
  resolveOrderDiningOption,
} from '../normalizeOrders'
import { buildDiningOptionLookup } from '../../menus/menuLookup'

const createMenuLookup = () =>
  new Map([
    [
      'mod-123',
      {
        kitchenName: 'Extra Cheese',
        posName: 'Cheese',
        displayName: 'Extra Cheese',
        fallbackName: 'Cheese',
      },
    ],
  ])

describe('normalizeItemModifiers', () => {
  it('aggregates nested modifiers while honoring menu lookups', () => {
    const item = {
      modifiers: [
        { name: 'Extra Cheese', quantity: 1 },
        { modifierGuid: 'mod-123', quantity: 2 },
        {
          selectedModifiers: [
            { modifier_guid: 'mod-123', quantity: 1 },
            { name: 'extra cheese', quantity: 3 },
          ],
        },
      ],
    }

    const result = normalizeItemModifiers(item, createMenuLookup())

    expect(result).toEqual([
      {
        name: 'Extra Cheese',
        quantity: 3,
      },
    ])
  })
})

describe('resolveOrderDiningOption', () => {
  it('uses lookup metadata to resolve identifiers and labels', () => {
    const configPayload = {
      data: {
        diningOptions: [
          {
            guid: 'dine-in-guid',
            displayName: 'Dine In',
            names: { en: 'Dine In' },
            code: 'DINEIN',
          },
          {
            guid: 'takeout-guid',
            displayName: 'Take Out',
            names: { en: 'Takeout' },
            code: 'TAKEOUT',
          },
        ],
      },
    }

    const lookup = buildDiningOptionLookup(configPayload)

    const order = {
      diningOptionGuid: 'takeout-guid',
      diningOption: { label: 'Pick Up' },
    }

    expect(resolveOrderDiningOption(order, lookup)).toBe('Take Out')
  })
})

describe('normalizeOrders timestamp parsing', () => {
  it('extracts the earliest prioritized timestamp and sorts results', () => {
    const rawOrders = [
      {
        guid: '11111111-1111-1111-1111-111111111111',
        created_at: '2024-01-06T13:20:00Z',
        items: [{ name: 'Item', quantity: 1 }],
      },
      {
        guid: '00000000-0000-0000-0000-000000000001',
        checks: [
          {
            items: [{ name: 'Nested', quantity: 2 }],
            createdAt: '2024-01-05T12:00:00Z',
          },
        ],
      },
    ]

    const [first, second] = normalizeOrders(rawOrders, new Map(), new Map())

    expect(first.guid).toBe('00000000-0000-0000-0000-000000000001')
    expect(first.createdAt).toBeInstanceOf(Date)
    expect(first.createdAt?.toISOString()).toBe('2024-01-05T12:00:00.000Z')
    expect(second.createdAt?.toISOString()).toBe('2024-01-06T13:20:00.000Z')
  })
})

describe('normalizeOrders tab names', () => {
  it('prefers human-readable tab labels over serialized structures', () => {
    const rawOrders = [
      {
        guid: 'order-tab',
        tabName: { name: 'Main Bar' },
        tab: { name: 'Main Bar' },
      },
    ]

    const [order] = normalizeOrders(rawOrders, new Map(), new Map())

    expect(order.tabName).toBe('Main Bar')
  })

  it('extracts tab names nested under data attributes', () => {
    const rawOrders = [
      {
        guid: 'order-nested-tab',
        data: {
          attributes: {
            tabName: 'Window Counter',
          },
        },
      },
    ]

    const [order] = normalizeOrders(rawOrders, new Map(), new Map())

    expect(order.tabName).toBe('Window Counter')
  })

  it('falls back to check-level tab names when present', () => {
    const rawOrders = [
      {
        guid: 'order-check-tab',
        checks: [
          {
            tabName: 'Zac',
          },
        ],
      },
    ]

    const [order] = normalizeOrders(rawOrders, new Map(), new Map())

    expect(order.tabName).toBe('Zac')
  })
})
