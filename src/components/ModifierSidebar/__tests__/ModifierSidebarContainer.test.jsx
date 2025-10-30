import { describe, expect, it } from 'vitest'
import { deriveModifiersFromOrders } from '../ModifierSidebarContainer'

describe('deriveModifiersFromOrders', () => {
  it('groups modifiers by category and respects menu ordering', () => {
    const orders = [
      {
        items: [
          {
            quantity: 2,
            modifiers: [
              {
                name: 'Chocolate Glaze',
                quantity: 1,
                identifier: 'opt-1',
                groupName: 'Glazes',
                groupId: 'group-glazes',
                groupOrder: 1,
                optionOrder: 2,
              },
              {
                name: 'Vanilla Bean',
                quantity: 3,
                identifier: 'opt-2',
                groupName: 'Glazes',
                groupId: 'group-glazes',
                groupOrder: 1,
                optionOrder: 0,
              },
            ],
          },
        ],
      },
    ]

    const result = deriveModifiersFromOrders(orders)

    expect(result).toHaveLength(1)
    const [group] = result
    expect(group.name).toBe('Glazes')
    expect(group.items).toHaveLength(2)
    expect(group.items[0]).toMatchObject({ name: 'Vanilla Bean', qty: 6 })
    expect(group.items[1]).toMatchObject({ name: 'Chocolate Glaze', qty: 2 })
  })

  it('falls back to an uncategorized group when metadata is missing', () => {
    const orders = [
      {
        items: [
          {
            quantity: 1,
            modifiers: [
              { name: 'Extra Sauce', quantity: 2 },
              { name: 'Pepperoni', quantity: 1, groupName: 'Proteins' },
              { name: 'Arugula', quantity: 1, groupName: 'Greens' },
            ],
          },
        ],
      },
    ]

    const result = deriveModifiersFromOrders(orders)

    expect(result.map((group) => group.name)).toEqual([
      'Greens',
      'Proteins',
      'Other modifiers',
    ])

    const uncategorized = result.find((group) => group.name === 'Other modifiers')
    expect(uncategorized?.items).toHaveLength(1)
    expect(uncategorized?.items[0]).toMatchObject({ name: 'Extra Sauce', qty: 2 })
  })
})
