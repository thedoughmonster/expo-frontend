import { describe, expect, it } from 'vitest'
import {
  normalizeItemModifiers,
  normalizeOrders,
  resolveOrderDiningOption,
  extractOrdersFromPayload,
} from '../normalizeOrders'
import { buildDiningOptionLookup } from '../../menus/menuLookup'

const createMenuLookup = () =>
  new Map([
    [
      'mod-1-option',
      {
        kitchenName: 'Sausage',
        posName: 'Sausage',
        displayName: 'DM Pork Sausage',
        fallbackName: 'Sausage',
      },
    ],
    [
      'mod-2-option',
      {
        kitchenName: 'Cheese',
        posName: 'Cheese',
        displayName: 'American Cheese',
        fallbackName: 'Cheese',
      },
    ],
    [
      'selection-1',
      {
        kitchenName: 'Build-A-Brekky',
        displayName: 'Build-A-Brekky',
        fallbackName: 'Build-A-Brekky',
      },
    ],
  ])

const createModifierMetadataLookup = () =>
  new Map([
    [
      'mod-1-option',
      {
        groupName: 'Proteins',
        groupId: 'protein-group',
        groupOrder: 0,
        optionOrder: 1,
        optionName: 'DM Pork Sausage',
      },
    ],
    [
      'mod-2-option',
      {
        groupName: 'Cheese',
        groupId: 'cheese-group',
        groupOrder: 1,
        optionOrder: 0,
        optionName: 'American Cheese',
      },
    ],
  ])

const createDiningOptionLookup = () =>
  buildDiningOptionLookup({
    data: {
      diningOptions: [
        {
          guid: 'dine-in-guid',
          displayName: 'Dine In',
          code: 'DINEIN',
        },
        {
          guid: 'takeout-guid',
          displayName: 'Take Out',
          code: 'TAKEOUT',
        },
      ],
    },
  })

const createCanonicalOrder = () => ({
  guid: 'order-1',
  displayNumber: '21',
  approvalStatus: 'APPROVED',
  openedDate: '2025-10-30T15:11:24.500+0000',
  createdDate: '2025-10-30T15:11:24.648+0000',
  diningOption: { guid: 'dine-in-guid' },
  checks: [
    {
      guid: 'check-1',
      displayNumber: '21',
      openedDate: '2025-10-30T15:11:24.500+0000',
      createdDate: '2025-10-30T15:11:24.643+0000',
      totalAmount: 16.38,
      paymentStatus: 'PAID',
      tabName: 'Danielle Lemons',
      customer: { firstName: 'Danielle', lastName: 'Lemons' },
      diningOption: { guid: 'dine-in-guid' },
      selections: [
        {
          guid: 'selection-1',
          displayName: 'Build-A-Brekky',
          quantity: 1,
          price: 6.25,
          fulfillmentStatus: 'READY',
          modifiers: [
            {
              guid: 'modifier-instance-1',
              item: { guid: 'mod-1-option' },
              displayName: 'DM Pork Sausage',
              quantity: 1,
            },
            {
              guid: 'modifier-instance-2',
              item: { guid: 'mod-2-option' },
              displayName: 'American Cheese',
              quantity: 2,
            },
            {
              guid: 'modifier-instance-3',
              item: { guid: 'mod-2-option' },
              displayName: 'American Cheese',
              quantity: 1,
            },
          ],
        },
      ],
    },
  ],
})

describe('normalizeItemModifiers', () => {
  it('aggregates modifier quantities and merges metadata', () => {
    const selection = {
      modifiers: [
        {
          guid: 'modifier-instance-1',
          item: { guid: 'mod-1-option' },
          displayName: 'DM Pork Sausage',
          quantity: 1,
        },
        {
          guid: 'modifier-instance-2',
          item: { guid: 'mod-2-option' },
          displayName: 'American Cheese',
          quantity: 2,
        },
        {
          guid: 'modifier-instance-3',
          item: { guid: 'mod-2-option' },
          displayName: 'American Cheese',
          quantity: 1,
        },
      ],
    }

    const result = normalizeItemModifiers(
      selection,
      createMenuLookup(),
      createModifierMetadataLookup(),
    )

    expect(result).toEqual([
      {
        id: 'mod-1-option',
        identifier: 'mod-1-option',
        name: 'DM Pork Sausage',
        quantity: 1,
        groupName: 'Proteins',
        groupId: 'protein-group',
        groupOrder: 0,
        optionOrder: 1,
        optionName: 'DM Pork Sausage',
      },
      {
        id: 'mod-2-option',
        identifier: 'mod-2-option',
        name: 'American Cheese',
        quantity: 3,
        groupName: 'Cheese',
        groupId: 'cheese-group',
        groupOrder: 1,
        optionOrder: 0,
        optionName: 'American Cheese',
      },
    ])
  })

  it('falls back to normalized names when no metadata identifier exists', () => {
    const selection = {
      modifiers: [
        { guid: 'unique-guid-1', displayName: 'Extra Egg', quantity: 1 },
        { guid: 'unique-guid-2', displayName: 'extra egg', quantity: 2 },
      ],
    }

    const result = normalizeItemModifiers(selection)

    expect(result).toEqual([
      {
        id: 'extra egg',
        identifier: undefined,
        name: 'Extra Egg',
        quantity: 3,
        groupName: undefined,
        groupId: undefined,
        groupOrder: undefined,
        optionOrder: undefined,
        optionName: undefined,
      },
    ])
  })
})

describe('resolveOrderDiningOption', () => {
  it('uses GUIDs from the payload to resolve labels via lookup', () => {
    const lookup = createDiningOptionLookup()
    const order = createCanonicalOrder()

    expect(resolveOrderDiningOption(order, lookup)).toBe('Dine In')
  })
})

describe('normalizeOrders', () => {
  it('normalizes a canonical Toast order payload', () => {
    const order = createCanonicalOrder()

    const [normalized] = normalizeOrders(
      [order],
      createMenuLookup(),
      createDiningOptionLookup(),
      createModifierMetadataLookup(),
    )

    expect(normalized).toEqual({
      id: 'order-1',
      displayId: '21',
      guid: 'order-1',
      status: 'APPROVED',
      createdAt: new Date('2025-10-30T15:11:24.500+0000'),
      createdAtRaw: '2025-10-30T15:11:24.500+0000',
      total: 16.38,
      currency: undefined,
      customerName: 'Danielle Lemons',
      diningOption: 'Dine In',
      fulfillmentStatus: 'READY',
      notes: undefined,
      tabName: 'Danielle Lemons',
      items: [
        {
          id: 'selection-1',
          name: 'Build-A-Brekky',
          quantity: 1,
          price: 6.25,
          currency: undefined,
          notes: undefined,
          modifiers: [
            {
              id: 'mod-1-option',
              identifier: 'mod-1-option',
              name: 'DM Pork Sausage',
              quantity: 1,
              groupName: 'Proteins',
              groupId: 'protein-group',
              groupOrder: 0,
              optionOrder: 1,
              optionName: 'DM Pork Sausage',
            },
            {
              id: 'mod-2-option',
              identifier: 'mod-2-option',
              name: 'American Cheese',
              quantity: 3,
              groupName: 'Cheese',
              groupId: 'cheese-group',
              groupOrder: 1,
              optionOrder: 0,
              optionName: 'American Cheese',
            },
          ],
        },
      ],
    })
  })

  it('handles selections without modifiers gracefully', () => {
    const order = createCanonicalOrder()
    order.checks[0].selections[0].modifiers = null

    const [normalized] = normalizeOrders([
      order,
    ])

    expect(normalized.items[0].modifiers).toEqual([])
  })

  it('sorts orders by resolved timestamps and ignores null values', () => {
    const earlyOrder = createCanonicalOrder()
    earlyOrder.guid = 'order-early'
    earlyOrder.openedDate = null
    earlyOrder.createdDate = null
    earlyOrder.checks[0].openedDate = null
    earlyOrder.checks[0].createdDate = '2025-10-30T10:00:00.000Z'

    const laterOrder = createCanonicalOrder()
    laterOrder.guid = 'order-late'
    laterOrder.openedDate = '2025-10-30T12:00:00.000Z'

    const normalized = normalizeOrders([laterOrder, earlyOrder])

    expect(normalized.map((order) => order.id)).toEqual(['order-early', 'order-late'])
  })
})

describe('extractOrdersFromPayload', () => {
  it('returns orders from the canonical worker payload', () => {
    const order = createCanonicalOrder()

    const payload = {
      ok: true,
      orders: [order],
      data: [order],
    }

    expect(extractOrdersFromPayload(payload)).toEqual([order])
  })

  it('falls back to the data array when orders are absent', () => {
    const order = createCanonicalOrder()

    const payload = {
      ok: true,
      data: [order],
    }

    expect(extractOrdersFromPayload(payload)).toEqual([order])
  })
})
