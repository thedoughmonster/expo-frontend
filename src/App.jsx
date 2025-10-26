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

  switch (normalized) {
    case 'SENT':
      return 'is-sent'
    case 'IN PREPARATION':
      return 'is-in-preparation'
    case 'READY':
      return 'is-ready'
    default:
      return ''
  }
}

const FULFILLMENT_FILTERS = [
  {
    key: 'sent',
    label: 'Sent',
    matches: (value) => /\bSENT\b/.test(value),
  },
  {
    key: 'inPrep',
    label: 'In Prep',
    matches: (value) => /\bPREP/.test(value) || /\bCOOK/.test(value),
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
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [activeFulfillmentFilters, setActiveFulfillmentFilters] = useState(
    () => new Set(FULFILLMENT_FILTERS.map(({ key }) => key)),
  )
  const now = useNow(1000)

  const isMountedRef = useRef(true)

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

  const modifierItems = useMemo(() => deriveModifiersFromOrders(visibleOrders), [visibleOrders])

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
          <div className="top-bar-filters" role="group" aria-label="Filter orders by fulfillment status">
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
                d="M19.5 15.75C19.636 15.75 19.7596 15.8223 19.8218 15.9444L21.0361 18.375C21.1114 18.5258 21.0608 18.7103 20.9257 18.8026L18.5578 20.3989C18.4389 20.4801 18.2825 20.4737 18.1702 20.3839L16.6097 19.1257C16.4947 19.0324 16.3342 19.029 16.2171 19.1166C15.7774 19.4474 15.2905 19.7092 14.769 19.8932C14.6266 19.9437 14.5216 20.0749 14.5216 20.2269V22.1889C14.5216 22.3529 14.3927 22.4893 14.2296 22.5038L11.7151 22.7289C11.5544 22.7431 11.4061 22.6312 11.3713 22.4738L10.9191 20.4472C10.8817 20.2793 10.7308 20.1595 10.5599 20.1704C9.97075 20.2073 9.37912 20.1509 8.81311 20.0036C8.64882 19.961 8.47575 20.0417 8.39477 20.1913L7.22715 22.3366C7.1498 22.4819 6.9779 22.5448 6.82503 22.4777L4.47491 21.4506C4.32249 21.3836 4.24584 21.2048 4.30771 21.0529L5.16855 18.9168C5.23421 18.7596 5.17838 18.5779 5.03747 18.4926C4.5545 18.1972 4.1228 17.8227 3.76414 17.3845C3.66369 17.2623 3.48846 17.2207 3.343 17.2876L1.51891 18.1253C1.35893 18.1973 1.17159 18.1319 1.09958 17.9718L0.0888946 15.7189C0.0168836 15.5587 0.0823053 15.3716 0.242285 15.2995L2.10148 14.4699C2.24742 14.4041 2.32973 14.2447 2.28825 14.0901C2.13348 13.5126 2.06676 12.9163 2.09131 12.3233C2.09826 12.1708 1.98818 12.0404 1.83829 11.9936L-0.157454 11.3647C-0.315596 11.3147 -0.411032 11.1461 -0.361118 10.9884L0.339686 8.84765C0.389599 8.68996 0.558091 8.59435 0.715767 8.64426L2.70301 9.27319C2.85604 9.31962 3.01968 9.23242 3.08343 9.08316C3.33508 8.4868 3.67373 7.93057 4.08638 7.43849C4.19116 7.31431 4.1907 7.13546 4.08406 7.01221L2.64144 5.33478C2.52783 5.20574 2.52317 5.01111 2.63156 4.87794L4.27552 2.86067C4.38651 2.72473 4.58596 2.69566 4.73384 2.78728L6.56103 3.90406C6.69794 3.98748 6.8724 3.95307 6.97198 3.82788C7.36156 3.32972 7.81056 2.89831 8.3057 2.54719C8.43958 2.45177 8.47965 2.27362 8.40021 2.12978L7.35059 0.126441C7.26937 -0.0205983 7.32861 -0.202891 7.48234 -0.280213L9.59808 -1.3485C9.75231 -1.42618 9.93779 -1.36578 10.0118 -1.20788L11.0347 1.09515C11.1073 1.25183 11.2956 1.31955 11.4476 1.24904C12.0109 0.982019 12.6105 0.813052 13.2191 0.750485C13.3815 0.733152 13.5103 0.608612 13.5218 0.444739L13.7173 -2.20616C13.7277 -2.35235 13.8563 -2.46738 14.0026 -2.45671L16.509 -2.2759C16.664 -2.26501 16.7865 -2.13263 16.7774 -1.97796L16.6299 0.595144C16.6201 0.750435 16.732 0.894478 16.8846 0.913285C17.4669 0.986742 18.0353 1.15081 18.5697 1.40072C18.707 1.46632 18.8796 1.42332 18.9652 1.29628L20.205 -0.539574C20.2929 -0.669171 20.4679 -0.708089 20.6084 -0.628199L22.8093 0.707734C22.9479 0.787301 22.9956 0.966188 22.915 1.10476L21.7955 3.00041C21.7188 3.14125 21.7717 3.31291 21.9008 3.42232C22.3579 3.80512 22.7638 4.24676 23.1072 4.73756C23.2034 4.86925 23.3774 4.91479 23.5244 4.84594L25.4827 3.95436C25.6367 3.88263 25.8216 3.94335 25.8933 4.09733L27.0005 6.5247C27.0723 6.67869 27.0116 6.8635 26.8576 6.93523L24.9182 7.84311C24.7688 7.91234 24.6883 8.07683 24.7399 8.22848C24.9337 8.78283 25.0746 9.36636 25.1564 9.96063C25.1791 10.1239 25.3141 10.2426 25.4797 10.2398L27.481 10.2087C27.6403 10.2061 27.771 10.3351 27.7685 10.4944L27.7233 12.9994C27.7208 13.1587 27.5918 13.2895 27.4326 13.287L25.4295 13.2565C25.2642 13.2539 25.1293 13.3743 25.112 13.5362C25.0548 14.1358 24.9214 14.7248 24.7157 15.2878C24.6546 15.4508 24.7122 15.6366 24.8544 15.7222L26.647 16.786C26.7936 16.8746 26.8348 17.0543 26.7462 17.2009L25.3633 19.5136C25.2746 19.6604 25.0933 19.7066 24.9465 19.618L23.1771 18.5324C23.0341 18.4463 22.8516 18.4898 22.7657 18.6329C22.4525 19.1543 22.0815 19.6282 21.6653 20.0439C21.549 20.1603 21.5416 20.3423 21.6517 20.4677L22.9675 21.939C23.0839 22.0661 23.0862 22.2604 22.9726 22.3896L21.3299 24.4062C21.2186 24.5422 21.0192 24.5711 20.8724 24.4792L19.0476 23.3619C18.9105 23.2783 18.7336 23.3129 18.6345 23.4398C18.2598 23.9304 17.8307 24.3699 17.3628 24.7495C17.2267 24.8581 17.2042 25.0637 17.3095 25.2004L18.7404 27.1276C18.8385 27.2571 18.8038 27.4426 18.6744 27.5408L16.7173 28.9449C16.5793 29.0478 16.3844 29.0214 16.2856 28.8843L14.9688 27.0566C14.8823 26.9368 14.7101 26.9034 14.5769 26.9804C14.0955 27.259 13.5804 27.4692 13.0395 27.6057C12.8783 27.6461 12.7646 27.7865 12.7752 27.9507L12.928 30.4571C12.9379 30.6125 12.825 30.7569 12.6696 30.7667L10.1628 30.9171C10.0074 30.9269 9.87295 30.8066 9.86312 30.6513L9.70809 28.1397C9.69813 27.9843 9.56878 27.8604 9.41062 27.8592C8.81781 27.8545 8.2295 27.792 7.6581 27.6647C7.49707 27.6286 7.34102 27.7192 7.28911 27.8743L6.48292 30.2735C6.43103 30.4287 6.26405 30.5188 6.10661 30.463L3.7795 29.6436C3.62205 29.5878 3.53165 29.4176 3.58765 29.2602L4.40348 26.952C4.45644 26.7984 4.38358 26.6277 4.24062 26.5543C3.72944 26.2961 3.25744 25.9817 2.8395 25.6174C2.72296 25.5126 2.53838 25.5118 2.41514 25.6187L0.823312 26.9682C0.699591 27.0736 0.511539 27.0608 0.406122 26.9371L-1.31235 24.9163C-1.41777 24.7927 -1.405 24.6044 -1.28082 24.4908L0.401105 23.0481C0.527821 22.9341 0.535025 22.741 0.420976 22.615C0.026987 22.1706 -0.345525 21.6845 -0.660211 21.1667C-0.742829 21.0347 -0.913542 20.9925 -1.05715 21.0545L-2.88388 21.8432C-3.03479 21.9065 -3.2092 21.8343 -3.27247 21.6833L-4.34875 19.2859C-4.41165 19.1346 -4.3405 18.9611 -4.18933 18.8981L-2.38101 18.1446C-2.22837 18.0803 -2.14696 17.9168 -2.18968 17.7618C-2.35214 17.1786 -2.44784 16.5751 -2.47258 15.9661C-2.47833 15.8038 -2.60881 15.6775 -2.77091 15.6602L-4.77698 15.4359C-4.93642 15.4189 -5.04282 15.2706 -5.02586 15.1112L-4.79948 12.6027C-4.78225 12.444 -4.63331 12.3359 -4.47462 12.3541L-2.46876 12.5885C-2.30877 12.6064 -2.17559 12.486 -2.17062 12.3253C-2.14685 11.7314 -2.04186 11.1391 -1.85954 10.5727C-1.80819 10.4175 -1.88455 10.2487 -2.02969 10.1809L-3.77739 9.35192C-3.92112 9.28424 -3.98786 9.09758 -3.916 8.94494L-2.89798 6.61379C-2.82612 6.46115 -2.64072 6.40551 -2.48776 6.47608L-0.735405 7.28603C-0.582683 7.35628 -0.418507 7.27062 -0.354755 7.12135C-0.117039 6.53857 0.19082 5.9906 0.556306 5.48418C0.660145 5.34707 0.650325 5.15562 0.525328 5.04134L-1.0649 3.64921C-1.18837 3.54538 -1.19835 3.35761 -1.09452 3.23414L0.850424 0.986271C0.953664 0.863808 1.14232 0.855451 1.26645 0.959288L3.07728 2.46526C3.20141 2.5691 3.38918 2.57907 3.51265 2.47524C3.99747 2.07753 4.51342 1.73887 5.05636 1.46585C5.20864 1.38935 5.26591 1.20469 5.20227 1.05193L4.35237 -1.06166C4.28853 -1.21463 4.35194 -1.39274 4.50567 -1.45616L6.75074 -2.40267C6.90694 -2.46653 7.08854 -2.40356 7.15886 -2.24708L8.13725 0.0263559C8.2056 0.183071 8.39165 0.260331 8.54554 0.198846C9.10262 -0.0238982 9.69129 -0.176787 10.2964 -0.254307C10.4585 -0.274583 10.5836 -0.399031 10.5889 -0.56141L10.6666 -3.07176C10.6717 -3.23004 10.8004 -3.35575 10.9587 -3.3506L13.4666 -3.26833C13.6249 -3.26318 13.7515 -3.13638 13.7463 -2.97809L13.6668 -0.467071C13.6614 -0.304682 13.7871 -0.175992 13.9455 -0.176015C14.5312 -0.177131 15.1185 -0.128348 15.6957 -0.0195508"
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
          {!isLoading && !error && !hasVisibleOrders ? (
            <section className="orders-state">{emptyStateMessage}</section>
          ) : null}
          {hasVisibleOrders ? (
            <section className="orders-grid" aria-live="polite">
              {visibleOrders.map((order) => {
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
                  <article className="order-card" key={order.id}>
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
