import type { components } from '../../api/types'

export type ToastOrder = components['schemas']['ToastOrder']
export type ToastCheck = components['schemas']['ToastCheck']
export type ToastSelection = components['schemas']['ToastSelection']

export type MenuLookupEntry = {
  kitchenName?: string
  posName?: string
  displayName?: string
  fallbackName?: string
}

export type ModifierMetadata = {
  groupName?: string
  groupId?: string
  groupOrder?: number
  optionOrder?: number
  optionName?: string
}

export type MenuLookup = Map<string, MenuLookupEntry>
export type ModifierMetadataLookup = Map<string, ModifierMetadata>

export type NormalizedModifier = {
  id?: string
  identifier?: string
  name: string
  quantity: number
  groupName?: string
  groupId?: string
  groupOrder?: number
  optionOrder?: number
  optionName?: string
}

export type NormalizedOrderItem = {
  id: string
  name: string
  quantity: number
  price?: number
  currency?: string
  modifiers: NormalizedModifier[]
  notes?: string
}

export type NormalizedOrder = {
  id: string
  displayId?: string
  guid?: string
  status?: string
  createdAt?: Date
  createdAtRaw?: string
  total?: number
  currency?: string
  customerName?: string
  diningOption?: string
  fulfillmentStatus?: string
  notes?: string
  tabName?: string
  items: NormalizedOrderItem[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (value === undefined || value === null) {
    return []
  }

  return [value]
}

export const normalizeLookupKey = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/[^a-z0-9]+/g, ' ')
}

export const parseDateLike = (value: unknown): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
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

export const toNumber = (value: unknown): number | undefined => {
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
    return Number.isFinite(converted) ? converted : undefined
  }

  return undefined
}

export const toStringValue = (value: unknown): string | undefined => {
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

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
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

const splitKeyPathSegments = (key: string): string[] =>
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

export const collectValuesAtKeyPath = (source: unknown, key: string): unknown[] => {
  if (source === undefined || source === null) {
    return []
  }

  const segments = splitKeyPathSegments(key)
  let current: unknown[] = [source]

  for (const segment of segments) {
    const next: unknown[] = []

    for (const value of current) {
      if (value === undefined || value === null) {
        continue
      }

      if (segment === '*') {
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (entry !== undefined && entry !== null) {
              next.push(entry)
            }
          })
        } else if (typeof value === 'object') {
          Object.values(value as Record<string, unknown>).forEach((entry) => {
            if (entry !== undefined && entry !== null) {
              next.push(entry)
            }
          })
        }
        continue
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry && typeof entry === 'object' && segment in entry) {
            const candidate = (entry as Record<string, unknown>)[segment]
            if (candidate !== undefined && candidate !== null) {
              next.push(candidate)
            }
          }
        })
        continue
      }

      if (typeof value === 'object') {
        const candidate = (value as Record<string, unknown>)[segment]
        if (candidate !== undefined && candidate !== null) {
          next.push(candidate)
        }
      }
    }

    if (next.length === 0) {
      return []
    }

    current = next
  }

  return current
}

export const pickValue = (source: unknown, keys: string[]): unknown => {
  if (!source) {
    return undefined
  }

  for (const key of keys) {
    const path = key.split('.')
    let current: unknown = source

    for (const segment of path) {
      if (current === undefined || current === null) {
        break
      }

      if (typeof current !== 'object') {
        current = undefined
        break
      }

      current = (current as Record<string, unknown>)[segment]
    }

    if (current !== undefined && current !== null && current !== '') {
      return current
    }
  }

  return undefined
}

export const collectStringValuesAtPaths = (source: unknown, paths: string[]): string[] => {
  if (!source) {
    return []
  }

  const values: string[] = []
  const seen = new Set<string>()

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

export const isLikelyGuid = (value: unknown): boolean => {
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

const ORDER_GUID_KEYS = [
  'guid',
  'id',
  'uuid',
  'orderGuid',
  'order_guid',
  'orderId',
  'order_id',
  'order.guid',
  'order.id',
  'order.uuid',
  'data.guid',
  'data.id',
  'data.uuid',
  'payload.guid',
  'payload.id',
  'payload.uuid',
]

export const extractOrderGuid = (order: unknown): string | undefined => {
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

const ORDER_TIMESTAMP_FIELDS: (keyof ToastOrder)[] = [
  'openedDate',
  'createdDate',
  'promisedDate',
  'estimatedFulfillmentDate',
  'modifiedDate',
  'paidDate',
]

const CHECK_TIMESTAMP_FIELDS: (keyof ToastCheck)[] = [
  'openedDate',
  'createdDate',
  'modifiedDate',
  'paidDate',
  'closedDate',
]

const getRecordString = (record: unknown, key: string): string | undefined => {
  if (!record || typeof record !== 'object') {
    return undefined
  }

  const value = (record as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

const getSelectionIdentifiers = (selection: ToastSelection): string[] => {
  const identifiers = new Set<string>()

  const add = (candidate: unknown) => {
    const normalized = toStringValue(candidate)?.trim()
    if (normalized) {
      identifiers.add(normalized)
    }
  }

  add(selection.guid)
  add(selection.externalId)
  add(getRecordString(selection.item, 'guid'))
  add(getRecordString(selection.item, 'externalId'))
  add(getRecordString(selection.itemGroup, 'guid'))
  add(getRecordString(selection.itemGroup, 'externalId'))
  add(getRecordString(selection.preModifier, 'guid'))
  add(getRecordString(selection.preModifier, 'externalId'))

  return Array.from(identifiers)
}

const getSelectionName = (
  selection: ToastSelection,
  identifiers: string[],
  menuLookup?: MenuLookup,
): string | undefined => {
  const direct = toStringValue(selection.displayName)?.trim()
  if (direct) {
    return direct
  }

  if (!menuLookup) {
    return undefined
  }

  for (const identifier of identifiers) {
    const entry = menuLookup.get(identifier)
    if (!entry) {
      continue
    }

    const menuName =
      entry.kitchenName ?? entry.displayName ?? entry.posName ?? entry.fallbackName
    if (menuName) {
      return menuName
    }
  }

  return undefined
}

const aggregateModifiers = (
  selection: ToastSelection,
  menuLookup?: MenuLookup,
  modifierMetadataLookup?: ModifierMetadataLookup,
) => {
  const modifiers = ensureArray(selection.modifiers)
  if (modifiers.length === 0) {
    return []
  }

  const aggregated = new Map<string, NormalizedModifier>()

  const upsert = (
    identifier: string | undefined,
    name: string,
    quantity: number,
    metadata?: ModifierMetadata,
  ) => {
    const normalizedNameKey = normalizeLookupKey(name) ?? name.toLowerCase()
    const key = identifier ?? normalizedNameKey
    const existing = aggregated.get(key)
    if (!existing) {
      aggregated.set(key, {
        id: identifier ?? key,
        identifier,
        name,
        quantity,
        groupName: metadata?.groupName,
        groupId: metadata?.groupId ?? metadata?.groupName,
        groupOrder: metadata?.groupOrder,
        optionOrder: metadata?.optionOrder,
        optionName: metadata?.optionName,
      })
      return
    }

    existing.quantity += quantity
    if (!existing.identifier && identifier) {
      existing.identifier = identifier
      existing.id = identifier
    }

    if (metadata) {
      if (!existing.groupName && metadata.groupName) {
        existing.groupName = metadata.groupName
      }
      if (!existing.groupId && (metadata.groupId ?? metadata.groupName)) {
        existing.groupId = metadata.groupId ?? metadata.groupName
      }
      if (existing.groupOrder === undefined && metadata.groupOrder !== undefined) {
        existing.groupOrder = metadata.groupOrder
      }
      if (existing.optionOrder === undefined && metadata.optionOrder !== undefined) {
        existing.optionOrder = metadata.optionOrder
      }
      if (!existing.optionName && metadata.optionName) {
        existing.optionName = metadata.optionName
      }
    }
  }

  modifiers.forEach((modifier) => {
    if (!isObject(modifier)) {
      return
    }

    const typedModifier = modifier as unknown as ToastSelection
    const identifiers = getSelectionIdentifiers(typedModifier)
    const name =
      getSelectionName(typedModifier, identifiers, menuLookup) ??
      toStringValue(typedModifier.displayName)?.trim()

    if (!name) {
      return
    }

    const quantity = toNumber(typedModifier.quantity) ?? 1
    const metadataIdentifier = modifierMetadataLookup
      ? identifiers.find((id) => modifierMetadataLookup.has(id))
      : undefined
    const metadata = metadataIdentifier
      ? modifierMetadataLookup?.get(metadataIdentifier)
      : undefined
    const normalizedQuantity = quantity > 0 ? quantity : 1

    upsert(metadataIdentifier, name, normalizedQuantity, metadata)
  })

  return Array.from(aggregated.values())
}

export const normalizeItemModifiers = (
  selection: ToastSelection,
  menuLookup?: MenuLookup,
  modifierMetadataLookup?: ModifierMetadataLookup,
): NormalizedModifier[] =>
  aggregateModifiers(selection, menuLookup, modifierMetadataLookup)

const buildItem = (
  selection: ToastSelection,
  menuLookup?: MenuLookup,
  modifierMetadataLookup?: ModifierMetadataLookup,
): NormalizedOrderItem => {
  const identifiers = getSelectionIdentifiers(selection)
  const name =
    getSelectionName(selection, identifiers, menuLookup) ??
    toStringValue(selection.displayName)?.trim() ??
    identifiers[0] ??
    'Item'

  const quantity = toNumber(selection.quantity) ?? 1
  const price = toNumber(selection.price) ?? toNumber(selection.receiptLinePrice)
  const notes = toStringValue((selection as Record<string, unknown>).notes)?.trim()

  return {
    id: selection.guid ?? identifiers[0] ?? name,
    name,
    quantity: quantity > 0 ? quantity : 1,
    price: price ?? undefined,
    currency: undefined,
    modifiers: normalizeItemModifiers(selection, menuLookup, modifierMetadataLookup),
    notes: notes || undefined,
  }
}

export const normalizeOrderItems = (
  order: ToastOrder,
  menuLookup?: MenuLookup,
  modifierMetadataLookup?: ModifierMetadataLookup,
): NormalizedOrderItem[] => {
  if (!order || !Array.isArray(order.checks)) {
    return []
  }

  const items: NormalizedOrderItem[] = []

  order.checks.forEach((check) => {
    if (!check || !Array.isArray(check.selections)) {
      return
    }

    check.selections.forEach((selection) => {
      if (!selection) {
        return
      }

      items.push(buildItem(selection, menuLookup, modifierMetadataLookup))
    })
  })

  return items
}

const FULFILLMENT_PRIORITY: Record<string, number> = {
  READY: 4,
  SENT: 3,
  HOLD: 2,
  NEW: 1,
}

export const selectFulfillmentStatus = (candidates: string[]): string | undefined => {
  if (!candidates || candidates.length === 0) {
    return undefined
  }

  let bestStatus: string | undefined
  let bestRank = -1

  candidates.forEach((candidate) => {
    if (!candidate) {
      return
    }

    const normalized = candidate.trim().toUpperCase()
    const rank = FULFILLMENT_PRIORITY[normalized]
    if (rank && rank > bestRank) {
      bestRank = rank
      bestStatus = normalized
    }
  })

  return bestStatus
}

const resolveTimestamp = (order: ToastOrder): { date?: Date; raw?: string } => {
  const candidates: string[] = []

  ORDER_TIMESTAMP_FIELDS.forEach((field) => {
    const value = order[field]
    if (typeof value === 'string') {
      candidates.push(value)
    }
  })

  ensureArray(order.checks).forEach((check) => {
    CHECK_TIMESTAMP_FIELDS.forEach((field) => {
      const value = check?.[field]
      if (typeof value === 'string') {
        candidates.push(value)
      }
    })
  })

  for (const raw of candidates) {
    const date = parseDateLike(raw)
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return { date, raw }
    }
  }

  return {}
}

const joinNames = (first?: string | null, last?: string | null) => {
  const parts = [first, last].map((part) => part?.trim()).filter(Boolean) as string[]
  return parts.join(' ').trim() || undefined
}

const resolveCustomerName = (check: ToastCheck): string | undefined => {
  const customer = check.customer as Record<string, unknown> | undefined
  if (!customer) {
    return undefined
  }

  const first = toStringValue(customer.firstName)
  const last = toStringValue(customer.lastName)
  const combined = joinNames(first, last)
  if (combined) {
    return combined
  }

  const fallback =
    toStringValue(customer.name) ??
    toStringValue(customer.displayName) ??
    toStringValue(customer.phone) ??
    toStringValue(customer.email)

  return fallback ?? undefined
}

export const resolveOrderDiningOption = (
  order: ToastOrder,
  diningOptionLookup: Map<string, string> = new Map(),
) => {
  const candidates: string[] = []

  const pushCandidate = (value: unknown) => {
    const normalized = toStringValue(value)?.trim()
    if (normalized) {
      candidates.push(normalized)
    }
  }

  if (order.diningOption) {
    pushCandidate((order.diningOption as Record<string, unknown>).guid)
    pushCandidate((order.diningOption as Record<string, unknown>).externalId)
    pushCandidate((order.diningOption as Record<string, unknown>).displayName)
    pushCandidate((order.diningOption as Record<string, unknown>).name)
  }

  ensureArray(order.checks).forEach((check) => {
    if (!check) {
      return
    }

    const diningOption = check.diningOption as Record<string, unknown> | undefined
    if (diningOption) {
      pushCandidate(diningOption.guid)
      pushCandidate(diningOption.externalId)
      pushCandidate(diningOption.displayName)
      pushCandidate(diningOption.name)
    }

    ensureArray(check.selections).forEach((selection) => {
      if (!selection) {
        return
      }

      const dining = selection.diningOption as Record<string, unknown> | undefined
      if (dining) {
        pushCandidate(dining.guid)
        pushCandidate(dining.externalId)
        pushCandidate(dining.displayName)
        pushCandidate(dining.name)
      }
    })
  })

  for (const candidate of candidates) {
    const lookupKey = normalizeLookupKey(candidate)
    if (lookupKey && diningOptionLookup.has(lookupKey)) {
      return diningOptionLookup.get(lookupKey)
    }
  }

  return candidates.find((candidate) => candidate && candidate.length > 0)
}

const isToastSelection = (value: unknown): value is ToastSelection => {
  if (!isObject(value)) {
    return false
  }

  const quantity = (value as Record<string, unknown>).quantity
  if (quantity !== undefined && typeof quantity !== 'number') {
    return false
  }

  const modifiers = (value as Record<string, unknown>).modifiers
  if (modifiers !== undefined && modifiers !== null && !Array.isArray(modifiers)) {
    return false
  }

  return true
}

const isToastCheck = (value: unknown): value is ToastCheck => {
  if (!isObject(value)) {
    return false
  }

  const selections = (value as Record<string, unknown>).selections
  if (selections !== undefined && !Array.isArray(selections)) {
    return false
  }

  return !selections || selections.every(isToastSelection)
}

const isToastOrder = (value: unknown): value is ToastOrder => {
  if (!isObject(value)) {
    return false
  }

  if (typeof (value as Record<string, unknown>).guid !== 'string') {
    return false
  }

  const checks = (value as Record<string, unknown>).checks
  if (!Array.isArray(checks)) {
    return false
  }

  return checks.every(isToastCheck)
}

export const extractOrdersFromPayload = (payload: unknown): ToastOrder[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const root = payload as Record<string, unknown>
  const orders = root.orders
  const data = root.data

  const candidates: unknown[] = []

  if (Array.isArray(orders)) {
    candidates.push(...orders)
  }

  if (candidates.length === 0 && Array.isArray(data)) {
    candidates.push(...data)
  }

  return candidates.filter(isToastOrder)
}

export const normalizeOrders = (
  rawOrders: ToastOrder[],
  menuLookup: MenuLookup = new Map(),
  diningOptionLookup: Map<string, string> = new Map(),
  modifierMetadataLookup: ModifierMetadataLookup = new Map(),
): NormalizedOrder[] => {
  const collection = ensureArray(rawOrders)

  const normalized = collection
    .map((order, index) => {
      if (!isToastOrder(order)) {
        return null
      }

      const guid = order.guid
      const displayNumber = toStringValue(order.displayNumber)

      const checks = ensureArray(order.checks)
      const primaryCheck = checks[0]

      const timestamp = resolveTimestamp(order)
      const total = checks.reduce((sum, check) => sum + (toNumber(check?.totalAmount) ?? 0), 0)

      const checkCustomerName = primaryCheck ? resolveCustomerName(primaryCheck) : undefined
      const tabName =
        toStringValue(order?.table ? (order.table as Record<string, unknown>).name : undefined)?.trim() ??
        toStringValue(primaryCheck?.tabName)?.trim() ??
        checkCustomerName

      const status =
        toStringValue(order.approvalStatus)?.trim() ??
        toStringValue(primaryCheck?.paymentStatus)?.trim() ??
        undefined

      const fulfillmentStatus = selectFulfillmentStatus(
        checks.flatMap((check) =>
          ensureArray(check?.selections).map((selection) =>
            toStringValue(selection?.fulfillmentStatus)?.trim()?.toUpperCase() ?? '',
          ),
        ),
      )

      const customerName = checkCustomerName ?? undefined
      const diningOption = resolveOrderDiningOption(order, diningOptionLookup)

      return {
        id: guid ?? displayNumber ?? `order-${index}`,
        displayId: displayNumber ?? primaryCheck?.displayNumber ?? `#${index + 1}`,
        guid,
        status,
        createdAt: timestamp.date,
        createdAtRaw: timestamp.raw,
        total: total || undefined,
        currency: undefined,
        customerName,
        diningOption,
        fulfillmentStatus,
        notes: undefined,
        tabName: tabName ?? undefined,
        items: normalizeOrderItems(order, menuLookup, modifierMetadataLookup),
        originalIndex: index,
      }
    })
    .filter((value): value is NormalizedOrder & { originalIndex: number } => value !== null)

  normalized.sort((a, b) => {
    const aTime = a.createdAt?.getTime()
    const bTime = b.createdAt?.getTime()

    if (typeof aTime === 'number' && typeof bTime === 'number') {
      return aTime - bTime
    }

    if (typeof aTime !== 'number' && typeof bTime !== 'number') {
      return a.originalIndex - b.originalIndex
    }

    return typeof aTime !== 'number' ? 1 : -1
  })

  return normalized.map(({ originalIndex, ...order }) => order)
}

