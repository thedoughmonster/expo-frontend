import type { ToastOrder, NormalizedOrder } from './normalizeOrders'
import stableStringify from '../../utils/stableStringify'
import { safeDelete, safeGet, safeSet } from '../storage/safeIndexedDb'

export type OrderCacheEntry = {
  guid: string
  raw: ToastOrder
  normalized: NormalizedOrder
  fingerprint: string
  lastSeenAt: string
  isReady: boolean
}

export type OrdersCacheSnapshot = {
  entries: OrderCacheEntry[]
  lastCursor?: string
  lastFetchedAt?: string
}

const ORDERS_CACHE_KEY = 'orders-cache-v1'

export const computeOrderFingerprint = (order: ToastOrder): string =>
  stableStringify(order)

export const loadOrdersCache = async (): Promise<OrdersCacheSnapshot | undefined> => {
  const snapshot = await safeGet<OrdersCacheSnapshot>(ORDERS_CACHE_KEY)
  if (!snapshot) {
    return undefined
  }

  if (!Array.isArray(snapshot.entries)) {
    return undefined
  }

  return {
    entries: snapshot.entries.filter((entry) => entry && typeof entry.guid === 'string'),
    lastCursor: snapshot.lastCursor,
    lastFetchedAt: snapshot.lastFetchedAt,
  }
}

export const saveOrdersCache = async (snapshot: OrdersCacheSnapshot): Promise<void> => {
  await safeSet(ORDERS_CACHE_KEY, snapshot)
}

export const clearOrdersCache = async (): Promise<void> => {
  await safeDelete(ORDERS_CACHE_KEY)
}
