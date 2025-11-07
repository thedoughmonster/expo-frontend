import { describe, expect, it } from 'vitest'

import {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  buildModifierMetadataLookup,
  extractUnfulfilledOrderGuids,
} from '../menuLookup'
import { normalizeLookupKey } from '../../orders/normalizeOrders'

const configSnapshot = {
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

const menuDocument = {
  menu: {
    restaurantGuid: 'restaurant-guid',
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
        ],
        menuGroups: [
          {
            name: 'Build Your Own',
            menuItems: [
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

const ordersPayload = {
  orders: [
    {
      guid: 'order-ready',
      checks: [
        {
          selections: [
            {
              guid: 'selection-ready',
              fulfillmentStatus: 'READY',
            },
          ],
        },
      ],
    },
    {
      guid: 'order-new',
      checks: [
        {
          selections: [
            {
              guid: 'selection-new',
              fulfillmentStatus: 'NEW',
            },
          ],
        },
      ],
    },
    {
      guid: 'order-missing',
      checks: [
        {
          selections: [
            {
              guid: 'selection-missing-status',
            },
          ],
        },
      ],
    },
  ],
}

describe('buildDiningOptionLookup', () => {
  it('indexes dining options by guid and externalId', () => {
    const lookup = buildDiningOptionLookup(configSnapshot)

    const guidKey = normalizeLookupKey('dine-in-guid')
    const externalKey = normalizeLookupKey('DINING_ROOM')
    const takeoutKey = normalizeLookupKey('takeout-guid')

    expect(lookup.get(guidKey)).toBe('Dine In')
    expect(lookup.get(externalKey)).toBe('Dine In')
    expect(lookup.get(takeoutKey)).toBe('Take Out')
  })
})

describe('buildMenuItemLookup', () => {
  it('maps menu items and modifier options using documented identifiers', () => {
    const lookup = buildMenuItemLookup(menuDocument)

    expect(lookup.get('menu-item-1')).toEqual({
      kitchenName: 'Bagel',
      posName: undefined,
      displayName: 'Bagel',
      fallbackName: 'Bagel',
      menuOrderIndex: 0,
      prepStations: ['station-bake'],
    })

    expect(lookup.get('selection-1')).toEqual({
      kitchenName: 'Build-A-Brekky',
      posName: undefined,
      displayName: 'Build-A-Brekky',
      fallbackName: 'Build-A-Brekky',
      menuOrderIndex: 2,
      prepStations: ['station-hot'],
    })

    expect(lookup.get('mod-1-option')).toEqual({
      kitchenName: undefined,
      posName: undefined,
      displayName: 'Sausage',
      fallbackName: 'Sausage',
      menuOrderIndex: undefined,
      prepStations: undefined,
    })

    expect(lookup.get('200')).toEqual({
      kitchenName: undefined,
      posName: undefined,
      displayName: 'Sausage',
      fallbackName: 'Sausage',
      menuOrderIndex: undefined,
      prepStations: undefined,
    })
  })
})

describe('buildModifierMetadataLookup', () => {
  it('returns group metadata keyed by modifier references and guids', () => {
    const metadata = buildModifierMetadataLookup(menuDocument)

    expect(metadata.get('mod-1-option')).toEqual({
      groupName: 'Proteins',
      groupId: 'protein-group',
      groupOrder: 0,
      optionOrder: 0,
      optionName: 'Sausage',
    })

    expect(metadata.get('201')).toEqual({
      groupName: 'Cheese',
      groupId: 'cheese-group',
      groupOrder: 1,
      optionOrder: 0,
      optionName: 'American Cheese',
    })
  })
})

describe('extractUnfulfilledOrderGuids', () => {
  it('identifies orders with selections that are not READY', () => {
    const guids = Array.from(extractUnfulfilledOrderGuids(ordersPayload))

    expect(guids.sort()).toEqual(['order-missing', 'order-new'])
  })
})

