import {
  ensureArray,
  normalizeLookupKey,
  toStringValue,
  pickValue,
  collectStringValuesAtPaths,
  isLikelyGuid,
  extractOrderGuid,
} from '../orders/normalizeOrders'

const DINING_OPTION_COLLECTION_PATHS = [
  'data.diningOptions',
  'data.dining_options',
  'diningOptions',
  'dining_options',
]

const DINING_OPTION_IDENTIFIER_PATHS = [
  'guid',
  'id',
  'uuid',
  'externalId',
  'external_id',
  'value',
  'code',
  'optionGuid',
  'optionId',
  'option.guid',
  'option.id',
  'diningOptionGuid',
  'diningOptionId',
  'dining_option_guid',
  'dining_option_id',
  'diningOption.guid',
  'diningOption.id',
  'dining_option.guid',
  'dining_option.id',
  'dining.optionGuid',
  'dining.optionId',
  'serviceTypeGuid',
  'serviceTypeId',
  'service_type_guid',
  'service_type_id',
  'service.typeGuid',
  'service.typeId',
  'orderTypeGuid',
  'orderTypeId',
  'order_type_guid',
  'order_type_id',
  'order.typeGuid',
  'order.typeId',
  'fulfillmentTypeGuid',
  'fulfillmentTypeId',
  'fulfillment_type_guid',
  'fulfillment_type_id',
  'fulfillment.typeGuid',
  'fulfillment.typeId',
  'channelGuid',
  'channelId',
  'channel.guid',
  'channel.id',
  'modeGuid',
  'modeId',
  'mode.guid',
  'mode.id',
]

const DINING_OPTION_LABEL_PATHS = [
  'name',
  'displayName',
  'display_name',
  'label',
  'title',
  'description',
  'posName',
  'pos_name',
  'webDisplayName',
  'web_display_name',
  'shortName',
  'short_name',
  'defaultName',
  'default_name',
  'externalName',
  'external_name',
  'diningOptionName',
  'dining_option_name',
  'serviceTypeName',
  'service_type_name',
  'orderTypeName',
  'order_type_name',
  'modeName',
  'mode_name',
  'channelName',
  'channel_name',
  'names.*',
  'displayNames.*',
  'labels.*',
  'descriptions.*',
]

const MENU_ITEM_ID_KEYS = [
  'guid',
  'id',
  'sku',
  'code',
  'itemGuid',
  'item_guid',
  'itemId',
  'item_id',
  'menuItemGuid',
  'menu_item_guid',
  'menuItemId',
  'menu_item_id',
  'modifierGuid',
  'modifier_guid',
  'modifierId',
  'modifier_id',
]

const MENU_KITCHEN_NAME_KEYS = ['kitchenName', 'kitchen_name']
const MENU_POS_NAME_KEYS = ['posName', 'pos_name', 'posDisplayName', 'pos_display_name']
const MENU_DISPLAY_NAME_KEYS = ['displayName', 'display_name', 'label', 'title']

const ORDER_CONTEXT_REGEX = /(order|ticket)/i
const OUTSTANDING_KEY_HINTS = [
  'unfulfilled',
  'outstanding',
  'open',
  'pending',
  'awaiting',
  'queue',
  'inprogress',
  'in_progress',
  'prep',
]

const keyIndicatesOutstanding = (key) => {
  if (!key) {
    return false
  }

  const normalized = key.toLowerCase()
  const hasFragment = OUTSTANDING_KEY_HINTS.some((fragment) => normalized.includes(fragment))
  if (!hasFragment) {
    return false
  }

  return ['order', 'ticket', 'guid', 'queue'].some((hint) => normalized.includes(hint))
}

const pathContainsOrderHint = (keyPath) =>
  keyPath.some((key) => (key ? ORDER_CONTEXT_REGEX.test(key) : false))

const buildDiningOptionLookup = (configPayload) => {
  const lookup = new Map()

  if (!configPayload) {
    return lookup
  }

  const addMapping = (keyValue, displayValue) => {
    const normalizedKey = normalizeLookupKey(keyValue)
    if (!normalizedKey) {
      return
    }

    const display = displayValue ?? toStringValue(keyValue)
    if (!display) {
      return
    }

    if (!lookup.has(normalizedKey)) {
      lookup.set(normalizedKey, display)
    }
  }

  let rootCandidates = DINING_OPTION_COLLECTION_PATHS.flatMap((path) => {
    const value = pickValue(configPayload, [path])
    return value === undefined || value === null ? [] : [value]
  })

  if (configPayload && typeof configPayload === 'object' && 'data' in configPayload && configPayload.data) {
    rootCandidates = [...rootCandidates, configPayload.data]
  }

  const processEntry = (entry) => {
    if (entry === undefined || entry === null) {
      return
    }

    if (Array.isArray(entry)) {
      entry.forEach(processEntry)
      return
    }

    if (typeof entry !== 'object') {
      const asString = toStringValue(entry)
      if (asString) {
        addMapping(asString, asString)
      }
      return
    }

    const identifiers = collectStringValuesAtPaths(entry, DINING_OPTION_IDENTIFIER_PATHS)
    const labels = collectStringValuesAtPaths(entry, DINING_OPTION_LABEL_PATHS)
    const primaryLabel = labels[0] ?? identifiers[0]

    if (labels.length > 0) {
      for (const label of labels) {
        addMapping(label, primaryLabel ?? label)
      }
    }

    for (const identifier of identifiers) {
      addMapping(identifier, primaryLabel ?? identifier)
    }

    if (identifiers.length === 0 && labels.length === 0) {
      const fallback = toStringValue(entry)
      if (fallback) {
        addMapping(fallback, fallback)
      }
    }
  }

  if (rootCandidates.length === 0) {
    processEntry(configPayload)
  } else {
    rootCandidates.forEach((candidate) => {
      const collection = ensureArray(candidate)
      if (collection.length === 0 && candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        processEntry(candidate)
        return
      }

      if (collection.length === 0) {
        processEntry(candidate)
        return
      }

      collection.forEach(processEntry)
    })
  }

  return lookup
}

const buildMenuItemLookup = (menuPayload) => {
  const lookup = new Map()

  const visit = (node) => {
    if (!node) {
      return
    }

    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    if (typeof node !== 'object') {
      return
    }

    let identifier
    for (const key of MENU_ITEM_ID_KEYS) {
      const candidate = toStringValue(pickValue(node, [key]))
      if (candidate) {
        identifier = candidate
        break
      }
    }

    const kitchenName = toStringValue(pickValue(node, MENU_KITCHEN_NAME_KEYS))
    const posName = toStringValue(pickValue(node, MENU_POS_NAME_KEYS))
    const displayName = toStringValue(pickValue(node, MENU_DISPLAY_NAME_KEYS))
    const fallbackName =
      toStringValue(pickValue(node, ['name', 'description'])) ?? displayName ?? posName ?? kitchenName

    if (identifier && (kitchenName || posName || displayName || fallbackName)) {
      const existing = lookup.get(identifier) ?? {}

      const nextValue = {
        kitchenName: existing.kitchenName ?? kitchenName ?? undefined,
        posName: existing.posName ?? posName ?? undefined,
        displayName: existing.displayName ?? displayName ?? undefined,
        fallbackName: existing.fallbackName ?? fallbackName ?? undefined,
      }

      lookup.set(identifier, nextValue)
    }

    Object.values(node).forEach(visit)
  }

  visit(menuPayload)

  return lookup
}

const extractUnfulfilledOrderGuids = (menuPayload) => {
  const unfulfilled = new Set()

  const visit = (node, keyPath = []) => {
    if (!node) {
      return
    }

    if (Array.isArray(node)) {
      const lastKey = keyPath[keyPath.length - 1] ?? ''
      const contextHasOrder = pathContainsOrderHint(keyPath)
      const contextIndicatesOutstanding = contextHasOrder && keyIndicatesOutstanding(lastKey)

      node.forEach((item) => {
        if (typeof item === 'string') {
          if (contextIndicatesOutstanding && isLikelyGuid(item)) {
            unfulfilled.add(item.trim())
          }
        } else {
          visit(item, keyPath)
        }
      })

      return
    }

    if (typeof node !== 'object') {
      return
    }

    const pathHasOrder = pathContainsOrderHint(keyPath)
    const pathHasOutstanding = keyPath.some((key) => keyIndicatesOutstanding(key))

    const guid = extractOrderGuid(node)
    if (guid && (pathHasOrder || pathHasOutstanding)) {
      const fulfilledFlag = pickValue(node, ['fulfilled', 'isFulfilled', 'is_fulfilled'])
      let include = false

      if (fulfilledFlag !== undefined && fulfilledFlag !== null) {
        const normalizedFlag =
          typeof fulfilledFlag === 'string'
            ? fulfilledFlag.toLowerCase() === 'true'
            : !!fulfilledFlag
        include = !normalizedFlag
      } else {
        const status = toStringValue(
          pickValue(node, ['status', 'fulfillmentStatus', 'fulfillment_status', 'state', 'stage']),
        )

        if (status) {
          include = !status.toLowerCase().includes('fulfill')
        } else if (pathHasOutstanding) {
          include = true
        }
      }

      if (include) {
        unfulfilled.add(guid)
      }
    }

    Object.entries(node).forEach(([key, value]) => visit(value, [...keyPath, key]))
  }

  visit(menuPayload, [])

  return unfulfilled
}

export { buildDiningOptionLookup, buildMenuItemLookup, extractUnfulfilledOrderGuids }
