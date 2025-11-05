import { extractOrderGuid, type NormalizedOrder, type ToastOrder } from './normalizeOrders'

type DiffMismatch = {
  field: string
  normalizedValue: unknown
  rawValue: unknown
}

type DiffEntry = {
  guid: string
  normalizedOnly?: boolean
  rawOnly?: boolean
  mismatches?: DiffMismatch[]
}

type DiffResult = {
  entries: DiffEntry[]
  issues: string[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toNormalizedKey = (order: NormalizedOrder, fallbackIndex: number): string | undefined => {
  if (typeof order?.guid === 'string' && order.guid.trim()) {
    return order.guid.trim()
  }

  if (typeof order?.id === 'string' && order.id.trim()) {
    return order.id.trim()
  }

  if (Number.isFinite(fallbackIndex)) {
    return `normalized-${fallbackIndex}`
  }

  return undefined
}

const toRawOrders = (rawOrders: unknown, issues: string[]): ToastOrder[] => {
  if (!Array.isArray(rawOrders)) {
    issues.push('Raw orders payload was not an array.')
    return []
  }

  return rawOrders.filter((candidate): candidate is ToastOrder => {
    if (!isObject(candidate)) {
      issues.push('Encountered a non-object entry in the raw orders payload.')
      return false
    }

    const guid = extractOrderGuid(candidate)
    if (!guid) {
      issues.push('Encountered a raw order without a GUID.')
      return false
    }

    return true
  })
}

const toNormalizedOrders = (orders: unknown, issues: string[]): NormalizedOrder[] => {
  if (!Array.isArray(orders)) {
    issues.push('Normalized orders payload was not an array.')
    return []
  }

  return orders.filter((candidate): candidate is NormalizedOrder => {
    if (!isObject(candidate)) {
      issues.push('Encountered a non-object entry in the normalized orders payload.')
      return false
    }

    if (!Array.isArray((candidate as NormalizedOrder).items)) {
      issues.push('Normalized order is missing an items array.')
      return false
    }

    return true
  })
}

const countRawSelections = (order: ToastOrder): number => {
  const checks = Array.isArray(order?.checks) ? order.checks : []
  return checks.reduce((count, check) => {
    const selections = Array.isArray(check?.selections) ? check.selections : []
    return count + selections.length
  }, 0)
}

const getRawStatus = (order: ToastOrder): string | undefined => {
  const status = (order as Record<string, unknown>).status
  if (typeof status === 'string') {
    return status
  }

  if (isObject(status) && typeof status.status === 'string') {
    return status.status
  }

  return undefined
}

const getRawFulfillmentStatus = (order: ToastOrder): string | undefined => {
  if (typeof (order as Record<string, unknown>).fulfillmentStatus === 'string') {
    return (order as Record<string, unknown>).fulfillmentStatus as string
  }

  const status = (order as Record<string, unknown>).status
  if (isObject(status) && typeof status.fulfillmentStatus === 'string') {
    return status.fulfillmentStatus
  }

  return undefined
}

export const computeOrdersDebugDiff = (
  normalizedOrdersInput: unknown,
  rawOrdersInput: unknown,
): DiffResult => {
  const issues: string[] = []
  const normalizedOrders = toNormalizedOrders(normalizedOrdersInput, issues)
  const rawOrders = toRawOrders(rawOrdersInput, issues)

  const normalizedMap = new Map<string, NormalizedOrder>()
  normalizedOrders.forEach((order, index) => {
    const key = toNormalizedKey(order, index)
    if (!key) {
      issues.push('Unable to derive a stable key for a normalized order.')
      return
    }

    normalizedMap.set(key, order)
  })

  const rawMap = new Map<string, ToastOrder>()
  rawOrders.forEach((order) => {
    const guid = extractOrderGuid(order)
    if (!guid) {
      return
    }

    rawMap.set(guid, order)
  })

  const allGuids = new Set<string>()
  normalizedMap.forEach((_value, key) => {
    allGuids.add(key)
  })
  rawMap.forEach((_value, key) => {
    allGuids.add(key)
  })

  const entries: DiffEntry[] = []

  allGuids.forEach((guid) => {
    const normalized = normalizedMap.get(guid)
    const raw = rawMap.get(guid)

    if (normalized && !raw) {
      entries.push({ guid, normalizedOnly: true })
      return
    }

    if (!normalized && raw) {
      entries.push({ guid, rawOnly: true })
      return
    }

    if (!normalized || !raw) {
      return
    }

    const mismatches: DiffMismatch[] = []

    const normalizedStatus = normalized.status ?? undefined
    const rawStatus = getRawStatus(raw)
    if (normalizedStatus !== rawStatus) {
      mismatches.push({ field: 'status', normalizedValue: normalizedStatus, rawValue: rawStatus })
    }

    const normalizedFulfillment = normalized.fulfillmentStatus ?? undefined
    const rawFulfillment = getRawFulfillmentStatus(raw)
    if (normalizedFulfillment !== rawFulfillment) {
      mismatches.push({
        field: 'fulfillmentStatus',
        normalizedValue: normalizedFulfillment,
        rawValue: rawFulfillment,
      })
    }

    const normalizedItemCount = Array.isArray(normalized.items) ? normalized.items.length : 0
    const rawSelectionCount = countRawSelections(raw)
    if (normalizedItemCount !== rawSelectionCount) {
      mismatches.push({
        field: 'itemCount',
        normalizedValue: normalizedItemCount,
        rawValue: rawSelectionCount,
      })
    }

    if (mismatches.length > 0) {
      entries.push({ guid, mismatches })
    }
  })

  return { entries, issues }
}

export type { DiffEntry as OrdersDebugDiffEntry, DiffResult as OrdersDebugDiffResult }
