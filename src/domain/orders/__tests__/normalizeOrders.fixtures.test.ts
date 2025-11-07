import { describe, expect, it } from 'vitest'
import { normalizeOrders } from '../normalizeOrders'
import {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  buildModifierMetadataLookup,
} from '../../menus/menuLookup'
import orderByGuidFixture from '../../../../fixtures/api/order-by-guid.json' with { type: 'json' }
import configSnapshotFixture from '../../../../fixtures/api/config-snapshot.json' with { type: 'json' }
import menusFixture from '../../../../fixtures/api/menus.json' with { type: 'json' }

const buildLookups = () => {
  const menuLookup = buildMenuItemLookup(menusFixture)
  const diningOptionLookup = buildDiningOptionLookup(configSnapshotFixture)
  const modifierMetadataLookup = buildModifierMetadataLookup(menusFixture)

  return { menuLookup, diningOptionLookup, modifierMetadataLookup }
}

describe('normalizeOrders fixture integration', () => {
  it('normalizes sanitized order payloads captured from the worker', () => {
    const { menuLookup, diningOptionLookup, modifierMetadataLookup } = buildLookups()
    const [normalized] = normalizeOrders(
      [orderByGuidFixture.order],
      menuLookup,
      diningOptionLookup,
      modifierMetadataLookup,
    )

    expect(normalized).toBeDefined()
    expect(normalized?.guid).toBe(orderByGuidFixture.order.guid)
    expect(normalized?.items.length).toBeGreaterThan(0)
    expect(normalized?.diningOption).toBeTruthy()
  })
})
