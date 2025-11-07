import { ensureArray, normalizeLookupKey, toStringValue } from '../orders/normalizeOrders'

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toFiniteOrder = (value) => {
  if (Number.isFinite(value) && value >= 0) {
    return value
  }

  return undefined
}

const resolveMenuDocument = (menuPayload) => {
  if (!isRecord(menuPayload)) {
    return undefined
  }

  if (isRecord(menuPayload.menu)) {
    return menuPayload.menu
  }

  if (isRecord(menuPayload.data)) {
    return menuPayload.data
  }

  return menuPayload
}

const collectDiningOptions = (configPayload) => {
  if (!isRecord(configPayload) || !isRecord(configPayload.data)) {
    return []
  }

  const { diningOptions } = configPayload.data

  if (Array.isArray(diningOptions)) {
    return diningOptions.filter(isRecord)
  }

  if (isRecord(diningOptions)) {
    return Object.values(diningOptions).filter(isRecord)
  }

  return []
}

const buildDiningOptionLookup = (configPayload) => {
  const lookup = new Map()

  const options = collectDiningOptions(configPayload)
  options.forEach((option) => {
    const guid = toStringValue(option.guid)?.trim()
    const externalId = toStringValue(option.externalId)?.trim()
    const behavior = toStringValue(option.behavior)?.trim()
    const name = toStringValue(option.name)?.trim()
    const displayName = toStringValue(option.displayName)?.trim()

    const displayValue = name ?? displayName ?? behavior ?? guid ?? externalId
    if (!displayValue) {
      return
    }

    const identifiers = [guid, externalId]
    identifiers.forEach((identifier) => {
      const normalizedKey = normalizeLookupKey(identifier)
      if (normalizedKey && !lookup.has(normalizedKey)) {
        lookup.set(normalizedKey, displayValue)
      }
    })
  })

  return lookup
}

const buildMenuItemLookup = (menuPayload) => {
  const lookup = new Map()
  const menuDocument = resolveMenuDocument(menuPayload)

  if (!isRecord(menuDocument)) {
    return lookup
  }

  const mergePrepStations = (existingStations = [], nextStations = []) => {
    const stationSet = new Set()
    ensureArray(existingStations)
      .map((value) => toStringValue(value)?.trim())
      .filter(Boolean)
      .forEach((station) => stationSet.add(station))
    ensureArray(nextStations)
      .map((value) => toStringValue(value)?.trim())
      .filter(Boolean)
      .forEach((station) => stationSet.add(station))

    return stationSet.size > 0 ? Array.from(stationSet) : undefined
  }

  const upsertEntry = (identifier, value) => {
    const key = toStringValue(identifier)?.trim()
    if (!key) {
      return
    }

    const existing = lookup.get(key) ?? {}
    const merged = {
      kitchenName: existing.kitchenName ?? value.kitchenName ?? undefined,
      posName: existing.posName ?? value.posName ?? undefined,
      displayName: existing.displayName ?? value.displayName ?? undefined,
      fallbackName: existing.fallbackName ?? value.fallbackName ?? undefined,
      menuOrderIndex:
        existing.menuOrderIndex !== undefined
          ? existing.menuOrderIndex
          : value.menuOrderIndex !== undefined
            ? value.menuOrderIndex
            : undefined,
      prepStations: mergePrepStations(existing.prepStations, value.prepStations),
    }

    lookup.set(key, merged)
  }

  let nextMenuOrderIndex = 0

  const registerMenuItem = (item) => {
    if (!isRecord(item)) {
      return
    }

    const guid = toStringValue(item.guid)?.trim()
    const multiLocationId = toStringValue(item.multiLocationId)?.trim()
    const kitchenName = toStringValue(item.kitchenName)?.trim()
    const name = toStringValue(item.name)?.trim()
    const prepStations = Array.isArray(item.prepStations) ? item.prepStations : undefined

    if (!guid && !multiLocationId) {
      return
    }

    const entry = {
      kitchenName: kitchenName ?? undefined,
      displayName: name ?? undefined,
      fallbackName: name ?? kitchenName ?? undefined,
      menuOrderIndex: nextMenuOrderIndex,
      prepStations,
    }

    nextMenuOrderIndex += 1

    ;[guid, multiLocationId].forEach((identifier) => upsertEntry(identifier, entry))
  }

  const processMenuGroup = (group) => {
    if (!isRecord(group)) {
      return
    }

    ensureArray(group.menuItems).forEach(registerMenuItem)
    ensureArray(group.menuGroups).forEach(processMenuGroup)
  }

  ensureArray(menuDocument.menus).forEach((menu) => {
    if (!isRecord(menu)) {
      return
    }

    ensureArray(menu.menuItems).forEach(registerMenuItem)
    ensureArray(menu.menuGroups).forEach(processMenuGroup)
  })

  if (isRecord(menuDocument.modifierOptionReferences)) {
    Object.values(menuDocument.modifierOptionReferences)
      .filter(isRecord)
      .forEach((option) => {
        const guid = toStringValue(option.guid)?.trim()
        const referenceId = option.referenceId
        const name = toStringValue(option.name)?.trim()

        const entry = {
          kitchenName: undefined,
          displayName: name ?? undefined,
          fallbackName: name ?? undefined,
          menuOrderIndex: undefined,
          prepStations: undefined,
        }

        const identifiers = [guid]
        if (Number.isFinite(referenceId)) {
          identifiers.push(String(referenceId))
        }

        identifiers.forEach((identifier) => upsertEntry(identifier, entry))
      })
  }

  return lookup
}

const buildModifierMetadataLookup = (menuPayload) => {
  const lookup = new Map()
  const menuDocument = resolveMenuDocument(menuPayload)

  if (!isRecord(menuDocument) || !isRecord(menuDocument.modifierGroupReferences)) {
    return lookup
  }

  const groupReferences = menuDocument.modifierGroupReferences
  const optionReferences = isRecord(menuDocument.modifierOptionReferences)
    ? menuDocument.modifierOptionReferences
    : {}

  const groupOrderLookup = new Map()
  let nextGroupOrder = 0

  const registerGroupReference = (value) => {
    if (value === undefined || value === null) {
      return
    }

    let reference
    if (typeof value === 'number' || typeof value === 'string') {
      reference = String(value)
    }

    if (!reference) {
      return
    }

    if (!groupReferences[reference]) {
      return
    }

    if (!groupOrderLookup.has(reference)) {
      groupOrderLookup.set(reference, nextGroupOrder)
      nextGroupOrder += 1
    }
  }

  const registerMenuItemGroups = (item) => {
    if (!isRecord(item)) {
      return
    }

    ensureArray(item.modifierGroupReferences).forEach(registerGroupReference)
  }

  const processMenuGroup = (group) => {
    if (!isRecord(group)) {
      return
    }

    ensureArray(group.menuItems).forEach(registerMenuItemGroups)
    ensureArray(group.menuGroups).forEach(processMenuGroup)
  }

  ensureArray(menuDocument.menus).forEach((menu) => {
    if (!isRecord(menu)) {
      return
    }

    ensureArray(menu.menuItems).forEach(registerMenuItemGroups)
    ensureArray(menu.menuGroups).forEach(processMenuGroup)
  })

  const rank = (metadata) => {
    const groupRank = Number.isFinite(metadata.groupOrder)
      ? metadata.groupOrder
      : Number.POSITIVE_INFINITY
    const optionRank = Number.isFinite(metadata.optionOrder)
      ? metadata.optionOrder
      : Number.POSITIVE_INFINITY

    return groupRank * 100000 + optionRank
  }

  const applyMetadata = (identifier, metadata) => {
    const key = toStringValue(identifier)?.trim()
    if (!key) {
      return
    }

    const existing = lookup.get(key)
    if (!existing || rank(metadata) < rank(existing)) {
      lookup.set(key, metadata)
    }
  }

  Object.entries(groupReferences).forEach(([referenceKey, group]) => {
    if (!isRecord(group)) {
      return
    }

    const groupReferenceId = Number.isFinite(group.referenceId)
      ? String(group.referenceId)
      : String(referenceKey)
    const groupOrder = toFiniteOrder(groupOrderLookup.get(groupReferenceId))
    const groupName = toStringValue(group.name)?.trim()
    const groupId = toStringValue(group.guid)?.trim()

    ensureArray(group.modifierOptionReferences).forEach((optionReference, optionIndex) => {
      if (!(typeof optionReference === 'number' || typeof optionReference === 'string')) {
        return
      }

      const optionKey = String(optionReference)
      const optionRecord = optionReferences[optionKey]
      const optionName = isRecord(optionRecord) ? toStringValue(optionRecord.name)?.trim() : undefined
      const optionGuid = isRecord(optionRecord) ? toStringValue(optionRecord.guid)?.trim() : undefined

      const metadata = {
        groupName: groupName ?? undefined,
        groupId: groupId ?? undefined,
        groupOrder,
        optionOrder: toFiniteOrder(optionIndex),
        optionName: optionName ?? undefined,
      }

      applyMetadata(optionKey, metadata)

      if (optionGuid) {
        applyMetadata(optionGuid, metadata)
      }

      if (isRecord(optionRecord) && Number.isFinite(optionRecord.referenceId)) {
        applyMetadata(String(optionRecord.referenceId), metadata)
      }
    })
  })

  return lookup
}

const extractUnfulfilledOrderGuids = (ordersPayload) => {
  const unfulfilled = new Set()

  const orders = (() => {
    if (Array.isArray(ordersPayload?.orders)) {
      return ordersPayload.orders.filter(isRecord)
    }

    if (Array.isArray(ordersPayload?.data)) {
      return ordersPayload.data.filter(isRecord)
    }

    return []
  })()

  orders.forEach((order) => {
    const guid = toStringValue(order.guid)?.trim()
    if (!guid) {
      return
    }

    const checks = ensureArray(order.checks)
    if (checks.length === 0) {
      return
    }

    const hasOutstandingSelection = checks.some((check) => {
      const selections = ensureArray(check?.selections)
      if (selections.length === 0) {
        return true
      }

      return selections.some((selection) => {
        const status = toStringValue(selection?.fulfillmentStatus)?.trim()?.toUpperCase()
        if (!status) {
          return true
        }

        return status !== 'READY'
      })
    })

    if (hasOutstandingSelection) {
      unfulfilled.add(guid)
    }
  })

  return unfulfilled
}

export {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  buildModifierMetadataLookup,
  extractUnfulfilledOrderGuids,
}
