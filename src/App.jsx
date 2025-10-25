import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders/latest'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
  }

  return []
}

const ORDER_ITEM_COLLECTION_KEYS = [
  'items',
  'line_items',
  'lineItems',
  'products',
  'order_items',
  'entries',
  'cartItems',
  'details.items',
  'summary.items',
  'cart.items',
  'cart.lineItems',
  'cart.selections',
  'cart.items.nodes',
  'cart.items.edges[].node',
  'items.nodes',
  'items.edges',
  'items.edges[].node',
  'items.values',
  'checks[].items',
  'checks[].items.nodes',
  'checks[].items.edges',
  'checks[].items.edges[].node',
  'checks[].selections',
  'checks[].selections.nodes',
  'checks[].selections.edges',
  'checks[].selections.edges[].node',
  'checks[].entries',
  'checks[].lineItems',
  'checks[].line_items',
  'checks[].menuItems',
  'checks[].choices',
]

const ORDER_ITEM_MODIFIER_COLLECTION_KEYS = [
  'modifiers',
  'modifier',
  'modifierItems',
  'modifier_items',
  'modifierList',
  'modifierGroups',
  'modifierGroups[].modifiers',
  'modifierGroups[].items',
  'modifierGroups[].options',
  'modifier_groups',
  'modifier_groups[].modifiers',
  'modifier_groups[].items',
  'modifier_groups[].options',
  'options',
  'options.items',
  'options.nodes',
  'options.edges',
  'options.edges[].node',
  'selectedOptions',
  'selectedOptions.nodes',
  'selectedOptions.edges',
  'selectedOptions.edges[].node',
  'selectedModifiers',
  'selectedModifiers.nodes',
  'selectedModifiers.edges',
  'selectedModifiers.edges[].node',
  'appliedModifiers',
  'appliedModifiers.nodes',
  'appliedModifiers.edges',
  'appliedModifiers.edges[].node',
  'selections',
  'selections.items',
  'selections.nodes',
  'selections.edges',
  'selections.edges[].node',
  'choice',
  'choices',
  'choices.nodes',
  'choices.edges',
  'choices.edges[].node',
  'choiceGroups',
  'choiceGroups[].choices',
  'customizations',
  'customizations.nodes',
  'customizations.edges',
  'customizations.edges[].node',
  'addOns',
  'addOns.nodes',
  'addOns.edges',
  'addOns.edges[].node',
  'add_ons',
  'add_ons.nodes',
  'add_ons.edges',
  'add_ons.edges[].node',
  'extras',
  'extras.nodes',
  'extras.edges',
  'extras.edges[].node',
  'toppings',
  'ingredients',
  'ingredients.nodes',
  'ingredients.edges',
  'ingredients.edges[].node',
  'modifications',
  'modificationsList',
  'modifications.nodes',
  'modifications.edges',
  'modifications.edges[].node',
]

const splitKeyPathSegments = (key) =>
  key
    .split('.')
    .flatMap((segment) => {
      if (!segment) {
        return []
      }

      if (segment === '*') {
        return ['*']
      }

      if (segment.endsWith('[]')) {
        const base = segment.slice(0, -2)
        return base ? [base, '*'] : ['*']
      }

      return [segment]
    })

const collectValuesAtKeyPath = (source, key) => {
  if (!source) {
    return []
  }

  const segments = splitKeyPathSegments(key)
  let current = [source]

  for (const segment of segments) {
    const next = []

    for (const value of current) {
      if (value === undefined || value === null) {
        continue
      }

      if (segment === '*') {
        if (Array.isArray(value)) {
          next.push(...value)
        } else if (typeof value === 'object') {
          next.push(...Object.values(value))
        }
        continue
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry && typeof entry === 'object') {
            next.push(entry[segment])
          }
        }
      } else if (typeof value === 'object') {
        next.push(value[segment])
      }
    }

    current = next
  }

  return current.filter((value) => value !== undefined && value !== null)
}

const ORDER_PRIMARY_HINT_KEYS = [
  'displayId',
  'display_id',
  'orderNumber',
  'order_number',
  'ticket',
  'number',
  'id',
  'reference',
  'name',
  'orderId',
  'order_id',
  'guid',
  'uuid',
]

const ORDER_SECONDARY_HINT_KEYS = [
  'status',
  'orderStatus',
  'state',
  'stage',
  'fulfillment_status',
  'createdAt',
  'created_at',
  'placedAt',
  'placed_at',
  'timestamp',
  'time',
  'submitted_at',
  'total',
  'totalPrice',
  'total_price',
  'amount',
  'amount_total',
  'order_total',
  'currency',
  'currencyCode',
  'customer',
  'customerName',
  'customer_name',
  'guest',
  'client',
  'user',
  'notes',
  'note',
  'specialInstructions',
  'instructions',
]

const looksLikeOrderRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const hasItems = ORDER_ITEM_COLLECTION_KEYS.some((key) => {
    const candidates = collectValuesAtKeyPath(value, key)
    return candidates.some((candidate) => {
      if (Array.isArray(candidate)) {
        return candidate.length > 0
      }

      return candidate && typeof candidate === 'object'
    })
  })
  if (hasItems) {
    return true
  }

  const hasPrimaryHint = ORDER_PRIMARY_HINT_KEYS.some((key) => key in value)
  if (!hasPrimaryHint) {
    return false
  }

  return ORDER_SECONDARY_HINT_KEYS.some((key) => key in value)
}

const collectOrdersFromCandidate = (candidate) => {
  const queue = []

  if (candidate !== undefined && candidate !== null) {
    if (Array.isArray(candidate)) {
      queue.push(...candidate)
    } else {
      queue.push(candidate)
    }
  }

  const orders = []
  const seen = new WeakSet()

  while (queue.length > 0) {
    const value = queue.shift()

    if (Array.isArray(value)) {
      queue.push(...value)
      continue
    }

    if (!value || typeof value !== 'object') {
      continue
    }

    if (seen.has(value)) {
      continue
    }

    seen.add(value)

    if (looksLikeOrderRecord(value)) {
      orders.push(value)
      continue
    }

    for (const nested of Object.values(value)) {
      if (nested && (typeof nested === 'object' || Array.isArray(nested))) {
        queue.push(nested)
      }
    }
  }

  return orders
}

const pickValue = (source, keys) => {
  if (!source) {
    return undefined
  }

  for (const key of keys) {
    const path = key.split('.')
    let current = source

    for (const segment of path) {
      if (current == null) {
        break
      }

      current = current[segment]
    }

    if (current !== undefined && current !== null && current !== '') {
      return current
    }
  }

  return undefined
}

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.-]+/g, '')
    if (sanitized) {
      const parsed = Number(sanitized)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  return undefined
}

const toStringValue = (value) => {
  const visit = (input, seen = new Set()) => {
    if (input === undefined || input === null) {
      return undefined
    }

    if (typeof input === 'string') {
      return input
    }

    if (typeof input === 'number' && Number.isFinite(input)) {
      return String(input)
    }

    if (typeof input === 'bigint') {
      return input.toString()
    }

    if (typeof input === 'boolean') {
      return input ? 'true' : 'false'
    }

    if (input instanceof Date && !Number.isNaN(input.getTime())) {
      return input.toISOString()
    }

    if (Array.isArray(input)) {
      const parts = input.map((entry) => visit(entry, seen)).filter(Boolean)
      return parts.length > 0 ? parts.join(', ') : undefined
    }

    if (typeof input === 'object') {
      if (seen.has(input)) {
        return undefined
      }

      seen.add(input)

      if (typeof input.toString === 'function' && input.toString !== Object.prototype.toString) {
        const fromToString = input.toString()
        if (fromToString && fromToString !== '[object Object]') {
          return fromToString
        }
      }

      const preferredKeys = [
        'display',
        'displayId',
        'display_id',
        'formatted',
        'short',
        'value',
        'text',
        'label',
        'name',
        'title',
        'id',
        'number',
        'code',
        'guid',
        'uuid',
      ]

      for (const key of preferredKeys) {
        if (key in input) {
          const nested = visit(input[key], seen)
          if (nested) {
            return nested
          }
        }
      }

      for (const nested of Object.values(input)) {
        const converted = visit(nested, seen)
        if (converted) {
          return converted
        }
      }

      return undefined
    }

    try {
      return String(input)
    } catch {
      return undefined
    }
  }

  const result = visit(value)
  if (typeof result === 'string') {
    const trimmed = result.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  return result
}

const parseDateLike = (value) => {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000
    const parsed = new Date(milliseconds)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      const fromNumeric = parseDateLike(numeric)
      if (fromNumeric) {
        return fromNumeric
      }
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  return undefined
}

const isLikelyGuid = (value) => {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  if (trimmed.length < 8) {
    return false
  }

  if (!/^[0-9a-f-]+$/i.test(trimmed)) {
    return false
  }

  return trimmed.includes('-') || /[a-f]/i.test(trimmed)
}

const ORDER_GUID_KEYS = [
  'guid',
  'orderGuid',
  'order_guid',
  'orderId',
  'order_id',
  'uuid',
  'id',
  'ticketGuid',
  'ticket_guid',
]

const extractOrderGuid = (order) => {
  if (!order || typeof order !== 'object') {
    return undefined
  }

  for (const key of ORDER_GUID_KEYS) {
    const candidate = toStringValue(pickValue(order, [key]))
    if (candidate && isLikelyGuid(candidate)) {
      return candidate
    }
  }

  return undefined
}

const MENU_ITEM_ID_KEYS = ['guid', 'id', 'sku', 'code', 'itemGuid', 'item_guid', 'itemId', 'item_id']

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

    const name = toStringValue(pickValue(node, ['name', 'title', 'label', 'description']))
    if (identifier && name) {
      lookup.set(identifier, name)
    }

    Object.values(node).forEach(visit)
  }

  visit(menuPayload)

  return lookup
}

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

const normalizeItemModifiers = (item) => {
  if (!item || typeof item !== 'object') {
    return []
  }

  const queue = []
  const seenArrays = new WeakSet()
  const seenObjects = new WeakSet()
  const collected = []

  const pushCandidate = (candidate) => {
    if (candidate === undefined || candidate === null) {
      return
    }

    queue.push(candidate)
  }

  ORDER_ITEM_MODIFIER_COLLECTION_KEYS.forEach((key) => {
    const values = collectValuesAtKeyPath(item, key)
    values.forEach(pushCandidate)
  })

  const containerKeys = [
    'modifiers',
    'modifier',
    'modifierItems',
    'modifier_items',
    'modifierList',
    'modifierGroups',
    'modifier_groups',
    'groupModifiers',
    'group_modifiers',
    'options',
    'selectedOptions',
    'selectedModifiers',
    'appliedModifiers',
    'selections',
    'choice',
    'choices',
    'choiceGroups',
    'customizations',
    'modifications',
    'modificationsList',
    'addOns',
    'add_ons',
    'extras',
    'toppings',
    'ingredients',
    'children',
    'childItems',
    'components',
    'items',
    'entries',
    'values',
    'nodes',
    'edges',
    'menuItems',
    'menu_items',
  ]

  while (queue.length > 0) {
    const candidate = queue.shift()

    if (!candidate) {
      continue
    }

    if (Array.isArray(candidate)) {
      if (candidate.length === 0 || seenArrays.has(candidate)) {
        continue
      }

      seenArrays.add(candidate)
      candidate.forEach(pushCandidate)
      continue
    }

    if (typeof candidate === 'string') {
      collected.push({ name: candidate, quantity: 1 })
      continue
    }

    if (typeof candidate !== 'object') {
      continue
    }

    if (seenObjects.has(candidate)) {
      continue
    }

    seenObjects.add(candidate)

    const entries = Object.entries(candidate)

    let name = toStringValue(
      pickValue(candidate, [
        'name',
        'title',
        'label',
        'modifier',
        'value',
        'description',
        'option',
        'optionName',
        'choice',
        'choiceName',
        'selection',
        'selectionName',
        'menuItem',
        'menu_item',
        'itemName',
        'displayName',
      ]),
    )

    if (!name && entries.length === 1) {
      const [singleKey, singleValue] = entries[0]
      const keyName = toStringValue(singleKey)
      if (keyName) {
        if (typeof singleValue === 'number' || typeof singleValue === 'string') {
          const quantity = toNumber(singleValue)
          if (quantity && quantity > 0) {
            collected.push({ name: keyName, quantity })
            continue
          }
        }

        if (singleValue && typeof singleValue === 'object') {
          pushCandidate({ ...singleValue, name: singleValue.name ?? keyName })
          continue
        }
      }
    }

    const quantityRaw = toNumber(
      pickValue(candidate, [
        'quantity',
        'qty',
        'count',
        'amount',
        'total',
        'value',
        'number',
        'quantity.value',
        'count.value',
        'quantity.amount',
        'quantity.count',
      ]),
    )
    const normalizedQuantity = quantityRaw && quantityRaw > 0 ? quantityRaw : 1

    const selectionFlagRaw = pickValue(candidate, [
      'selected',
      'isSelected',
      'applied',
      'isApplied',
      'chosen',
      'isChosen',
      'enabled',
      'isEnabled',
    ])
    const selectionFlag =
      selectionFlagRaw !== undefined
        ? typeof selectionFlagRaw === 'string'
          ? selectionFlagRaw.toLowerCase() === 'true'
          : !!selectionFlagRaw
        : undefined

    const priceValue = toNumber(pickValue(candidate, ['price', 'unitPrice', 'price.value', 'price.amount']))

    let forwarded = false
    for (const key of containerKeys) {
      if (key in candidate && candidate[key] !== undefined && candidate[key] !== null) {
        forwarded = true
        pushCandidate(candidate[key])
      }
    }

    for (const value of entries.map(([, entryValue]) => entryValue)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' || Array.isArray(value)) {
          pushCandidate(value)
        }
      }
    }

    if (name) {
      const shouldAdd = !forwarded || quantityRaw || priceValue !== undefined || selectionFlag
      if (shouldAdd) {
        collected.push({ name, quantity: normalizedQuantity })
      }
    }
  }

  if (collected.length === 0) {
    return []
  }

  const aggregated = new Map()

  collected.forEach(({ name, quantity }) => {
    if (!name) {
      return
    }

    const normalizedQuantity = quantity && quantity > 0 ? quantity : 1
    if (!aggregated.has(name)) {
      aggregated.set(name, { name, quantity: normalizedQuantity })
      return
    }

    const existing = aggregated.get(name)
    existing.quantity += normalizedQuantity
  })

  return Array.from(aggregated.values())
}

const ORDER_ITEM_IDENTIFIER_KEYS = [
  'id',
  'uuid',
  'guid',
  'sku',
  'code',
  'itemGuid',
  'item_guid',
  'itemId',
  'item_id',
  'line_id',
  'lineId',
  'menuItemGuid',
  'menu_item_guid',
  'menuItemId',
  'menu_item_id',
  'selectionGuid',
  'selection_guid',
  'selectionId',
  'selection_id',
  'checkItemId',
  'check_item_id',
  'item.guid',
  'item.id',
  'menuItem.guid',
  'menuItem.id',
  'menu_item.guid',
  'menu_item.id',
]

const ORDER_ITEM_NAME_KEYS = [
  'name',
  'title',
  'displayName',
  'display_name',
  'itemName',
  'item_name',
  'productName',
  'product_name',
  'menuItemName',
  'menu_item_name',
  'description',
  'menuItem.name',
  'menu_item.name',
  'item.name',
  'product.name',
  'selection.name',
]

const ORDER_ITEM_QUANTITY_KEYS = [
  'quantity.value',
  'quantity.count',
  'count.value',
  'quantity',
  'qty',
  'count',
  'quantityOrdered',
  'quantity_ordered',
  'amount',
]

const ORDER_ITEM_PRICE_KEYS = [
  'price.amount',
  'price.value',
  'unitPrice.amount',
  'unit_price.amount',
  'total.amount',
  'totals.total',
  'amount_total',
  'price_total',
  'priceTotal',
  'unitPrice',
  'unit_price',
  'price',
  'total',
  'cost',
  'basePrice',
  'base_price',
  'menuItem.price.amount',
  'menuItem.price',
  'menu_item.price.amount',
  'menu_item.price',
  'item.price.amount',
  'item.price',
]

const ORDER_ITEM_HINT_KEYS = [
  ...ORDER_ITEM_NAME_KEYS,
  ...ORDER_ITEM_QUANTITY_KEYS,
  ...ORDER_ITEM_PRICE_KEYS,
  'currency',
  'currencyCode',
  'notes',
  'note',
  'specialInstructions',
  'instructions',
]

const hasItemHints = (value) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return ORDER_ITEM_HINT_KEYS.some((key) => {
    const candidate = pickValue(value, [key])

    if (candidate === undefined || candidate === null) {
      return false
    }

    if (Array.isArray(candidate)) {
      return candidate.length > 0
    }

    if (typeof candidate === 'object') {
      return false
    }

    if (typeof candidate === 'string') {
      return candidate.trim().length > 0
    }

    if (typeof candidate === 'number') {
      return Number.isFinite(candidate)
    }

    if (typeof candidate === 'boolean') {
      return true
    }

    return true
  })
}

const normalizeOrderItems = (order, menuLookup) => {
  if (!order || typeof order !== 'object') {
    return []
  }

  const candidateItems = []
  const seenObjects = new WeakSet()
  const seenArrays = new WeakSet()

  const processValue = (value) => {
    if (!value) {
      return
    }

    if (Array.isArray(value)) {
      if (value.length === 0 || seenArrays.has(value)) {
        return
      }

      seenArrays.add(value)
      value.forEach(processValue)
      return
    }

    if (typeof value !== 'object') {
      return
    }

    if (seenObjects.has(value)) {
      return
    }

    if (hasItemHints(value)) {
      seenObjects.add(value)
      candidateItems.push(value)
      return
    }

    seenObjects.add(value)
    Object.values(value).forEach(processValue)
  }

  for (const key of ORDER_ITEM_COLLECTION_KEYS) {
    const values = collectValuesAtKeyPath(order, key)
    values.forEach(processValue)
  }

  if (candidateItems.length === 0) {
    return []
  }

  return candidateItems.map((item, index) => {
    const fallbackName = `Item ${index + 1}`
    const baseName = toStringValue(pickValue(item, ORDER_ITEM_NAME_KEYS))
    const quantity = toNumber(pickValue(item, ORDER_ITEM_QUANTITY_KEYS)) ?? 1
    const price = toNumber(pickValue(item, ORDER_ITEM_PRICE_KEYS))
    const currency = toStringValue(pickValue(item, ['currency', 'currencyCode']))
    const notes = toStringValue(pickValue(item, ['notes', 'note', 'specialInstructions', 'instructions']))
    const modifiers = normalizeItemModifiers(item)

    let rawIdentifier
    for (const key of ORDER_ITEM_IDENTIFIER_KEYS) {
      const candidate = toStringValue(pickValue(item, [key]))
      if (candidate) {
        rawIdentifier = candidate
        break
      }
    }

    const identifier = rawIdentifier ?? `${index}`
    const menuName = rawIdentifier && menuLookup ? menuLookup.get(rawIdentifier) : undefined
    let name = baseName

    if ((!name || name === fallbackName) && menuName) {
      name = menuName
    }

    if (!name) {
      name = fallbackName
    }

    return {
      id: identifier,
      name,
      quantity,
      price,
      currency,
      notes,
      modifiers,
    }
  })
}

const normalizeOrders = (rawOrders, menuLookup = new Map()) => {
  const collection = ensureArray(rawOrders)

  return collection.map((order, index) => {
    if (!order || typeof order !== 'object') {
      return null
    }

    const guid = extractOrderGuid(order)
    const displayId = toStringValue(
      pickValue(order, [
        'displayId',
        'display_id',
        'orderNumber',
        'order_number',
        'ticket',
        'number',
        'id',
        'reference',
        'name',
      ]),
    )

    const status = toStringValue(pickValue(order, ['status', 'orderStatus', 'state', 'stage', 'fulfillment_status']))
    const createdAtRaw =
      pickValue(order, ['createdAt', 'created_at', 'placedAt', 'placed_at', 'timestamp', 'time', 'submitted_at']) ??
      pickValue(order, ['timing.createdAt', 'timing.created_at'])
    const createdAt = parseDateLike(createdAtRaw)
    const total = toNumber(
      pickValue(order, [
        'total',
        'totalPrice',
        'total_price',
        'amount',
        'amount_total',
        'order_total',
        'totals.total',
      ]),
    )
    const currency = toStringValue(pickValue(order, ['currency', 'currencyCode', 'totals.currency']))
    const customerName = toStringValue(
      pickValue(order, ['customer', 'customerName', 'customer_name', 'guest', 'client', 'user']),
    )
    const notes = toStringValue(pickValue(order, ['notes', 'note', 'specialInstructions', 'instructions']))

    return {
      id: guid ?? displayId ?? `order-${index}`,
      displayId: displayId ?? `#${index + 1}`,
      guid,
      status,
      createdAt,
      createdAtRaw: createdAtRaw ? toStringValue(createdAtRaw) : undefined,
      total,
      currency,
      customerName,
      notes,
      items: normalizeOrderItems(order, menuLookup),
    }
  }).filter(Boolean)
}

const extractOrdersFromPayload = (payload) => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload)) {
    const flattened = collectOrdersFromCandidate(payload)
    return flattened.length > 0 ? flattened : ensureArray(payload)
  }

  const candidateKeys = [
    'orders',
    'data.orders',
    'result.orders',
    'payload.orders',
    'body.orders',
    'data',
  ]

  for (const key of candidateKeys) {
    const candidate = pickValue(payload, [key])
    const orders = collectOrdersFromCandidate(candidate)
    if (orders.length > 0) {
      return orders
    }
  }

  const deepOrders = collectOrdersFromCandidate(payload)
  if (deepOrders.length > 0) {
    return deepOrders
  }

  return []
}

const normalizeModifierEntry = (modifier, fallbackIndex) => {
  if (!modifier) {
    return null
  }

  if (typeof modifier === 'string') {
    return { name: modifier, qty: 1 }
  }

  if (typeof modifier === 'number') {
    return { name: `Modifier ${fallbackIndex + 1}`, qty: modifier }
  }

  if (typeof modifier === 'object') {
    if ('name' in modifier || 'title' in modifier || 'label' in modifier) {
      const name =
        toStringValue(pickValue(modifier, ['name', 'title', 'label', 'modifier', 'value', 'description'])) ??
        `Modifier ${fallbackIndex + 1}`
      const qty =
        toNumber(pickValue(modifier, ['qty', 'quantity', 'count', 'total', 'amount', 'value'])) ?? undefined
      return {
        name,
        qty: qty && qty > 0 ? qty : 1,
      }
    }

    const entries = Object.entries(modifier)
    if (entries.length === 1) {
      const [[entryName, entryQty]] = entries
      const parsedQty = toNumber(entryQty)
      return {
        name: toStringValue(entryName) ?? `Modifier ${fallbackIndex + 1}`,
        qty: parsedQty && parsedQty > 0 ? parsedQty : 1,
      }
    }
  }

  return null
}

const normalizeModifiersFromPayload = (payload) => {
  if (!payload) {
    return []
  }

  const candidateKeys = [
    'modifiers',
    'modifierSummary',
    'modifier_summary',
    'topModifiers',
    'popularModifiers',
    'data.modifiers',
    'summary.modifiers',
  ]

  for (const key of candidateKeys) {
    const candidate = pickValue(payload, [key])
    if (!candidate) {
      continue
    }

    const arrayForm = ensureArray(candidate)
    if (arrayForm.length > 0) {
      const normalized = arrayForm
        .map((entry, index) => normalizeModifierEntry(entry, index))
        .filter(Boolean)
      if (normalized.length > 0) {
        return normalized
      }
    }

    if (candidate && typeof candidate === 'object') {
      const normalized = Object.entries(candidate)
        .map(([name, qty]) => {
          const parsedQty = toNumber(qty)
          return {
            name,
            qty: parsedQty && parsedQty > 0 ? parsedQty : 1,
          }
        })
        .filter((entry) => entry.name)
      if (normalized.length > 0) {
        return normalized
      }
    }
  }

  return []
}

const deriveModifiersFromOrders = (orders) => {
  const counts = new Map()

  orders.forEach((order) => {
    order.items.forEach((item) => {
      item.modifiers.forEach((modifier) => {
        if (!modifier?.name) {
          return
        }

        const quantity = modifier.quantity && modifier.quantity > 0 ? modifier.quantity : 1
        const nextValue = (counts.get(modifier.name) ?? 0) + quantity
        counts.set(modifier.name, nextValue)
      })
    })
  })

  return Array.from(counts.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
}

const formatCurrency = (value, currency = 'USD') => {
  if (value === undefined || value === null) {
    return undefined
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toString()
  }
}

const formatTimestamp = (date, fallback) => {
  if (!date) {
    return fallback
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return fallback ?? date.toString()
  }
}

const statusToClassName = (status) => {
  if (!status) {
    return ''
  }

  return `order-status--${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

const isSentStatus = (status) => {
  if (!status) {
    return false
  }

  const normalized = status.toLowerCase()
  const sentKeywords = [
    'sent',
    'complete',
    'completed',
    'done',
    'delivered',
    'delivering',
    'fulfilled',
    'fulfillment',
    'closed',
    'finished',
    'collected',
    'pickup',
    'picked up',
    'picked-up',
    'pickedup',
    'out for',
    'out-for',
    'out_for',
  ]

  return sentKeywords.some((keyword) => normalized.includes(keyword))
}

function App() {
  const [orders, setOrders] = useState([])
  const [modifiers, setModifiers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showOnlyPreparing, setShowOnlyPreparing] = useState(false)

  const activeRequestRef = useRef(null)
  const isMountedRef = useRef(true)

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort()
      }

      const controller = new AbortController()
      activeRequestRef.current = controller

      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const [ordersResponse, menusResponse] = await Promise.all([
          fetch(ORDERS_ENDPOINT, { signal: controller.signal }),
          fetch(MENUS_ENDPOINT, { signal: controller.signal }),
        ])

        if (!ordersResponse.ok) {
          throw new Error(`Orders request failed with status ${ordersResponse.status}`)
        }

        if (!menusResponse.ok) {
          throw new Error(`Menus request failed with status ${menusResponse.status}`)
        }

        const [ordersPayload, menusPayload] = await Promise.all([
          ordersResponse.json(),
          menusResponse.json(),
        ])

        if (controller.signal.aborted || !isMountedRef.current || activeRequestRef.current !== controller) {
          return
        }

        const rawOrders = extractOrdersFromPayload(ordersPayload)
        const menuLookup = buildMenuItemLookup(menusPayload)
        const outstandingGuids = extractUnfulfilledOrderGuids(menusPayload)
        const filteredOrders =
          outstandingGuids.size > 0
            ? rawOrders.filter((order) => {
                const guid = extractOrderGuid(order)
                return guid ? outstandingGuids.has(guid) : false
              })
            : rawOrders

        const normalizedOrders = normalizeOrders(filteredOrders, menuLookup)
        const payloadModifiers = normalizeModifiersFromPayload(ordersPayload)
        const aggregatedModifiers = payloadModifiers.length > 0
          ? payloadModifiers
          : deriveModifiersFromOrders(normalizedOrders)

        if (!isMountedRef.current || controller.signal.aborted || activeRequestRef.current !== controller) {
          return
        }

        setOrders(normalizedOrders)
        setModifiers(aggregatedModifiers)
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return
        }

        if (!isMountedRef.current || controller.signal.aborted || activeRequestRef.current !== controller) {
          return
        }

        setError(fetchError)
        if (!silent) {
          setOrders([])
          setModifiers([])
        }
      } finally {
        const isCurrentRequest = activeRequestRef.current === controller

        if (isCurrentRequest) {
          activeRequestRef.current = null
        }

        if (!isMountedRef.current || !isCurrentRequest) {
          return
        }

        if (silent) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    loadData()

    return () => {
      isMountedRef.current = false
      if (activeRequestRef.current) {
        activeRequestRef.current.abort()
      }
    }
  }, [loadData])

  const settingsTabs = useMemo(
    () => [
      {
        id: 'general',
        label: 'General',
        description:
          'Adjust overall dashboard behavior, appearance, and defaults once settings become available.',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description:
          'Configure notification channels and delivery preferences here when the feature is ready.',
      },
    ],
    [],
  )

  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [activeTabId, setActiveTabId] = useState(settingsTabs[0].id)

  const activeTab = settingsTabs.find((tab) => tab.id === activeTabId) ?? settingsTabs[0]

  const modifierItems = modifiers.length > 0 ? modifiers : []
  const hasExistingOrders = orders.length > 0
  const visibleOrders = useMemo(
    () => (showOnlyPreparing ? orders.filter((order) => !isSentStatus(order.status)) : orders),
    [orders, showOnlyPreparing],
  )
  const hasVisibleOrders = visibleOrders.length > 0
  const isRefreshInProgress = isLoading || isRefreshing
  const filterLabel = showOnlyPreparing ? 'Preparing Only' : 'All Orders'

  const handleManualRefresh = useCallback(() => {
    loadData({ silent: hasExistingOrders })
  }, [hasExistingOrders, loadData])

  const toggleOrderFilter = useCallback(() => {
    setShowOnlyPreparing((previous) => !previous)
  }, [])

  const openSettings = () => {
    setActiveTabId(settingsTabs[0].id)
    setSettingsOpen(true)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
  }

  return (
    <div className="dashboard">
      <header className="top-bar">
        <h1>Order Dashboard</h1>
        <div className="top-bar-actions">
          <button
            type="button"
            className={`filter-toggle${showOnlyPreparing ? ' is-active' : ''}`}
            onClick={toggleOrderFilter}
            aria-pressed={showOnlyPreparing}
          >
            <span aria-hidden="true" className="filter-toggle-label">
              {filterLabel}
            </span>
            <span className="sr-only">
              {showOnlyPreparing
                ? 'Show all orders including those already sent'
                : 'Show only orders still in preparation'}
            </span>
          </button>
          <button
            type="button"
            className={`refresh-button${isRefreshInProgress ? ' is-refreshing' : ''}`}
            onClick={handleManualRefresh}
            disabled={isRefreshInProgress}
          >
            <span className="sr-only">Refresh orders</span>
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="refresh-icon"
            >
              <path
                d="M21 5v6h-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 19v-6h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.64 9A7 7 0 0 1 12 5c1.7 0 3.27.63 4.44 1.66L21 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18.36 15A7 7 0 0 1 12 19c-1.7 0-3.27-.63-4.44-1.66L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="settings-button"
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            onClick={openSettings}
          >
            <span className="sr-only">Open settings</span>
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="settings-icon"
            >
              <path
                d="M12 15.25C13.7949 15.25 15.25 13.7949 15.25 12C15.25 10.2051 13.7949 8.75 12 8.75C10.2051 8.75 8.75 10.2051 8.75 12C8.75 13.7949 10.2051 15.25 12 15.25Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.5 12.0001C19.5001 12.5003 19.4412 12.9991 19.3245 13.4846L21.1815 15.0631L19.0631 18.1815L17.2055 16.9091C16.6021 17.3539 15.9295 17.7011 15.2155 17.9346L14.8725 20.25H9.1275L8.7845 17.9346C8.0705 17.7011 7.39792 17.3539 6.7945 16.9091L4.93688 18.1815L2.81848 15.0631L4.67548 13.4846C4.55879 12.9991 4.4999 12.5003 4.5 12.0001C4.4999 11.4999 4.55879 11.0011 4.67548 10.5156L2.81848 8.93705L4.93688 5.81865L6.7945 7.09105C7.39792 6.64625 8.0705 6.29903 8.7845 6.06555L9.1275 3.75H14.8725L15.2155 6.06555C15.9295 6.29903 16.6021 6.64625 17.2055 7.09105L19.0631 5.81865L21.1815 8.93705L19.3245 10.5156C19.4412 11.0011 19.5001 11.4999 19.5 12.0001Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>
      <div className="dashboard-body">
        <aside className="sidebar">
          <h2>Modifiers</h2>
          {isLoading && modifierItems.length === 0 && !error ? (
            <p className="sidebar-status" aria-live="polite">
              Loading modifiers…
            </p>
          ) : null}
          {!isLoading && error ? (
            <p className="sidebar-status" role="alert">
              Unable to load modifiers.
            </p>
          ) : null}
          {!isLoading && !error && modifierItems.length === 0 ? (
            <p className="sidebar-status">No modifiers found.</p>
          ) : null}
          {modifierItems.length > 0 ? (
            <ul className="modifier-list">
              {modifierItems.map(({ name, qty }) => (
                <li className="modifier-item" key={name}>
                  <div className="modifier-qty" aria-label={`Quantity ${qty}`}>
                    <span className="modifier-qty-value">{qty}</span>
                    <span aria-hidden="true" className="qty-multiplier">
                      ×
                    </span>
                  </div>
                  <div className="modifier-content">
                    <span className="modifier-name">{name}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
        <main className="orders-area">
          {isLoading && !hasExistingOrders && !error ? (
            <section className="orders-state" aria-live="polite">
              Loading orders…
            </section>
          ) : null}
          {!isLoading && error ? (
            <section className="orders-state orders-state--error" role="alert">
              <h2>Unable to load orders</h2>
              <p>{error.message ?? 'Please try again later.'}</p>
            </section>
          ) : null}
          {!isLoading && !error && !hasExistingOrders ? (
            <section className="orders-state">No orders available.</section>
          ) : null}
          {!isLoading && !error && hasExistingOrders && !hasVisibleOrders ? (
            <section className="orders-state">No orders currently in preparation.</section>
          ) : null}
          {hasVisibleOrders ? (
            <section className="orders-grid" aria-live="polite">
              {visibleOrders.map((order) => {
                const formattedTotal = formatCurrency(order.total, order.currency ?? 'USD')
                const statusClass = statusToClassName(order.status)
                const timeLabel = formatTimestamp(order.createdAt, order.createdAtRaw)

                return (
                  <article className="order-card" key={order.id}>
                    <header className="order-card-header">
                      <div className="order-card-heading">
                        <h2 className="order-card-title">Order {order.displayId}</h2>
                        {order.customerName ? (
                          <p className="order-card-subtitle">for {order.customerName}</p>
                        ) : null}
                      </div>
                      <div className="order-card-meta">
                        {order.status ? (
                          <span className={`order-status-badge ${statusClass}`}>{order.status}</span>
                        ) : null}
                        {timeLabel ? (
                          <time className="order-card-time" dateTime={order.createdAt?.toISOString() ?? undefined}>
                            {timeLabel}
                          </time>
                        ) : null}
                      </div>
                    </header>
                    {order.items.length > 0 ? (
                      <ul className="order-items">
                        {order.items.map((item) => (
                          <li className="order-item" key={`${order.id}-${item.id}`}>
                            <div className="order-item-header">
                              <div className="order-item-title">
                                <span className="order-item-qty" aria-label={`Quantity ${item.quantity}`}>
                                  {item.quantity}
                                  <span aria-hidden="true">×</span>
                                </span>
                                <span className="order-item-name">{item.name}</span>
                              </div>
                              {item.price !== undefined ? (
                                <span className="order-item-price">
                                  {formatCurrency(item.price, item.currency ?? order.currency ?? 'USD')}
                                </span>
                              ) : null}
                            </div>
                            {item.modifiers.length > 0 ? (
                              <div className="order-item-modifiers-card">
                                <p className="order-item-modifiers-title">Modifiers</p>
                                <ul className="order-item-modifiers">
                                  {item.modifiers.map((modifier, modifierIndex) => {
                                    const rawQuantity = Number(modifier.quantity)
                                    const quantity =
                                      Number.isFinite(rawQuantity) && rawQuantity > 0
                                        ? rawQuantity
                                        : 1

                                    return (
                                      <li
                                        className="order-item-modifier"
                                        key={`${item.id}-modifier-${modifierIndex}`}
                                      >
                                        <span
                                          className="order-item-modifier-qty"
                                          aria-label={`Quantity ${quantity}`}
                                        >
                                          {quantity}
                                          <span aria-hidden="true">×</span>
                                        </span>
                                        <span className="order-item-modifier-name">
                                          {modifier.name}
                                        </span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            ) : null}
                            {item.notes ? <p className="order-item-notes">{item.notes}</p> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="order-card-empty">No line items for this order.</p>
                    )}
                    {order.notes ? <p className="order-card-notes">Notes: {order.notes}</p> : null}
                    {formattedTotal ? (
                      <footer className="order-card-footer">
                        <span className="order-card-total-label">Total</span>
                        <span className="order-card-total-value">{formattedTotal}</span>
                      </footer>
                    ) : null}
                  </article>
                )
              })}
            </section>
          ) : null}
        </main>
      </div>
      {isSettingsOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeSettings}>
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-modal-header">
              <h2 id="settings-modal-title">Dashboard Settings</h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={closeSettings}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-body">
              <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTab.id}
                    aria-controls={`settings-tabpanel-${tab.id}`}
                    id={`settings-tab-${tab.id}`}
                    className={`settings-tab${tab.id === activeTab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                className="settings-tabpanel"
                role="tabpanel"
                id={`settings-tabpanel-${activeTab.id}`}
                aria-labelledby={`settings-tab-${activeTab.id}`}
              >
                <p>{activeTab.description}</p>
                <ul className="settings-placeholder-list">
                  <li>Placeholder option A</li>
                  <li>Placeholder option B</li>
                  <li>Placeholder option C</li>
                </ul>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button type="button" className="modal-primary-button" disabled>
                Save Changes
              </button>
              <button type="button" className="modal-secondary-button" onClick={closeSettings}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
