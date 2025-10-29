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

const normalizeLookupKey = (value) => {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/[^a-z0-9]+/g, ' ')
}

const parseDateLike = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) {
      return new Date(value)
    }

    if (value > 1_000_000_000) {
      return new Date(value * 1000)
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const numeric = Number(trimmed)
    if (Number.isFinite(numeric) && numeric > 1_000_000) {
      const fromNumeric = parseDateLike(numeric)
      if (fromNumeric) {
        return fromNumeric
      }
    }

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
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
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }

  return null
}

const toStringValue = (value) => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString()
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return undefined
    }
  }

  return undefined
}

const looksLikeStructuredData = (value) => {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}

const extractLabelFromStructuredValue = (value) => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const extracted = extractLabelFromStructuredValue(entry)
      if (extracted) {
        return extracted
      }
    }

    return undefined
  }

  if (typeof value === 'object') {
    const preferredKeys = ['name', 'displayName', 'display_name', 'label', 'title', 'value']

    for (const key of preferredKeys) {
      const stringValue = toStringValue(value[key])
      if (stringValue) {
        const trimmed = stringValue.trim()
        if (trimmed) {
          return trimmed
        }
      }
    }

    for (const entry of Object.values(value)) {
      const extracted = extractLabelFromStructuredValue(entry)
      if (extracted) {
        return extracted
      }
    }
  }

  return undefined
}

const parseStructuredCandidate = (value) => {
  if (!looksLikeStructuredData(value)) {
    return undefined
  }

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const selectPreferredStringCandidate = (candidates) => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return undefined
  }

  for (const candidate of candidates) {
    if (!looksLikeStructuredData(candidate)) {
      return candidate
    }
  }

  for (const candidate of candidates) {
    const parsed = parseStructuredCandidate(candidate)
    if (!parsed) {
      continue
    }

    const extracted = extractLabelFromStructuredValue(parsed)
    if (extracted) {
      return extracted
    }
  }

  return candidates[0]
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
  'pending',
  'queued',
  'waiting',
  'awaiting',
  'queued',
  'on hold',
  'pause',
  'paused',
])

const FULFILLMENT_STATUS_ACTIVE_PATTERN = buildKeywordPattern([
  'prepar',
  'cook',
  'prep',
  'in progress',
  'inprocess',
  'in-progress',
  'making',
  'working',
  'process',
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

const MODIFIER_IDENTIFIER_KEYS = [
  'modifierGuid',
  'modifier_guid',
  'modifierId',
  'modifier_id',
  'modifierCode',
  'modifier_code',
  'guid',
  'id',
  'sku',
  'code',
  'itemGuid',
  'item_guid',
  'itemId',
  'item_id',
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

    return false
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

const ORDER_DISPLAY_ID_NESTED_KEYS = [
  'order.displayId',
  'order.display_id',
  'summary.displayId',
  'summary.display_id',
  'details.displayId',
  'details.display_id',
  'ticket.displayId',
  'ticket.display_id',
]

const ORDER_TAB_NAME_PATHS = [
  'tabName',
  'tab_name',
  'tab.name',
  'data.tabName',
  'data.tab_name',
  'data.tab.name',
  'data.attributes.tabName',
  'data.attributes.tab_name',
  'data.attributes.tab.name',
  'attributes.tabName',
  'attributes.tab_name',
  'attributes.tab.name',
  'order.tabName',
  'order.tab_name',
  'order.tab.name',
  'payload.tabName',
  'payload.tab_name',
  'payload.tab.name',
]

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

const isLikelyGuid = (value) => {
  const stringValue = toStringValue(value)
  if (!stringValue) {
    return false
  }

  const trimmed = stringValue.trim()
  if (trimmed.length < 8) {
    return false
  }

  if (!/^[0-9a-f-]+$/i.test(trimmed)) {
    return false
  }

  return trimmed.includes('-') || /[a-f]/i.test(trimmed)
}

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

const ORDER_DINING_OPTION_KEYS = [
  'diningOption',
  'dining_option',
  'dining',
  'serviceType',
  'service_type',
  'orderType',
  'order_type',
  'mode',
  'serviceMode',
  'service_mode',
  'channel',
  'fulfillmentType',
  'fulfillment_type',
  'fulfillment',
  'context.dining',
  'context.serviceType',
  'context.service_type',
  'context.orderType',
  'context.order_type',
  'context.mode',
  'context.channel',
]

const resolveOrderDiningOption = (order, diningOptionLookup = new Map()) => {
  if (!order || typeof order !== 'object') {
    return undefined
  }

  const identifierCandidates = collectStringValuesAtPaths(order, ORDER_DINING_OPTION_IDENTIFIER_PATHS)
  const labelCandidates = collectStringValuesAtPaths(order, ORDER_DINING_OPTION_LABEL_PATHS)
  const fallbackCandidates = collectStringValuesAtPaths(order, ORDER_DINING_OPTION_KEYS)

  const normalizedLookup = diningOptionLookup ?? new Map()

  for (const identifier of identifierCandidates) {
    const normalized = normalizeLookupKey(identifier)
    if (normalized && normalizedLookup.has(normalized)) {
      return normalizedLookup.get(normalized)
    }
  }

  for (const label of labelCandidates) {
    const normalized = normalizeLookupKey(label)
    if (normalized && normalizedLookup.has(normalized)) {
      return normalizedLookup.get(normalized)
    }
  }

  return fallbackCandidates[0]
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

const normalizeOrders = (rawOrders, menuLookup = new Map(), diningOptionLookup = new Map()) => {
  const collection = ensureArray(rawOrders)

  const normalizedWithIndex = collection.map((order, index) => {
    if (!order || typeof order !== 'object') {
      return null
    }

    const guid = extractOrderGuid(order)
    const displayId =
      collectStringValuesAtPaths(order, ORDER_DISPLAY_ID_PRIMARY_KEYS)[0] ??
      collectStringValuesAtPaths(order, ORDER_DISPLAY_ID_NESTED_KEYS)[0]

    const status = toStringValue(pickValue(order, ['status', 'orderStatus', 'state', 'stage', 'fulfillment_status']))
    const timestampCandidates = collectTimestampCandidates(order, ORDER_CREATED_AT_PATH_DESCRIPTORS)
    const primaryTimestamp = timestampCandidates[0]
    const createdAt = primaryTimestamp?.date
    const createdAtRaw = primaryTimestamp?.raw ?? collectStringValuesAtPaths(order, ORDER_CREATED_AT_RAW_PATHS)[0]
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
    const tabNameCandidates = collectStringValuesAtPaths(order, ORDER_TAB_NAME_PATHS)
    const rawTabName = selectPreferredStringCandidate(tabNameCandidates)
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

export {
  ensureArray,
  normalizeLookupKey,
  toNumber,
  toStringValue,
  pickValue,
  parseDateLike,
  collectValuesAtKeyPath,
  collectStringValuesAtPaths,
  collectTimestampCandidates,
  ORDER_CREATED_AT_PATH_DESCRIPTORS,
  ORDER_CREATED_AT_RAW_PATHS,
  ORDER_ITEM_COLLECTION_KEYS,
  ORDER_ITEM_MODIFIER_COLLECTION_KEYS,
  normalizeItemModifiers,
  normalizeOrderItems,
  normalizeOrders,
  extractOrderGuid,
  extractOrdersFromPayload,
  resolveOrderDiningOption,
  selectFulfillmentStatus,
  ORDER_FULFILLMENT_STATUS_KEYS,
  isLikelyGuid,
}
