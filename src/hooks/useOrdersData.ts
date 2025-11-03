import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  buildModifierMetadataLookup,
} from '../domain/menus/menuLookup'
import {
  type NormalizedOrder,
  type ToastOrder,
  extractOrderGuid,
  normalizeOrders,
} from '../domain/orders/normalizeOrders'
import {
  computeOrderFingerprint,
  loadOrdersCache,
  saveOrdersCache,
  type OrderCacheEntry,
} from '../domain/orders/ordersCache'
import {
  loadMenuCache,
  menuCacheIsFresh,
  prepareMenuCacheSnapshot,
  saveMenuCache,
  type MenuCacheSnapshot,
} from '../domain/menus/menuCache'
import {
  loadConfigCache,
  configCacheIsFresh,
  prepareConfigCacheSnapshot,
  saveConfigCache,
  type ConfigCacheSnapshot,
} from '../domain/config/configCache'
import stableStringify from '../utils/stableStringify'
import { fetchToastOrderByGuid, fetchToastOrders } from '../api/orders'
import type { OrdersLatestQuery, ToastSelection } from '../api/orders'
import { APP_SETTINGS } from '../config/appSettings'

const {
  menusEndpoint: MENUS_ENDPOINT,
  configSnapshotEndpoint: CONFIG_SNAPSHOT_ENDPOINT,
  pollLimit: POLL_LIMIT,
  orderPollingWindowMinutes: FALLBACK_MINUTES,
  driftBufferMs: DRIFT_BUFFER_MS,
  staleActiveRetentionMs: STALE_ACTIVE_RETENTION_MS,
  staleReadyRetentionMs: STALE_READY_RETENTION_MS,
  targetedFetchConcurrency: TARGETED_CONCURRENCY,
  targetedFetchMaxRetries: TARGETED_MAX_RETRIES,
  targetedFetchBackoffMs: TARGETED_BACKOFF_MS,
  pollIntervalMs: POLL_INTERVAL_MS,
} = APP_SETTINGS

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

type InMemoryOrderEntry = {
  guid: string
  raw: ToastOrder
  normalized: NormalizedOrder
  fingerprint: string
  lastSeenAtMs: number
  isReady: boolean
  normalizedVersion: number
}

type PollingIntervalHandle = ReturnType<typeof setInterval>

type RefreshOptions = {
  silent?: boolean
}

type MenuFetchResult = {
  payload: unknown
  snapshot: MenuCacheSnapshot
}

type ConfigFetchResult = {
  payload: unknown
  snapshot: ConfigCacheSnapshot
}

type FetchResultError = {
  error: Error
}

const isFetchError = (value: unknown): value is FetchResultError =>
  Boolean(value && typeof value === 'object' && 'error' in value)

const READY_STATUS = 'READY'

export const computeIsOrderReady = (order: NormalizedOrder | undefined): boolean => {
  if (!order) {
    return false
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.every(
      (item) => (item.fulfillmentStatus ?? '').trim().toUpperCase() === READY_STATUS,
    )
  }

  return (order.fulfillmentStatus ?? '').trim().toUpperCase() === READY_STATUS
}

const parseCacheControlMaxAge = (headerValue: string | null): number | undefined => {
  if (!headerValue) {
    return undefined
  }

  const directives = headerValue.split(',')
  for (const directive of directives) {
    const [rawKey, rawValue] = directive.trim().split('=')
    if (!rawKey) {
      continue
    }

    if (rawKey.toLowerCase() !== 'max-age') {
      continue
    }

    if (!rawValue) {
      continue
    }

    const seconds = Number(rawValue.trim())
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds
    }
  }

  return undefined
}

const toNormalizedOrders = (entries: Iterable<InMemoryOrderEntry>): NormalizedOrder[] => {
  const list = Array.from(entries)
  list.sort((a, b) => {
    const aTime = a.normalized.createdAt?.getTime()
    const bTime = b.normalized.createdAt?.getTime()

    if (typeof aTime === 'number' && typeof bTime === 'number') {
      return aTime - bTime
    }

    if (typeof aTime === 'number') {
      return -1
    }

    if (typeof bTime === 'number') {
      return 1
    }

    const aRaw = a.normalized.createdAtRaw ?? ''
    const bRaw = b.normalized.createdAtRaw ?? ''

    if (aRaw && bRaw) {
      return aRaw.localeCompare(bRaw)
    }

    return a.guid.localeCompare(b.guid)
  })

  return list.map((entry) => entry.normalized)
}

const buildOrdersQuery = (cursorIso: string | undefined, now: number): OrdersLatestQuery => {
  let since: string | undefined

  if (cursorIso) {
    const cursorMs = Date.parse(cursorIso)
    if (Number.isFinite(cursorMs)) {
      const earliestAllowed = now - FALLBACK_MINUTES * 60_000
      const buffered = cursorMs - DRIFT_BUFFER_MS
      const sinceMs = Math.max(earliestAllowed, buffered)
      since = new Date(Math.max(sinceMs, 0)).toISOString()
    }
  }

  const query: OrdersLatestQuery = {
    limit: POLL_LIMIT,
    detail: 'ids',
    timeZone: 'UTC',
  }

  if (since) {
    query.since = since
  } else {
    query.minutes = FALLBACK_MINUTES
  }

  return query
}

const collectOrderTimestamps = (orders: ToastOrder[]): number[] => {
  const timestamps: number[] = []

  orders.forEach((order) => {
    if (typeof order.modifiedDate === 'string') {
      const parsed = Date.parse(order.modifiedDate)
      if (Number.isFinite(parsed)) {
        timestamps.push(parsed)
      }
    }

    if (typeof order.createdDate === 'string') {
      const parsed = Date.parse(order.createdDate)
      if (Number.isFinite(parsed)) {
        timestamps.push(parsed)
      }
    }

    order.checks?.forEach((check) => {
      if (typeof check?.modifiedDate === 'string') {
        const parsed = Date.parse(check.modifiedDate)
        if (Number.isFinite(parsed)) {
          timestamps.push(parsed)
        }
      }

      if (typeof check?.createdDate === 'string') {
        const parsed = Date.parse(check.createdDate)
        if (Number.isFinite(parsed)) {
          timestamps.push(parsed)
        }
      }

      ;(check?.selections as ToastSelection[] | undefined)?.forEach((selection) => {
        if (typeof selection?.modifiedDate === 'string') {
          const parsed = Date.parse(selection.modifiedDate)
          if (Number.isFinite(parsed)) {
            timestamps.push(parsed)
          }
        }
      })
    })
  })

  return timestamps
}

const useOrdersData = () => {
  const [orders, setOrders] = useState<NormalizedOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isHydrating, setIsHydrating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isMountedRef = useRef(true)
  const activeControllerRef = useRef<AbortController | null>(null)

  const orderCacheRef = useRef<Map<string, InMemoryOrderEntry>>(new Map())
  const menuCacheRef = useRef<MenuCacheSnapshot | undefined>(undefined)
  const configCacheRef = useRef<ConfigCacheSnapshot | undefined>(undefined)
  const cursorRef = useRef<string | undefined>(undefined)
  const lastFetchRef = useRef<number | undefined>(undefined)
  const pollIntervalRef = useRef<PollingIntervalHandle | null>(null)

  const lookupsRef = useRef({
    menuLookup: new Map(),
    modifierMetadataLookup: new Map(),
    diningOptionLookup: new Map<string, string>(),
    version: 0,
    menuSignature: '',
    configSignature: '',
  })

  const abortActiveRequest = useCallback(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort()
      activeControllerRef.current = null
    }
  }, [])

  const clearPollingInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      abortActiveRequest()
      clearPollingInterval()
    }
  }, [abortActiveRequest, clearPollingInterval])

  const publishOrders = useCallback(() => {
    setOrders(toNormalizedOrders(orderCacheRef.current.values()))
  }, [])

  const applyLookupPayloads = useCallback((menuPayload?: unknown, configPayload?: unknown) => {
    let changed = false
    const current = lookupsRef.current

    if (menuPayload !== undefined) {
      const signature = stableStringify(menuPayload ?? null)
      if (signature !== current.menuSignature) {
        current.menuLookup = buildMenuItemLookup(menuPayload)
        current.modifierMetadataLookup = buildModifierMetadataLookup(menuPayload)
        current.menuSignature = signature
        changed = true
      }
    }

    if (configPayload !== undefined) {
      const signature = stableStringify(configPayload ?? null)
      if (signature !== current.configSignature) {
        current.diningOptionLookup = buildDiningOptionLookup(configPayload)
        current.configSignature = signature
        changed = true
      }
    }

    if (changed) {
      current.version += 1
    }

    return changed
  }, [])

  const reNormalizeOrders = useCallback(() => {
    let changed = false
    const { menuLookup, modifierMetadataLookup, diningOptionLookup, version } = lookupsRef.current

    orderCacheRef.current.forEach((entry, guid) => {
      const normalized = normalizeOrders(
        [entry.raw],
        menuLookup,
        diningOptionLookup,
        modifierMetadataLookup,
      )[0]

      if (!normalized) {
        orderCacheRef.current.delete(guid)
        changed = true
        return
      }

      entry.normalized = normalized
      entry.isReady = computeIsOrderReady(normalized)
      entry.normalizedVersion = version
      changed = true
    })

    if (changed) {
      publishOrders()
    }

    return changed
  }, [publishOrders])

  const applyRawOrder = useCallback((order: ToastOrder, now: number) => {
    const guid = extractOrderGuid(order)
    if (!guid) {
      return
    }

    const fingerprint = computeOrderFingerprint(order)
    const entry = orderCacheRef.current.get(guid)
    const { menuLookup, modifierMetadataLookup, diningOptionLookup, version } = lookupsRef.current

    if (!entry || entry.fingerprint !== fingerprint || entry.normalizedVersion !== version) {
      const normalized = normalizeOrders(
        [order],
        menuLookup,
        diningOptionLookup,
        modifierMetadataLookup,
      )[0]

      if (!normalized) {
        if (entry) {
          orderCacheRef.current.delete(guid)
        }
        return
      }

      orderCacheRef.current.set(guid, {
        guid,
        raw: order,
        normalized,
        fingerprint,
        lastSeenAtMs: now,
        isReady: computeIsOrderReady(normalized),
        normalizedVersion: version,
      })
      return
    }

    entry.raw = order
    entry.fingerprint = fingerprint
    entry.lastSeenAtMs = now
    entry.isReady = computeIsOrderReady(entry.normalized)
  }, [])

  const applyOrdersBatch = useCallback(
    (ordersPayload: ToastOrder[], now: number) => {
      const seenGuids = new Set<string>()

      ordersPayload.forEach((order) => {
        const guid = extractOrderGuid(order)
        if (!guid) {
          return
        }

        seenGuids.add(guid)
        applyRawOrder(order, now)
      })

      if (seenGuids.size > 0) {
        publishOrders()
      }

      return seenGuids
    },
    [applyRawOrder, publishOrders],
  )

  const fetchMenusWithCache = useCallback(
    async (signal: AbortSignal): Promise<MenuFetchResult> => {
      const now = Date.now()
      const cached = menuCacheRef.current

      if (cached && menuCacheIsFresh(cached, now)) {
        return { payload: cached.payload, snapshot: cached }
      }

      const response = await fetch(MENUS_ENDPOINT, { signal })
      if (!response.ok) {
        throw new Error(`Menus request failed with status ${response.status}`)
      }

      const payload = await response.json()
      const cacheControl = response.headers.get('cache-control')
      const maxAgeSeconds = parseCacheControlMaxAge(cacheControl)
      const ttlMs = maxAgeSeconds ? maxAgeSeconds * 1000 : undefined
      const snapshot = prepareMenuCacheSnapshot(payload, ttlMs, now)
      menuCacheRef.current = snapshot
      await saveMenuCache(snapshot)

      return { payload, snapshot }
    },
    [],
  )

  const fetchConfigWithCache = useCallback(
    async (signal: AbortSignal): Promise<ConfigFetchResult> => {
      const now = Date.now()
      const cached = configCacheRef.current

      if (cached && configCacheIsFresh(cached, now)) {
        return { payload: cached.payload, snapshot: cached }
      }

      const response = await fetch(CONFIG_SNAPSHOT_ENDPOINT, { signal })
      if (!response.ok) {
        throw new Error(`Config request failed with status ${response.status}`)
      }

      const payload = await response.json()
      const ttlSeconds = typeof payload?.ttlSeconds === 'number' ? payload.ttlSeconds : undefined
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined
      const snapshot = prepareConfigCacheSnapshot(payload, ttlMs, now)
      configCacheRef.current = snapshot
      await saveConfigCache(snapshot)

      return { payload, snapshot }
    },
    [],
  )

  const removeStaleEntries = useCallback(
    (now: number, seenGuids: Set<string>) => {
      let removed = false

      orderCacheRef.current.forEach((entry, guid) => {
        if (seenGuids.has(guid)) {
          return
        }

        const age = now - entry.lastSeenAtMs
        const ttl = entry.isReady ? STALE_READY_RETENTION_MS : STALE_ACTIVE_RETENTION_MS

        if (age > ttl) {
          orderCacheRef.current.delete(guid)
          removed = true
        }
      })

      if (removed) {
        publishOrders()
      }

      return removed
    },
    [publishOrders],
  )

  const persistOrdersCache = useCallback(async () => {
    const snapshotEntries: OrderCacheEntry[] = Array.from(orderCacheRef.current.values()).map((entry) => ({
      guid: entry.guid,
      raw: entry.raw,
      normalized: entry.normalized,
      fingerprint: entry.fingerprint,
      lastSeenAt: new Date(entry.lastSeenAtMs).toISOString(),
      isReady: entry.isReady,
    }))

    await saveOrdersCache({
      entries: snapshotEntries,
      lastCursor: cursorRef.current,
      lastFetchedAt: lastFetchRef.current
        ? new Date(lastFetchRef.current).toISOString()
        : undefined,
    })
  }, [])

  const fetchOrdersByGuidList = useCallback(
    async (guids: string[], signal: AbortSignal, now: number) => {
      const seen = new Set<string>()
      const fetchedOrders: ToastOrder[] = []

      if (guids.length === 0) {
        return { seen, orders: fetchedOrders }
      }

      for (let i = 0; i < guids.length; i += TARGETED_CONCURRENCY) {
        const batch = guids.slice(i, i + TARGETED_CONCURRENCY)
        const results = await Promise.all(
          batch.map(async (guid) => {
            let attempt = 0
            while (attempt <= TARGETED_MAX_RETRIES) {
              try {
                const order = await fetchToastOrderByGuid(guid, { signal })
                return { guid, order }
              } catch (err) {
                if ((err as Error)?.name === 'AbortError' || signal.aborted) {
                  throw err
                }

                if (attempt === TARGETED_MAX_RETRIES) {
                  return { guid, order: undefined }
                }

                await delay(TARGETED_BACKOFF_MS * (attempt + 1))
                attempt += 1
              }
            }

            return { guid, order: undefined }
          }),
        )

        results.forEach(({ guid, order }) => {
          if (order === null) {
            orderCacheRef.current.delete(guid)
            return
          }

          if (order) {
            seen.add(guid)
            fetchedOrders.push(order)
            applyRawOrder(order, now)
          }
        })
      }

      if (fetchedOrders.length > 0) {
        publishOrders()
      }

      return { seen, orders: fetchedOrders }
    },
    [applyRawOrder, publishOrders],
  )

  const refreshActiveOrders = useCallback(
    async (signal: AbortSignal, now: number, excludeGuids?: Set<string>) => {
      const activeGuids = Array.from(orderCacheRef.current.values())
        .filter((entry) => !entry.isReady && !(excludeGuids?.has(entry.guid)))
        .map((entry) => entry.guid)

      if (activeGuids.length === 0) {
        return new Set<string>()
      }

      const { seen } = await fetchOrdersByGuidList(activeGuids, signal, now)

      return seen
    },
    [fetchOrdersByGuidList],
  )

  const refresh = useCallback(
    async ({ silent = false }: RefreshOptions = {}) => {
      if (!isMountedRef.current) {
        return
      }

      abortActiveRequest()

      const controller = new AbortController()
      activeControllerRef.current = controller
      const { signal } = controller

      if (signal.aborted) {
        return
      }

      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
        setIsRefreshing(false)
      }

      setIsHydrating(true)
      setError(null)

      try {
        const now = Date.now()
        const query = buildOrdersQuery(cursorRef.current, now)

        const ordersPromise = fetchToastOrders({ signal, query })
        const menusPromise = fetchMenusWithCache(signal).catch((error: Error) => ({ error }))
        const configPromise = fetchConfigWithCache(signal).catch((error: Error) => ({ error }))

        const ordersPayload = await ordersPromise
        if (signal.aborted || !isMountedRef.current) {
          return
        }

        const windowTimestamps: number[] = []
        const seenGuids = new Set<string>()
        let targetedExclusions: Set<string> | undefined

        if (ordersPayload.detail === 'ids') {
          const candidateGuids = new Set<string>()
          if (Array.isArray(ordersPayload.ids)) {
            ordersPayload.ids.forEach((value) => {
              if (typeof value === 'string') {
                candidateGuids.add(value)
              }
            })
          }

          if (Array.isArray(ordersPayload.orders)) {
            ordersPayload.orders.forEach((value) => {
              if (typeof value === 'string') {
                candidateGuids.add(value)
              }
            })
          }

          const missingGuids: string[] = []
          candidateGuids.forEach((guid) => {
            seenGuids.add(guid)
            const existing = orderCacheRef.current.get(guid)
            if (existing) {
              existing.lastSeenAtMs = now
            } else {
              missingGuids.push(guid)
            }
          })

          if (missingGuids.length > 0) {
            const { seen: fetchedSeen, orders: fetchedOrders } = await fetchOrdersByGuidList(
              missingGuids,
              signal,
              now,
            )
            targetedExclusions = fetchedSeen
            fetchedSeen.forEach((guid) => {
              seenGuids.add(guid)
            })
            if (fetchedOrders.length > 0) {
              windowTimestamps.push(...collectOrderTimestamps(fetchedOrders))
            }
          }
        } else {
          const ordersData =
            Array.isArray(ordersPayload.data) && ordersPayload.data.length > 0
              ? ordersPayload.data
              : ordersPayload.orders

          const batchSeen = applyOrdersBatch(ordersData, now)
          batchSeen.forEach((guid) => {
            seenGuids.add(guid)
          })

          windowTimestamps.push(...collectOrderTimestamps(ordersData))
        }

        if (ordersPayload.window?.end) {
          const parsed = Date.parse(ordersPayload.window.end)
          if (Number.isFinite(parsed)) {
            windowTimestamps.push(parsed)
          }
        }

        const debugCursorAfter = (ordersPayload.debug as Record<string, unknown> | undefined)?.cursorAfter
        const cursorTs =
          (debugCursorAfter && typeof debugCursorAfter === 'object'
            ? (debugCursorAfter as Record<string, unknown>).ts
            : undefined) ?? undefined

        if (typeof cursorTs === 'string') {
          const parsed = Date.parse(cursorTs)
          if (Number.isFinite(parsed)) {
            windowTimestamps.push(parsed)
          }
        }

        if (windowTimestamps.length > 0) {
          const latest = Math.max(...windowTimestamps)
          cursorRef.current = new Date(latest).toISOString()
        }

        lastFetchRef.current = now

        const targetedSeen = await refreshActiveOrders(signal, now, targetedExclusions)
        targetedSeen.forEach((guid) => {
          seenGuids.add(guid)
        })

        const [menusResult, configResult] = await Promise.all([menusPromise, configPromise])
        if (signal.aborted || !isMountedRef.current) {
          return
        }

        let menuPayload: unknown | undefined
        if (!isFetchError(menusResult)) {
          menuPayload = menusResult.payload
          menuCacheRef.current = menusResult.snapshot
        } else if (menuCacheRef.current) {
          menuPayload = menuCacheRef.current.payload
        }

        let configPayload: unknown | undefined
        if (!isFetchError(configResult)) {
          configPayload = configResult.payload
          configCacheRef.current = configResult.snapshot
        } else if (configCacheRef.current) {
          configPayload = configCacheRef.current.payload
        }

        const lookupsChanged = applyLookupPayloads(menuPayload, configPayload)
        if (lookupsChanged) {
          reNormalizeOrders()
        }

        removeStaleEntries(now, seenGuids)
        await persistOrdersCache()
      } catch (fetchError) {
        if ((fetchError as Error)?.name === 'AbortError' || !isMountedRef.current) {
          return
        }

        setError(fetchError as Error)
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

          setIsHydrating(false)
        }

        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null
        }
      }
    },
    [
      abortActiveRequest,
      applyLookupPayloads,
      applyOrdersBatch,
      fetchConfigWithCache,
      fetchMenusWithCache,
      persistOrdersCache,
      reNormalizeOrders,
      refreshActiveOrders,
      removeStaleEntries,
    ],
  )

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const [ordersSnapshot, menuSnapshot, configSnapshot] = await Promise.all([
        loadOrdersCache(),
        loadMenuCache(),
        loadConfigCache(),
      ])

      if (cancelled || !isMountedRef.current) {
        return
      }

      if (menuSnapshot) {
        menuCacheRef.current = menuSnapshot
        applyLookupPayloads(menuSnapshot.payload)
      }

      if (configSnapshot) {
        configCacheRef.current = configSnapshot
        applyLookupPayloads(undefined, configSnapshot.payload)
      }

      if (ordersSnapshot && Array.isArray(ordersSnapshot.entries)) {
        cursorRef.current = ordersSnapshot.lastCursor
        lastFetchRef.current = ordersSnapshot.lastFetchedAt
          ? Date.parse(ordersSnapshot.lastFetchedAt)
          : undefined

        const version = lookupsRef.current.version - 1

        ordersSnapshot.entries.forEach((entry) => {
          const lastSeenMs = entry.lastSeenAt ? Date.parse(entry.lastSeenAt) : Date.now()
          orderCacheRef.current.set(entry.guid, {
            guid: entry.guid,
            raw: entry.raw,
            normalized: entry.normalized,
            fingerprint: entry.fingerprint,
            lastSeenAtMs: Number.isFinite(lastSeenMs) ? lastSeenMs : Date.now(),
            isReady: computeIsOrderReady(entry.normalized),
            normalizedVersion: Number.isFinite(version) ? version : -1,
          })
        })

        publishOrders()
        reNormalizeOrders()
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [applyLookupPayloads, publishOrders, reNormalizeOrders])

  useEffect(() => {
    clearPollingInterval()

    refresh({ silent: false })

    const intervalHandle = setInterval(() => {
      refresh({ silent: true })
    }, POLL_INTERVAL_MS)

    pollIntervalRef.current = intervalHandle

    return () => {
      clearPollingInterval()
    }
  }, [clearPollingInterval, refresh])

  return { orders, isLoading, isRefreshing, isHydrating, error, refresh }
}

export type UseOrdersDataResult = ReturnType<typeof useOrdersData>

export default useOrdersData
