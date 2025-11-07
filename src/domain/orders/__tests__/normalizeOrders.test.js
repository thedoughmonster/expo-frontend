import { describe, expect, it } from 'vitest'
import {
  normalizeItemModifiers,
  normalizeOrderItems,
  normalizeOrders,
  resolveOrderDiningOption,
  extractOrdersFromPayload,
} from '../normalizeOrders'
import {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  buildModifierMetadataLookup,
} from '../../menus/menuLookup'

const menuFixture = {
  menu: {
    menus: [
      {
        name: 'Breakfast',
        menuItems: [
          {
            guid: 'menu-item-1',
            name: 'Bagel',
            kitchenName: 'Bagel',
            multiLocationId: 'ml-1',
            modifierGroupReferences: [],
            prepStations: ['station-bake'],
          },
          {
            guid: 'menu-item-2',
            name: 'Toast',
            kitchenName: 'Toast',
            multiLocationId: 'ml-2',
            modifierGroupReferences: [],
            prepStations: ['station-oven'],
          },
          {
            guid: 'selection-1',
            name: 'Build-A-Brekky',
            kitchenName: 'Build-A-Brekky',
            multiLocationId: 'selection-1',
            modifierGroupReferences: [100, 101],
            prepStations: ['station-hot'],
          },
        ],
      },
    ],
    modifierGroupReferences: {
      100: {
        referenceId: 100,
        guid: 'protein-group',
        name: 'Proteins',
        modifierOptionReferences: [200],
      },
      101: {
        referenceId: 101,
        guid: 'cheese-group',
        name: 'Cheese',
        modifierOptionReferences: [201],
      },
    },
    modifierOptionReferences: {
      200: {
        referenceId: 200,
        guid: 'mod-1-option',
        name: 'Sausage',
      },
      201: {
        referenceId: 201,
        guid: 'mod-2-option',
        name: 'American Cheese',
      },
    },
  },
}

const configFixture = {
  updatedAt: '2025-01-01T00:00:00Z',
  ttlSeconds: 300,
  data: {
    diningOptions: [
      {
        guid: 'dine-in-guid',
        name: 'Dine In',
        externalId: 'DINING_ROOM',
        behavior: 'DINE_IN',
      },
      {
        guid: 'takeout-guid',
        name: 'Take Out',
        externalId: 'TAKEOUT',
        behavior: 'TAKE_OUT',
      },
    ],
  },
}

const createMenuLookup = () => buildMenuItemLookup(menuFixture)

const createModifierMetadataLookup = () => buildModifierMetadataLookup(menuFixture)

const createDiningOptionLookup = () => buildDiningOptionLookup(configFixture)

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

describe('normalizeOrderItems', () => {
  it('sorts items using menu order indices with stable results', () => {
    const menuPayload = {
      menus: [
        {
          menuItems: [
            { guid: 'menu-item-1', displayName: 'Bagel' },
            { guid: 'menu-item-2', displayName: 'Toast' },
          ],
        },
      ],
    }

    const menuLookup = buildMenuItemLookup(menuPayload)

    const order = {
      checks: [
        {
          selections: [
            {
              guid: 'selection-2',
              displayName: 'Toast',
              quantity: 1,
              item: { guid: 'menu-item-2' },
            },
            {
              guid: 'selection-1',
              displayName: 'Bagel',
              quantity: 1,
              item: { guid: 'menu-item-1' },
            },
          ],
        },
      ],
    }

    const first = normalizeOrderItems(order, menuLookup)
    const second = normalizeOrderItems(order, menuLookup)

    expect(first).toEqual(second)
    expect(first.map((item) => item.name)).toEqual(['Bagel', 'Toast'])
    expect(first.map((item) => item.menuOrderIndex)).toEqual([0, 1])
  })
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
        name: 'Sausage',
        quantity: 1,
        groupName: 'Proteins',
        groupId: 'protein-group',
        groupOrder: 0,
        optionOrder: 0,
        optionName: 'Sausage',
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

  it('sorts modifiers by group and option order when metadata is available', () => {
    const selection = {
      modifiers: [
        {
          guid: 'modifier-instance-b',
          item: { guid: 'mod-b-option' },
          displayName: 'Broccoli',
          quantity: 1,
        },
        {
          guid: 'modifier-instance-a',
          item: { guid: 'mod-a-option' },
          displayName: 'Arugula',
          quantity: 1,
        },
        {
          guid: 'modifier-instance-c',
          item: { guid: 'mod-c-option' },
          displayName: 'Chipotle Mayo',
          quantity: 1,
        },
      ],
    }

    const metadataLookup = new Map([
      [
        'mod-a-option',
        {
          groupName: 'Veggies',
          groupId: 'veggies-group',
          groupOrder: 2,
          optionOrder: 1,
          optionName: 'Arugula',
        },
      ],
      [
        'mod-b-option',
        {
          groupName: 'Veggies',
          groupId: 'veggies-group',
          groupOrder: 2,
          optionOrder: 0,
          optionName: 'Broccoli',
        },
      ],
      [
        'mod-c-option',
        {
          groupName: 'Sauces',
          groupId: 'sauces-group',
          groupOrder: 1,
          optionOrder: 3,
          optionName: 'Chipotle Mayo',
        },
      ],
    ])

    const result = normalizeItemModifiers(selection, undefined, metadataLookup)

    expect(result.map((modifier) => modifier.name)).toEqual([
      'Chipotle Mayo',
      'Broccoli',
      'Arugula',
    ])
    expect(result.map((modifier) => modifier.groupName)).toEqual([
      'Sauces',
      'Veggies',
      'Veggies',
    ])
  })

  it('normalizes modifier quantity relative to the parent selection quantity', () => {
    const selection = {
      quantity: 2,
      modifiers: [
        {
          guid: 'modifier-instance-4',
          item: { guid: 'mod-4-option' },
          displayName: 'Glazed',
          quantity: 2,
        },
      ],
    }

    const menuLookup = new Map([
      [
        'mod-4-option',
        {
          kitchenName: 'Glazed',
          displayName: 'Glazed Donut',
        },
      ],
    ])

    const result = normalizeItemModifiers(selection, menuLookup)

    expect(result).toEqual([
      {
        id: 'glazed',
        identifier: undefined,
        name: 'Glazed',
        quantity: 1,
        groupName: undefined,
        groupId: undefined,
        groupOrder: undefined,
        optionOrder: undefined,
        optionName: undefined,
      },
    ])
  })

  it('prefers kitchen names from the menu lookup when metadata is unavailable', () => {
    const selection = {
      modifiers: [
        {
          guid: 'modifier-instance-4',
          item: { guid: 'mod-3-option' },
          displayName: 'Pepper Jack Cheese',
          quantity: 1,
        },
      ],
    }

    const menuLookup = new Map([
      [
        'mod-3-option',
        {
          kitchenName: 'Pepperjack',
          displayName: 'Pepper Jack Cheese',
          fallbackName: 'Pepper Jack Cheese',
        },
      ],
    ])

    const result = normalizeItemModifiers(selection, menuLookup)

    expect(result).toEqual([
      {
        id: 'pepperjack',
        identifier: undefined,
        name: 'Pepperjack',
        quantity: 1,
        groupName: undefined,
        groupId: undefined,
        groupOrder: undefined,
        optionOrder: undefined,
        optionName: undefined,
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
          menuOrderIndex: 2,
          prepStations: ['station-hot'],
          fulfillmentStatus: 'READY',
          modifiers: [
            {
              id: 'mod-1-option',
              identifier: 'mod-1-option',
              name: 'Sausage',
              quantity: 1,
              groupName: 'Proteins',
              groupId: 'protein-group',
              groupOrder: 0,
              optionOrder: 0,
              optionName: 'Sausage',
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
      prepStationGuids: ['station-hot'],
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
