import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders/latest'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

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
  'specialRequests',
  'specialRequests.items',
  'specialRequests.nodes',
  'specialRequests.edges',
  'specialRequests.edges[].node',
  'specialRequest',
  'special_request',
  'special_requests',
  'special_requests.items',
  'special_requests.nodes',
  'special_requests.edges',
  'special_requests.edges[].node',
  'requests',
  'requests.items',
  'requests.nodes',
  'requests.edges',
  'requests.edges[].node',
]

const ORDER_CREATED_AT_BASE_FIELDS = [
  'createdAt',
  'created_at',
  'created',
  'placedAt',
  'placed_at',
  'placed',
  'submittedAt',
  'submitted_at',
  'submitted',
  'submittedTime',
  'submitted_time',
  'submittedAtLocal',
  'submitted_at_local',
  'submittedAtUtc',
  'submitted_at_utc',
  'orderTime',
  'order_time',
  'orderDate',
  'order_date',
  'orderDateTime',
  'order_datetime',
  'startTime',
  'start_time',
  'startedAt',
  'started_at',
  'openedAt',
  'opened_at',
  'openedTime',
  'opened_time',
  'fireAt',
  'fire_at',
  'fireTime',
  'fire_time',
  'firedAt',
  'fired_at',
  'sentAt',
  'sent_at',
  'time',
  'timestamp',
]

const ORDER_CREATED_AT_PRIMARY_PREFIXES = [
  '',
  'data.',
  'attributes.',
  'payload.',
  'order.',
  'order.data.',
  'order.attributes.',
  'order.payload.',
  'details.',
  'summary.',
  'header.',
  'ticket.',
  'info.',
  'meta.',
  'metadata.',
  'context.',
  'timing.',
  'timestamps.',
  'timers.',
]

const ORDER_CREATED_AT_CHECK_PREFIXES = [
  'checks[].',
  'checks[].data.',
  'checks[].attributes.',
  'checks[].payload.',
  'checks[].order.',
  'checks[].order.data.',
  'checks[].order.attributes.',
  'checks[].summary.',
  'checks[].details.',
  'checks[].header.',
  'checks[].info.',
  'checks[].meta.',
  'checks[].metadata.',
  'checks[].context.',
  'checks[].timing.',
  'checks[].timestamps.',
]

const ORDER_STATUS_TIME_KEYS = [
  'CREATED',
  'CREATED_AT',
  'PLACED',
  'PLACED_AT',
  'SUBMITTED',
  'SUBMITTED_AT',
  'ACKNOWLEDGED',
  'ACKNOWLEDGED_AT',
  'RECEIVED',
  'RECEIVED_AT',
  'NEW',
  'OPEN',
  'SENT',
  'SENT_AT',
  'ORDER_STARTED',
  'ORDER_STARTED_AT',
]

const buildTimestampPaths = (prefixes, fields) => {
  const paths = []

  prefixes.forEach((prefix) => {
    fields.forEach((field) => {
      paths.push(`${prefix}${field}`)
    })
  })

  return paths
}

const ORDER_CREATED_AT_PATH_DESCRIPTORS = (() => {
  const descriptors = []
  const seen = new Set()

  const register = (paths, priority) => {
    for (const path of paths) {
      if (!path || seen.has(path)) {
        continue
      }

      seen.add(path)
      descriptors.push({ path, priority })
    }
  }

  register(buildTimestampPaths(ORDER_CREATED_AT_PRIMARY_PREFIXES, ORDER_CREATED_AT_BASE_FIELDS), 0)
  register(buildTimestampPaths(ORDER_CREATED_AT_CHECK_PREFIXES, ORDER_CREATED_AT_BASE_FIELDS), 1)
  register(buildTimestampPaths(['statusTimes.', 'status_times.'], ORDER_STATUS_TIME_KEYS), 2)
  register(buildTimestampPaths(['checks[].statusTimes.', 'checks[].status_times.'], ORDER_STATUS_TIME_KEYS), 3)
  register(['statusTimes.*', 'status_times.*'], 4)
  register(['checks[].statusTimes.*', 'checks[].status_times.*'], 5)
  register(buildTimestampPaths(['events[].', 'history[].', 'activity[].', 'updates[].'], ORDER_CREATED_AT_BASE_FIELDS), 4)

  return descriptors
})()

const ORDER_CREATED_AT_RAW_PATHS = ORDER_CREATED_AT_PATH_DESCRIPTORS.map((descriptor) => descriptor.path)

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
  'displayNumber',
  'display_number',
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
  'fulfillmentStatus',
  'fulfillment.status',
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
  'diningOption',
  'dining_option',
  'serviceType',
  'service_type',
  'orderType',
  'order_type',
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

const normalizeLookupKey = (value) => {
  const stringValue = toStringValue(value)
  if (!stringValue) {
    return undefined
  }

  const trimmed = stringValue.trim()
  if (!trimmed) {
    return undefined
  }

  return trimmed.toLowerCase()
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

const collectStringValuesAtPaths = (source, paths) => {
  if (!source) {
    return []
  }

  const values = []
  const seen = new Set()

  for (const path of paths) {
    const candidates = collectValuesAtKeyPath(source, path)
    for (const candidate of candidates) {
      const stringValue = toStringValue(candidate)
      if (!stringValue) {
        continue
      }

      const trimmed = stringValue.trim()
      if (!trimmed) {
        continue
      }

      const dedupeKey = normalizeLookupKey(trimmed) ?? trimmed
      if (seen.has(dedupeKey)) {
        continue
      }

      seen.add(dedupeKey)
      values.push(trimmed)
    }
  }

  return values
}

const collectTimestampCandidates = (source, descriptors) => {
  if (!source) {
    return []
  }

  const candidates = []
  const seen = new Set()

  for (const descriptor of descriptors) {
    const { path, priority = 0 } = descriptor ?? {}
    if (!path) {
      continue
    }

    const values = collectValuesAtKeyPath(source, path)
    for (const value of values) {
      const parsed = parseDateLike(value)
      if (!parsed) {
        continue
      }

      const timestamp = parsed.getTime()
      if (Number.isNaN(timestamp)) {
        continue
      }

      if (seen.has(timestamp)) {
        continue
      }

      seen.add(timestamp)

      candidates.push({
        date: parsed,
        raw: toStringValue(value) ?? parsed.toISOString(),
        priority,
      })
    }
  }

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }

    return a.date.getTime() - b.date.getTime()
  })

  return candidates
}

const escapeRegexFragment = (value) =>
  value
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s*')

const buildKeywordPattern = (keywords) => {
  const fragments = keywords.map(escapeRegexFragment).filter(Boolean)
  return fragments.length > 0 ? new RegExp(`(${fragments.join('|')})`) : null
}

const FULFILLMENT_STATUS_CANCELLATION_PATTERN = buildKeywordPattern([
  'cancel',
  'void',
  'reject',
  'declin',
  'fail',
  'refus',
  'denied',
  'problem',
  'issue',
  'error',
])

const FULFILLMENT_STATUS_DELAY_PATTERN = buildKeywordPattern([
  'late',
  'delay',
  'behind',
  'hold',
  'held',
  'stuck',
])

const FULFILLMENT_STATUS_PENDING_PATTERN = buildKeywordPattern([
  'await',
  'pending',
  'pend',
  'queue',
  'queued',
  'new',
  'open',
  'received',
  'created',
  'unassigned',
  'not started',
  'waiting',
])

const FULFILLMENT_STATUS_ACTIVE_PATTERN = buildKeywordPattern([
  'in progress',
  'prep',
  'prepar',
  'cook',
  'bake',
  'processing',
  'working',
  'accepted',
  'acknowledged',
  'confirm',
  'start',
  'started',
  'sent',
  'make',
  'making',
  'assembling',
  'assembly',
])

const FULFILLMENT_STATUS_READY_PATTERN = buildKeywordPattern([
  'ready',
  'pickup',
  'pick up',
  'pick-up',
  'bagged',
  'packed',
  'packag',
  'awaiting pickup',
  'waiting pickup',
  'for pickup',
  'for delivery',
  'out for delivery',
  'out for pickup',
])

const FULFILLMENT_STATUS_COMPLETE_PATTERN = buildKeywordPattern([
  'complete',
  'fulfilled',
  'done',
  'served',
  'delivered',
  'closed',
  'finished',
  'picked',
  'collected',
])

const normalizeStatusComparisonValue = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const classifyFulfillmentStatusCandidate = (value, index) => {
  const stringValue = toStringValue(value)
  if (!stringValue) {
    return null
  }

  const trimmed = stringValue.trim()
  if (!trimmed) {
    return null
  }

  const comparison = normalizeStatusComparisonValue(trimmed)
  if (!comparison) {
    return null
  }

  let rank = 3

  if (FULFILLMENT_STATUS_CANCELLATION_PATTERN.test(comparison)) {
    rank = 0
  } else if (FULFILLMENT_STATUS_DELAY_PATTERN.test(comparison)) {
    rank = 1
  } else if (FULFILLMENT_STATUS_PENDING_PATTERN.test(comparison)) {
    rank = 2
  } else if (FULFILLMENT_STATUS_ACTIVE_PATTERN.test(comparison)) {
    rank = 3
  } else if (FULFILLMENT_STATUS_READY_PATTERN.test(comparison)) {
    rank = 4
  } else if (FULFILLMENT_STATUS_COMPLETE_PATTERN.test(comparison)) {
    rank = 5
  }

  return {
    label: trimmed,
    normalized: comparison,
    rank,
    index,
  }
}

const formatFulfillmentStatusLabel = (value) => {
  const stringValue = toStringValue(value)
  if (!stringValue) {
    return undefined
  }

  const normalized = stringValue.replace(/[\s_-]+/g, ' ').trim()
  if (!normalized) {
    return undefined
  }

  return normalized.toUpperCase()
}

const selectFulfillmentStatus = (candidates) => {
  if (!candidates || candidates.length === 0) {
    return undefined
  }

  const scored = []
  const seen = new Set()

  candidates.forEach((candidate, index) => {
    if (!candidate) {
      return
    }

    const classification = classifyFulfillmentStatusCandidate(candidate, index)
    if (!classification) {
      return
    }

    const dedupeKey = classification.normalized || classification.label.toLowerCase()
    if (seen.has(dedupeKey)) {
      return
    }

    seen.add(dedupeKey)
    scored.push(classification)
  })

  if (scored.length === 0) {
    const fallback = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())
    return fallback ? formatFulfillmentStatusLabel(fallback) ?? fallback.trim() : undefined
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank
    }

    if (a.index !== b.index) {
      return a.index - b.index
    }

    if (a.label.length !== b.label.length) {
      return a.label.length - b.label.length
    }

    return a.label.localeCompare(b.label)
  })

  const best = scored[0]
  return formatFulfillmentStatusLabel(best.label) ?? best.label
}

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

const MODIFIER_IDENTIFIER_KEYS = [
  ...MENU_ITEM_ID_KEYS,
  'modifierCode',
  'modifier_code',
  'optionGuid',
  'option_guid',
  'optionId',
  'option_id',
  'choiceGuid',
  'choice_guid',
  'choiceId',
  'choice_id',
]

const normalizeItemModifiers = (item, menuLookup) => {
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
    'specialRequests',
    'special_requests',
    'specialRequest',
    'requests',
    'request',
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

    const modifierIdentifier = toStringValue(pickValue(candidate, MODIFIER_IDENTIFIER_KEYS))
    const menuEntry = modifierIdentifier && menuLookup?.has(modifierIdentifier)
      ? menuLookup.get(modifierIdentifier)
      : undefined

    let name
    let namePriority = Number.POSITIVE_INFINITY

    const applyName = (value, priority) => {
      const normalized = toStringValue(value)
      if (!normalized) {
        return
      }

      if (!name || priority < namePriority) {
        name = normalized
        namePriority = priority
      }
    }

    if (menuEntry) {
      applyName(menuEntry.kitchenName, 0)
    }

    applyName(pickValue(candidate, ['kitchenName', 'kitchen_name']), 1)

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
      if (!(key in candidate)) {
        continue
      }

      const value = candidate[key]
      if (value === undefined || value === null) {
        continue
      }

      const hasChildren = Array.isArray(value)
        ? value.some((entry) => entry !== undefined && entry !== null)
        : typeof value === 'object'
          ? Object.keys(value).length > 0
          : false

      if (hasChildren) {
        forwarded = true
        pushCandidate(value)
      }
    }

    for (const value of entries.map(([, entryValue]) => entryValue)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' || Array.isArray(value)) {
          pushCandidate(value)
        }
      }
    }

    if (typeof name === 'string') {
      const trimmedName = name.trim()
      if (!trimmedName) {
        continue
      }
      const hasExplicitQuantity = quantityRaw !== undefined && quantityRaw > 0
      const hasExplicitPrice = priceValue !== undefined
      const hasExplicitSelection = selectionFlag === true
      const hasExplicitDeselection = selectionFlag === false || quantityRaw === 0
      const shouldAdd =
        !hasExplicitDeselection &&
        (!forwarded || hasExplicitSelection || hasExplicitQuantity || hasExplicitPrice)
      if (shouldAdd) {
        collected.push({
          name: trimmedName,
          quantity: normalizedQuantity,
          priority: namePriority,
          identifier: modifierIdentifier ?? undefined,
        })
      }
    }
  }

  if (collected.length === 0) {
    return []
  }

  const aggregated = new Map()

  collected.forEach(({ name, quantity, priority, identifier }) => {
    if (!name) {
      return
    }

    const normalizedQuantity = quantity && quantity > 0 ? quantity : 1
    const key = identifier ?? name.trim().toLowerCase()

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        name,
        quantity: normalizedQuantity,
        priority: priority ?? Number.POSITIVE_INFINITY,
      })
      return
    }

    const existing = aggregated.get(key)
    existing.quantity += normalizedQuantity
    if ((priority ?? Number.POSITIVE_INFINITY) < existing.priority && name) {
      existing.name = name
      existing.priority = priority ?? Number.POSITIVE_INFINITY
    }
  })

  return Array.from(aggregated.values()).map(({ name, quantity }) => ({ name, quantity }))
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
    const orderKitchenName = toStringValue(pickValue(item, ['kitchenName', 'kitchen_name']))
    const baseName = toStringValue(pickValue(item, ORDER_ITEM_NAME_KEYS))
    const quantity = toNumber(pickValue(item, ORDER_ITEM_QUANTITY_KEYS)) ?? 1
    const price = toNumber(pickValue(item, ORDER_ITEM_PRICE_KEYS))
    const currency = toStringValue(pickValue(item, ['currency', 'currencyCode']))
    const notes = toStringValue(pickValue(item, ['notes', 'note', 'specialInstructions', 'instructions']))
    const modifiers = normalizeItemModifiers(item, menuLookup)

    let rawIdentifier
    for (const key of ORDER_ITEM_IDENTIFIER_KEYS) {
      const candidate = toStringValue(pickValue(item, [key]))
      if (candidate) {
        rawIdentifier = candidate
        break
      }
    }

    const identifier = rawIdentifier ?? `${index}`
    const menuEntry = rawIdentifier && menuLookup ? menuLookup.get(rawIdentifier) : undefined
    let name = menuEntry?.kitchenName ?? orderKitchenName

    if (!name) {
      name = baseName ?? menuEntry?.fallbackName
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

const ORDER_DISPLAY_ID_PRIMARY_KEYS = [
  'displayId',
  'display_id',
  'displayNumber',
  'display_number',
  'orderNumber',
  'order_number',
  'ticket',
  'number',
  'id',
  'reference',
  'name',
]

const ORDER_TAB_NAME_PATHS = [
  'tabName',
  'tab_name',
  'tab.name',
  'data.tabName',
  'data.tab_name',
  'data.tab.name',
  'attributes.tabName',
  'attributes.tab_name',
  'attributes.tab.name',
  'order.tabName',
  'order.tab_name',
  'order.tab.name',
  'payload.tabName',
  'payload.tab_name',
  'payload.tab.name',
  'order.data.tabName',
  'order.data.tab_name',
  'order.attributes.tabName',
  'order.attributes.tab_name',
  'data.order.tabName',
  'data.order.tab_name',
  'checks[].tabName',
  'checks[].tab_name',
  'checks[].tab.name',
  'checks[].data.tabName',
  'checks[].data.tab_name',
  'checks[].attributes.tabName',
  'checks[].attributes.tab_name',
  'checks[].header.tabName',
  'checks[].header.tab_name',
]

const ORDER_DISPLAY_ID_NESTED_KEYS = [
  'attributes.displayId',
  'attributes.display_id',
  'attributes.displayNumber',
  'attributes.display_number',
  'attributes.orderNumber',
  'attributes.order_number',
  'attributes.ticket',
  'attributes.number',
  'data.displayId',
  'data.display_id',
  'data.displayNumber',
  'data.display_number',
  'data.orderNumber',
  'data.order_number',
  'data.ticket',
  'data.number',
  'order.displayId',
  'order.display_id',
  'order.displayNumber',
  'order.display_number',
  'order.orderNumber',
  'order.order_number',
  'order.ticket',
  'order.number',
  'header.displayId',
  'header.display_id',
  'header.displayNumber',
  'header.display_number',
  'header.orderNumber',
  'header.order_number',
  'header.ticket',
  'header.number',
  '*.displayId',
  '*.display_id',
  '*.displayNumber',
  '*.display_number',
  '*.orderNumber',
  '*.order_number',
  '*.ticket',
  '*.number',
]

const ORDER_DINING_OPTION_KEYS = [
  'diningOption',
  'dining_option',
  'dining.option',
  'serviceType',
  'service_type',
  'service.type',
  'orderType',
  'order_type',
  'order.type',
  'fulfillmentType',
  'fulfillment_type',
  'fulfillment.type',
  'channel',
  'serviceMode',
  'service_mode',
  'mode',
]

const ORDER_DINING_OPTION_IDENTIFIER_PATHS = [
  'diningOptionGuid',
  'dining_option_guid',
  'diningOptionId',
  'dining_option_id',
  'diningOption.guid',
  'diningOption.id',
  'dining_option.guid',
  'dining_option.id',
  'dining.optionGuid',
  'dining.optionId',
  'dining.guid',
  'dining.id',
  'serviceTypeGuid',
  'serviceTypeId',
  'service_type_guid',
  'service_type_id',
  'serviceType.guid',
  'serviceType.id',
  'service.typeGuid',
  'service.typeId',
  'orderTypeGuid',
  'orderTypeId',
  'order_type_guid',
  'order_type_id',
  'orderType.guid',
  'orderType.id',
  'order.typeGuid',
  'order.typeId',
  'fulfillmentTypeGuid',
  'fulfillmentTypeId',
  'fulfillment_type_guid',
  'fulfillment_type_id',
  'fulfillmentType.guid',
  'fulfillmentType.id',
  'fulfillment.typeGuid',
  'fulfillment.typeId',
  'channelGuid',
  'channelId',
  'channel.guid',
  'channel.id',
  'serviceModeGuid',
  'serviceModeId',
  'serviceMode.guid',
  'serviceMode.id',
  'service_mode_guid',
  'service_mode_id',
  'modeGuid',
  'modeId',
  'mode.guid',
  'mode.id',
]

const ORDER_DINING_OPTION_LABEL_PATHS = [
  'diningOption.name',
  'diningOption.displayName',
  'diningOption.display_name',
  'diningOption.label',
  'diningOption.description',
  'diningOption.title',
  'diningOption.names.*',
  'diningOption.labels.*',
  'diningOption.descriptions.*',
  'dining.option',
  'dining.optionName',
  'dining.option_name',
  'dining.name',
  'dining.displayName',
  'dining.display_name',
  'dining.label',
  'dining.description',
  'dining.names.*',
  'serviceType.name',
  'serviceType.displayName',
  'serviceType.display_name',
  'serviceType.label',
  'serviceType.description',
  'serviceType.names.*',
  'service.type',
  'serviceMode',
  'service_mode',
  'serviceMode.name',
  'serviceMode.displayName',
  'serviceMode.display_name',
  'serviceMode.label',
  'serviceMode.description',
  'serviceMode.names.*',
  'orderType.name',
  'orderType.displayName',
  'orderType.display_name',
  'orderType.label',
  'orderType.description',
  'orderType.names.*',
  'order.type',
  'fulfillmentType.name',
  'fulfillmentType.displayName',
  'fulfillmentType.display_name',
  'fulfillmentType.label',
  'fulfillmentType.description',
  'fulfillmentType.names.*',
  'fulfillment.type',
  'channel.name',
  'channel.displayName',
  'channel.display_name',
  'channel.label',
  'channel.description',
  'channel.names.*',
  'mode.name',
  'mode.displayName',
  'mode.display_name',
  'mode.label',
  'mode.description',
  'mode.names.*',
  'fulfillment.channel',
  'fulfillment.serviceType',
  'fulfillment.service_type',
  'fulfillment.orderType',
  'fulfillment.order_type',
  'context.serviceType',
  'context.service_type',
  'context.orderType',
  'context.order_type',
  'context.channel',
  'context.mode',
]

const ORDER_FULFILLMENT_STATUS_BASE_FIELDS = [
  'fulfillmentStatus',
  'fulfillment_status',
  'fulfillmentStatus.name',
  'fulfillmentStatus.displayName',
  'fulfillmentStatus.display_name',
  'fulfillmentStatus.label',
  'fulfillmentStatus.description',
  'fulfillmentState',
  'fulfillment_state',
  'fulfillment.status',
  'fulfillment.status.name',
  'fulfillment.status.displayName',
  'fulfillment.status.display_name',
  'fulfillment.status.label',
  'fulfillment.status.description',
  'fulfillment.state',
  'fulfillment.progress',
  'fulfillment.progressStatus',
  'fulfillment.progress_status',
  'fulfillment.statusProgress',
  'fulfillment.status_progress',
  'deliveryStatus',
  'delivery_status',
  'serviceStatus',
  'service_status',
]

const ORDER_FULFILLMENT_STATUS_EXTENDED_FIELDS = [
  ...ORDER_FULFILLMENT_STATUS_BASE_FIELDS,
  'status',
  'state',
  'progressStatus',
  'progress_status',
]

const ORDER_FULFILLMENT_STATUS_COLLECTION_BASES = (() => {
  const bases = new Set(['checks[]'])

  ORDER_ITEM_COLLECTION_KEYS.forEach((key) => {
    bases.add(key)
  })

  ORDER_ITEM_COLLECTION_KEYS.forEach((key) => {
    ORDER_ITEM_MODIFIER_COLLECTION_KEYS.forEach((modifierKey) => {
      bases.add(`${key}.${modifierKey}`)
    })
  })

  const prefixes = [
    '',
    'order',
    'data',
    'attributes',
    'payload',
    'order.data',
    'order.attributes',
    'data.order',
    'attributes.order',
  ]
  const combined = new Set()

  bases.forEach((base) => {
    prefixes.forEach((prefix) => {
      if (!prefix) {
        combined.add(base)
      } else if (!base) {
        combined.add(prefix)
      } else {
        combined.add(`${prefix}.${base}`)
      }
    })
  })

  prefixes.forEach((prefix) => {
    if (prefix) {
      combined.add(prefix)
    }
  })

  return Array.from(combined)
})()

const ORDER_FULFILLMENT_STATUS_KEYS = (() => {
  const keys = [...ORDER_FULFILLMENT_STATUS_BASE_FIELDS]

  ORDER_FULFILLMENT_STATUS_COLLECTION_BASES.forEach((base) => {
    ORDER_FULFILLMENT_STATUS_EXTENDED_FIELDS.forEach((field) => {
      keys.push(`${base}.${field}`)
    })
  })

  return Array.from(new Set(keys))
})()

const pickStringFromPaths = (source, keys) => {
  if (!source) {
    return undefined
  }

  for (const key of keys) {
    const values = collectValuesAtKeyPath(source, key)
    for (const value of values) {
      const stringValue = toStringValue(value)
      if (stringValue && stringValue.trim() !== '') {
        return stringValue
      }
    }
  }

  return undefined
}

const resolveOrderDiningOption = (order, diningOptionLookup = new Map()) => {
  if (!order || typeof order !== 'object') {
    return undefined
  }

  const identifierCandidates = collectStringValuesAtPaths(order, ORDER_DINING_OPTION_IDENTIFIER_PATHS)
  const labelCandidates = collectStringValuesAtPaths(order, ORDER_DINING_OPTION_LABEL_PATHS)
  const fallbackCandidates = collectStringValuesAtPaths(order, ORDER_DINING_OPTION_KEYS)

  const candidateOrder = [...identifierCandidates, ...labelCandidates, ...fallbackCandidates]

  for (const candidate of candidateOrder) {
    const normalized = normalizeLookupKey(candidate)
    if (normalized && diningOptionLookup.has(normalized)) {
      return diningOptionLookup.get(normalized)
    }
  }

  if (labelCandidates.length > 0) {
    return labelCandidates[0]
  }

  if (fallbackCandidates.length > 0) {
    return fallbackCandidates[0]
  }

  return undefined
}

const normalizeOrders = (rawOrders, menuLookup = new Map(), diningOptionLookup = new Map()) => {
  const collection = ensureArray(rawOrders)

  const normalizedWithIndex = collection.map((order, index) => {
    if (!order || typeof order !== 'object') {
      return null
    }

    const guid = extractOrderGuid(order)
    const displayId =
      pickStringFromPaths(order, ORDER_DISPLAY_ID_PRIMARY_KEYS) ??
      pickStringFromPaths(order, ORDER_DISPLAY_ID_NESTED_KEYS)

    const status = toStringValue(pickValue(order, ['status', 'orderStatus', 'state', 'stage', 'fulfillment_status']))
    const timestampCandidates = collectTimestampCandidates(order, ORDER_CREATED_AT_PATH_DESCRIPTORS)
    const primaryTimestamp = timestampCandidates[0]
    const createdAt = primaryTimestamp?.date
    const createdAtRaw = primaryTimestamp?.raw ?? pickStringFromPaths(order, ORDER_CREATED_AT_RAW_PATHS)
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
    let customerName = toStringValue(
      pickValue(order, ['customer', 'customerName', 'customer_name', 'guest', 'client', 'user']),
    )
    const rawTabName = pickStringFromPaths(order, ORDER_TAB_NAME_PATHS)
    if (!customerName && rawTabName) {
      customerName = rawTabName
    }
    const diningOption = resolveOrderDiningOption(order, diningOptionLookup)
    const fulfillmentStatusCandidates = collectStringValuesAtPaths(order, ORDER_FULFILLMENT_STATUS_KEYS)
    const fulfillmentStatus = selectFulfillmentStatus(fulfillmentStatusCandidates)
    const notes = toStringValue(pickValue(order, ['notes', 'note', 'specialInstructions', 'instructions']))

    const tabName = rawTabName ?? customerName

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
      diningOption,
      fulfillmentStatus,
      notes,
      tabName,
      items: normalizeOrderItems(order, menuLookup),
      originalIndex: index,
    }
  }).filter(Boolean)

  normalizedWithIndex.sort((a, b) => {
    const aTime = a.createdAt instanceof Date && !Number.isNaN(a.createdAt.getTime()) ? a.createdAt.getTime() : null
    const bTime = b.createdAt instanceof Date && !Number.isNaN(b.createdAt.getTime()) ? b.createdAt.getTime() : null

    if (aTime !== null && bTime !== null) {
      return aTime - bTime
    }

    if (aTime === null && bTime === null) {
      return a.originalIndex - b.originalIndex
    }

    return aTime === null ? 1 : -1
  })

  return normalizedWithIndex.map(({ originalIndex, ...order }) => {
    void originalIndex
    return order
  })
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
      const itemQuantity = item.quantity && item.quantity > 0 ? item.quantity : 1

      item.modifiers.forEach((modifier) => {
        if (!modifier?.name) {
          return
        }

        const modifierQuantity = modifier.quantity && modifier.quantity > 0 ? modifier.quantity : 1
        const totalQuantity = modifierQuantity * itemQuantity
        const nextValue = (counts.get(modifier.name) ?? 0) + totalQuantity
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

const getElapsedTimeParts = (start, end = new Date()) => {
  const startDate = start instanceof Date ? start : parseDateLike(start)
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return null
  }

  const target = end instanceof Date && !Number.isNaN(end.getTime()) ? end : new Date()
  const diffMs = Math.max(0, target.getTime() - startDate.getTime())
  const totalSeconds = Math.floor(diffMs / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  return {
    totalSeconds,
    totalMinutes,
    totalHours,
    totalDays,
    hours: totalHours % 24,
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

const formatElapsedDuration = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const pad = (value) => value.toString().padStart(2, '0')

  if (parts.totalHours > 0) {
    return `${parts.totalHours}:${pad(parts.minutes)}:${pad(parts.seconds)}`
  }

  return `${pad(parts.minutes)}:${pad(parts.seconds)}`
}

const formatElapsedTimer = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const seconds = parts.seconds.toString().padStart(2, '0')
  const minutes = parts.totalMinutes.toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

const formatElapsedLabel = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const { totalDays, totalHours, hours, totalMinutes, minutes, seconds } = parts
  const labels = []

  if (totalDays > 0) {
    labels.push(`${totalDays} day${totalDays === 1 ? '' : 's'}`)
  }

  if (totalHours > 0) {
    const hoursToInclude = totalDays > 0 ? hours : totalHours
    if (hoursToInclude > 0) {
      labels.push(`${hoursToInclude} hour${hoursToInclude === 1 ? '' : 's'}`)
    }
  }

  if (totalMinutes > 0 && labels.length < 2) {
    const minutesToInclude = labels.length > 0 ? minutes : totalMinutes
    if (minutesToInclude > 0) {
      labels.push(`${minutesToInclude} minute${minutesToInclude === 1 ? '' : 's'}`)
    }
  }

  if (labels.length === 0) {
    if (seconds > 0) {
      labels.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
    } else {
      labels.push('moments')
    }
  }

  return labels.slice(0, 2).join(' ')
}

const formatElapsedIsoDuration = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const { totalDays, hours, minutes, seconds } = parts
  const dateSegments = []
  const timeSegments = []

  if (totalDays > 0) {
    dateSegments.push(`${totalDays}D`)
  }

  if (hours > 0) {
    timeSegments.push(`${hours}H`)
  }

  if (minutes > 0 || (timeSegments.length > 0 && seconds > 0)) {
    timeSegments.push(`${minutes}M`)
  }

  if (seconds > 0 || (dateSegments.length === 0 && timeSegments.length === 0)) {
    timeSegments.push(`${seconds}S`)
  }

  if (dateSegments.length === 0 && timeSegments.length === 0) {
    timeSegments.push('0S')
  }

  const datePart = dateSegments.length > 0 ? dateSegments.join('') : ''
  const timePart = timeSegments.length > 0 ? `T${timeSegments.join('')}` : ''

  return `P${datePart}${timePart || 'T0S'}`
}

const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return undefined
    }

    const id = setInterval(() => {
      setNow(new Date())
    }, intervalMs)

    return () => {
      clearInterval(id)
    }
  }, [intervalMs])

  return now
}

const statusToClassName = (status) => {
  if (!status) {
    return ''
  }

  return `order-status--${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

const fulfillmentStatusToClassName = (status) => {
  if (!status) {
    return ''
  }

  const normalized = status.trim().toUpperCase()

  if (/\bSENT\b/.test(normalized)) {
    return 'is-sent'
  }

  if (/\bREADY\b/.test(normalized)) {
    return 'is-ready'
  }

  if (/\bHOLD\b/.test(normalized)) {
    return 'is-hold'
  }

  if (/\bNEW\b/.test(normalized)) {
    return 'is-new'
  }

  if (/\bPREP/.test(normalized) || /\bCOOK/.test(normalized)) {
    return 'is-in-preparation'
  }

  return ''
}

const FULFILLMENT_FILTERS = [
  {
    key: 'new',
    label: 'New',
    matches: (value) => /\bNEW\b/.test(value),
  },
  {
    key: 'hold',
    label: 'Hold',
    matches: (value) => /\bHOLD\b/.test(value),
  },
  {
    key: 'sent',
    label: 'Sent',
    matches: (value) => /\bSENT\b/.test(value),
  },
  {
    key: 'ready',
    label: 'Ready',
    matches: (value) => /\bREADY\b/.test(value),
  },
]

const normalizeStatusValue = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

const resolveFulfillmentFilterKey = (order) => {
  if (!order) {
    return null
  }

  const candidates = [order.fulfillmentStatus, order.status]
    .map((value) => normalizeStatusValue(value))
    .filter(Boolean)

  for (const candidate of candidates) {
    for (const filter of FULFILLMENT_FILTERS) {
      if (filter.matches(candidate)) {
        return filter.key
      }
    }
  }

  return null
}

function App() {
  const [orders, setOrders] = useState([])
  const [activeOrderIds, setActiveOrderIds] = useState(() => new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [activeFulfillmentFilters, setActiveFulfillmentFilters] = useState(
    () => new Set(FULFILLMENT_FILTERS.map(({ key }) => key)),
  )
  const now = useNow(1000)

  const isMountedRef = useRef(true)
  const orderCardMainRefs = useRef(new Map())
  const resizeObserverRef = useRef(null)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadData = useCallback(
    async ({ silent = false, signal } = {}) => {
      if (signal?.aborted || !isMountedRef.current) {
        return
      }

      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const configPromise = (async () => {
          try {
            const response = await fetch(CONFIG_SNAPSHOT_ENDPOINT, { signal })
            if (!response.ok) {
              return null
            }

            return await response.json()
          } catch (configError) {
            if (configError?.name === 'AbortError') {
              return null
            }

            return null
          }
        })()

        const [ordersResponse, menusResponse] = await Promise.all([
          fetch(ORDERS_ENDPOINT, { signal }),
          fetch(MENUS_ENDPOINT, { signal }),
        ])

        if (!ordersResponse.ok) {
          throw new Error(`Orders request failed with status ${ordersResponse.status}`)
        }

        if (!menusResponse.ok) {
          throw new Error(`Menus request failed with status ${menusResponse.status}`)
        }

        const [ordersPayload, menusPayload, configPayload] = await Promise.all([
          ordersResponse.json(),
          menusResponse.json(),
          configPromise,
        ])

        if (signal?.aborted || !isMountedRef.current) {
          return
        }

        const rawOrders = extractOrdersFromPayload(ordersPayload)
        const menuLookup = buildMenuItemLookup(menusPayload)
        const diningOptionLookup = buildDiningOptionLookup(configPayload)
        const outstandingGuids = extractUnfulfilledOrderGuids(menusPayload)
        const filteredOrders =
          outstandingGuids.size > 0
            ? rawOrders.filter((order) => {
                const guid = extractOrderGuid(order)
                return guid ? outstandingGuids.has(guid) : false
              })
            : rawOrders

        const normalizedOrders = normalizeOrders(filteredOrders, menuLookup, diningOptionLookup)
        if (!isMountedRef.current) {
          return
        }

        setOrders(normalizedOrders)
      } catch (fetchError) {
        if (fetchError.name === 'AbortError' || !isMountedRef.current) {
          return
        }

        setError(fetchError)

        if (!silent) {
          setOrders([])
        }
      } finally {
        if (isMountedRef.current) {
          if (silent) {
            setIsRefreshing(false)
          } else {
            setIsLoading(false)
            setIsRefreshing(false)
          }
        }
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()

    loadData({ silent: false, signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadData])

  const visibleOrders = useMemo(() => {
    if (orders.length === 0) {
      return []
    }

    const totalFilters = FULFILLMENT_FILTERS.length
    const activeCount = activeFulfillmentFilters.size
    const shouldApplyFilter = activeCount > 0 && activeCount < totalFilters

    if (!shouldApplyFilter) {
      if (activeCount === 0) {
        return []
      }

      return orders
    }

    return orders.filter((order) => {
      const filterKey = resolveFulfillmentFilterKey(order)
      if (!filterKey) {
        return true
      }

      return activeFulfillmentFilters.has(filterKey)
    })
  }, [activeFulfillmentFilters, orders])

  const hasExistingOrders = orders.length > 0
  const hasVisibleOrders = visibleOrders.length > 0
  const isBusy = isLoading || isRefreshing
  const refreshAriaLabel = isBusy ? 'Refreshing orders' : 'Refresh orders'
  let emptyStateMessage = 'No orders available.'
  const totalFilters = FULFILLMENT_FILTERS.length
  const activeFilterCount = activeFulfillmentFilters.size
  const hasFilterRestriction = activeFilterCount > 0 && activeFilterCount < totalFilters

  if (hasExistingOrders) {
    if (activeFilterCount === 0) {
      emptyStateMessage = 'Select at least one fulfillment status to view orders.'
    } else if (hasFilterRestriction) {
      emptyStateMessage = 'No orders match the selected filters.'
    }
  }

  const updateOrderCardColumnSpan = useCallback((target) => {
    if (!target) {
      return
    }

    const orderCard = target.closest('.order-card')
    if (!orderCard) {
      return
    }

    const rawOverflowRatio = target.scrollHeight / Math.max(target.clientHeight, 1)
    const overflowRatio = Number.isFinite(rawOverflowRatio) ? rawOverflowRatio : 1
    let desiredSpan = 1

    if (overflowRatio >= 3.25) {
      desiredSpan = 4
    } else if (overflowRatio >= 2.25) {
      desiredSpan = 3
    } else if (overflowRatio >= 1.35) {
      desiredSpan = 2
    }

    if (desiredSpan > 1) {
      orderCard.dataset.columnSpan = String(desiredSpan)
    } else {
      delete orderCard.dataset.columnSpan
    }
  }, [])

  const registerOrderCardMain = useCallback(
    (orderId) => (node) => {
      const map = orderCardMainRefs.current
      const existingNode = map.get(orderId)

      if (existingNode && existingNode !== node) {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.unobserve(existingNode)
        }
        const existingCard = existingNode.closest('.order-card')
        if (existingCard) {
          delete existingCard.dataset.columnSpan
        }
        map.delete(orderId)
      }

      if (!node) {
        map.delete(orderId)
        return
      }

      map.set(orderId, node)

      if (resizeObserverRef.current) {
        resizeObserverRef.current.observe(node)
        updateOrderCardColumnSpan(node)
      }
    },
    [updateOrderCardColumnSpan],
  )

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateOrderCardColumnSpan(entry.target)
      }
    })

    resizeObserverRef.current = observer

    orderCardMainRefs.current.forEach((node) => {
      observer.observe(node)
      updateOrderCardColumnSpan(node)
    })

    return () => {
      resizeObserverRef.current = null
      observer.disconnect()
      orderCardMainRefs.current.forEach((node) => {
        const orderCard = node.closest('.order-card')
        if (orderCard) {
          delete orderCard.dataset.columnSpan
        }
      })
    }
  }, [updateOrderCardColumnSpan])

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

  const ordersForModifiers = useMemo(() => {
    if (activeOrderIds.size === 0) {
      return visibleOrders
    }

    return visibleOrders.filter((order) => activeOrderIds.has(order.id))
  }, [activeOrderIds, visibleOrders])

  const modifierItems = useMemo(() => deriveModifiersFromOrders(ordersForModifiers), [ordersForModifiers])
  const activeSelectionCount = activeOrderIds.size
  const visibleOrderCount = visibleOrders.length
  const selectionSummaryMessage =
    activeSelectionCount > 0
      ? `Showing modifiers for ${activeSelectionCount} selected ${activeSelectionCount === 1 ? 'order' : 'orders'}.`
      : hasVisibleOrders
        ? `Showing modifiers for all ${visibleOrderCount} visible ${visibleOrderCount === 1 ? 'order' : 'orders'}.`
        : null

  useEffect(() => {
    setActiveOrderIds((previous) => {
      if (previous.size === 0) {
        return previous
      }

      const visibleIds = new Set(visibleOrders.map((order) => order.id))
      let shouldUpdate = false
      const next = new Set()

      previous.forEach((id) => {
        if (visibleIds.has(id)) {
          next.add(id)
        } else {
          shouldUpdate = true
        }
      })

      if (next.size !== previous.size) {
        shouldUpdate = true
      }

      return shouldUpdate ? next : previous
    })
  }, [visibleOrders])

  const toggleOrderActive = useCallback((orderId) => {
    setActiveOrderIds((previous) => {
      const next = new Set(previous)

      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }

      return next
    })
  }, [])

  const clearActiveOrders = useCallback(() => {
    setActiveOrderIds((previous) => {
      if (previous.size === 0) {
        return previous
      }

      return new Set()
    })
  }, [])

  const handleOrderKeyDown = useCallback(
    (event, orderId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleOrderActive(orderId)
      }
    },
    [toggleOrderActive],
  )

  const toggleFulfillmentFilter = (key) => {
    setActiveFulfillmentFilters((previous) => {
      const next = new Set(previous)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      return next
    })
  }

  const handleRefresh = () => {
    loadData({ silent: hasExistingOrders })
  }

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
          <div className="top-bar-section">
            <p className="top-bar-section-label">Fulfillment filters</p>
            <div
              className="top-bar-section-controls top-bar-filters"
              role="group"
              aria-label="Filter orders by fulfillment status"
            >
              {FULFILLMENT_FILTERS.map(({ key, label }) => {
                const isActive = activeFulfillmentFilters.has(key)
                const title = isActive
                  ? `Showing ${label.toLowerCase()} orders. Click to hide these orders.`
                  : `Show orders marked as ${label.toLowerCase()}.`

                return (
                  <button
                    key={key}
                    type="button"
                    className={`filter-toggle${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => toggleFulfillmentFilter(key)}
                    title={title}
                  >
                    <span className="filter-toggle-label">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="top-bar-section">
            <p className="top-bar-section-label">Order selection</p>
            <div
              className="top-bar-section-controls top-bar-selection"
              role="group"
              aria-label="Order selection actions"
            >
              <span className="top-bar-selection-count" aria-live="polite">
                {activeSelectionCount} selected
              </span>
              <button
                type="button"
                className="clear-selection-button"
                onClick={clearActiveOrders}
                disabled={activeSelectionCount === 0}
                title="Clear selected orders"
              >
                Clear selections
              </button>
            </div>
          </div>
          <div className="top-bar-section">
            <p className="top-bar-section-label">Dashboard tools</p>
            <div className="top-bar-section-controls top-bar-utilities">
              <button
                type="button"
                className="refresh-button"
                onClick={handleRefresh}
                disabled={isBusy}
                aria-busy={isBusy}
                title="Refresh orders"
              >
                <svg
                  aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`refresh-icon${isBusy ? ' is-refreshing' : ''}`}
                >
                  <path
                    d="M21 4V9H16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12A9 9 0 1 1 9.515 3.308"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="sr-only">{refreshAriaLabel}</span>
              </button>
              <button
                type="button"
                className="settings-button"
                aria-haspopup="dialog"
                aria-expanded={isSettingsOpen}
                onClick={openSettings}
                title="Open settings"
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
                    d="M19.4 15A1.65 1.65 0 0 0 20.24 13.1L21.24 11.3A1.5 1.5 0 0 0 20.7 9.33L18.91 8.33A1.65 1.65 0 0 0 17 7.49L16.62 5.5A1.5 1.5 0 0 0 15.13 4.3H12.87A1.5 1.5 0 0 0 11.38 5.5L11 7.49A1.65 1.65 0 0 0 9.09 8.33L7.3 9.33A1.5 1.5 0 0 0 6.76 11.3L7.76 13.1A1.65 1.65 0 0 0 8.6 15L8.24 17A1.5 1.5 0 0 0 9.74 18.2H12A1.65 1.65 0 0 0 13.91 19.04L14.29 21A1.5 1.5 0 0 0 15.78 22.2H18.04A1.5 1.5 0 0 0 19.54 21L19.92 19.04A1.65 1.65 0 0 0 21.83 18.2H24.09A1.5 1.5 0 0 0 25.59 17L25.97 15.04A1.65 1.65 0 0 0 27.88 14.2H30.14A1.5 1.5 0 0 0 31.64 13L32.02 11.04A1.65 1.65 0 0 0 33.93 10.2H36.19A1.5 1.5 0 0 0 37.69 9L38.07 7.04A1.65 1.65 0 0 0 39.98 6.2H42.24A1.5 1.5 0 0 0 43.74 5L44.12 3.04A1.65 1.65 0 0 0 46.03 2.2H48.29"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="dashboard-body">
        <aside className="sidebar">
          <h2>Modifiers</h2>
          {selectionSummaryMessage ? (
            <p className="sidebar-selection-status" aria-live="polite">
              {selectionSummaryMessage}
            </p>
          ) : null}
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
          {!isLoading && !error && !hasVisibleOrders ? (
            <section className="orders-state">{emptyStateMessage}</section>
          ) : null}
          {hasVisibleOrders ? (
            <section className="orders-grid" aria-live="polite">
              {visibleOrders.map((order) => {
                const isOrderActive = activeOrderIds.has(order.id)
                const orderCardClasses = ['order-card']
                if (isOrderActive) {
                  orderCardClasses.push('is-active')
                }
                const formattedTotal = formatCurrency(order.total, order.currency ?? 'USD')
                const statusClass = statusToClassName(order.status)
                const elapsedStart = order.createdAt ?? order.createdAtRaw
                const timeLabel = formatTimestamp(order.createdAt, order.createdAtRaw)
                const elapsedDuration = formatElapsedDuration(elapsedStart, now)
                const elapsedTimerValue = formatElapsedTimer(elapsedStart, now)
                const elapsedIsoDuration = formatElapsedIsoDuration(elapsedStart, now)
                const elapsedLabel = formatElapsedLabel(elapsedStart, now)
                const elapsedAriaLabel = elapsedLabel
                  ? `Elapsed time ${elapsedLabel}`
                  : elapsedDuration
                    ? `Elapsed time ${elapsedDuration}`
                    : undefined
                const shouldShowFulfillmentStatus = Boolean(order.fulfillmentStatus)
                const trimmedTabName = order.tabName?.trim()
                const trimmedCustomerName = order.customerName?.trim()
                const shouldShowCustomerSubtitle = Boolean(
                  trimmedCustomerName &&
                    (!trimmedTabName || trimmedCustomerName.toLowerCase() !== trimmedTabName.toLowerCase()),
                )

                const displayCustomerName = trimmedTabName || trimmedCustomerName
                const orderNumberLabel = order.displayId ? `Order number ${order.displayId}` : undefined
                const fulfillmentBadgeClass = shouldShowFulfillmentStatus
                  ? fulfillmentStatusToClassName(order.fulfillmentStatus)
                  : ''
                const fulfillmentBadgeClasses = ['order-fulfillment-badge']
                if (fulfillmentBadgeClass) {
                  fulfillmentBadgeClasses.push(fulfillmentBadgeClass)
                }
                const hasTitlebarMeta = Boolean(order.diningOption || shouldShowFulfillmentStatus)

                return (
                  <article
                    className={orderCardClasses.join(' ')}
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isOrderActive}
                    onClick={() => toggleOrderActive(order.id)}
                    onKeyDown={(event) => handleOrderKeyDown(event, order.id)}
                  >
                    <header className="order-card-header">
                      <div className="order-card-titlebar">
                        <div className="order-card-titlebar-main">
                          {order.displayId ? (
                            <span className="order-card-number" aria-label={orderNumberLabel}>
                              {order.displayId}
                            </span>
                          ) : null}
                          {displayCustomerName ? (
                            <span
                              className="order-card-tabname"
                              aria-label={`Customer ${displayCustomerName}`}
                              title={displayCustomerName}
                            >
                              {displayCustomerName}
                            </span>
                          ) : null}
                        </div>
                        {hasTitlebarMeta ? (
                          <div className="order-card-titlebar-meta">
                            {order.diningOption ? (
                              <span
                                className="order-card-dining"
                                aria-label={`Dining option ${order.diningOption}`}
                              >
                                {order.diningOption}
                              </span>
                            ) : null}
                            {shouldShowFulfillmentStatus ? (
                              <span
                                className={fulfillmentBadgeClasses.join(' ')}
                                aria-label={`Fulfillment status ${order.fulfillmentStatus}`}
                              >
                                {order.fulfillmentStatus}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {elapsedTimerValue ? (
                          <div
                            className="order-card-titlebar-timer"
                            role="timer"
                            aria-live="polite"
                            aria-label={elapsedAriaLabel}
                            title={elapsedLabel ?? elapsedDuration ?? undefined}
                          >
                            <span className="order-card-titlebar-timer-icon" aria-hidden="true">
                              ⏱
                            </span>
                            <time
                              className="order-card-titlebar-timer-value"
                              dateTime={elapsedIsoDuration ?? undefined}
                            >
                              {elapsedTimerValue}
                            </time>
                          </div>
                        ) : null}
                      </div>
                      <div className="order-card-header-body">
                        {shouldShowCustomerSubtitle ? (
                          <p className="order-card-subtitle">for {order.customerName}</p>
                        ) : null}
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
                      </div>
                    </header>
                    {elapsedLabel ? (
                      <p className="order-card-elapsed">
                        In queue for <span className="order-card-elapsed-value">{elapsedLabel}</span>
                      </p>
                    ) : null}
                    <div
                      className="order-card-main"
                      ref={registerOrderCardMain(order.id)}
                    >
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
                    </div>
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
