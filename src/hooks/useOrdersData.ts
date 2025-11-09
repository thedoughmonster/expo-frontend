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
  clearOrdersCache,
  computeOrderFingerprint,
  loadOrdersCache,
  saveOrdersCache,
  type OrderCacheEntry,
} from '../domain/orders/ordersCache'
import {
  clearMenuCache,
  loadMenuCache,
  menuCacheIsFresh,
  prepareMenuCacheSnapshot,
  saveMenuCache,
  type MenuCacheSnapshot,
} from '../domain/menus/menuCache'
import {
  clearConfigCache,
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
import { useDashboardDiagnostics } from '../viewContext/DashboardDiagnosticsContext'

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

const sortOrderEntries = (
  entries: Iterable<InMemoryOrderEntry>,
): InMemoryOrderEntry[] => {
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

  return list
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
  const { recordDiagnostic } = useDashboardDiagnostics()
  const [orders, setOrders] = useState<NormalizedOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isHydrating, setIsHydrating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [menuDebugSnapshot, setMenuDebugSnapshot] = useState<MenuCacheSnapshot | undefined>(undefined)
  const [configDebugSnapshot, setConfigDebugSnapshot] = useState<ConfigCacheSnapshot | undefined>(undefined)
  const [rawOrders, setRawOrders] = useState<ToastOrder[]>([])

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

  const assignMenuSnapshot = useCallback((snapshot?: MenuCacheSnapshot) => {
    menuCacheRef.current = snapshot
    setMenuDebugSnapshot((previous) => (previous === snapshot ? previous : snapshot))
  }, [])

  const assignConfigSnapshot = useCallback((snapshot?: ConfigCacheSnapshot) => {
    configCacheRef.current = snapshot
    setConfigDebugSnapshot((previous) => (previous === snapshot ? previous : snapshot))
  }, [])

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
    const sortedEntries = sortOrderEntries(orderCacheRef.current.values())
    setOrders(sortedEntries.map((entry) => entry.normalized))
    setRawOrders(sortedEntries.map((entry) => entry.raw))
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

    if (order?.voided === true) {
      if (orderCacheRef.current.has(guid)) {
        orderCacheRef.current.delete(guid)
      }
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
      let voidedRemoved = false

      ordersPayload.forEach((order) => {
        const guid = extractOrderGuid(order)
        if (!guid) {
          return
        }

        if (order?.voided === true) {
          if (orderCacheRef.current.delete(guid)) {
            voidedRemoved = true
          }
          return
        }

        seenGuids.add(guid)
        applyRawOrder(order, now)
      })

      if (seenGuids.size > 0 || voidedRemoved) {
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
        assignMenuSnapshot(cached)
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
      assignMenuSnapshot(snapshot)
      await saveMenuCache(snapshot)

      return { payload, snapshot }
    },
    [assignMenuSnapshot],
  )

  const fetchConfigWithCache = useCallback(
    async (signal: AbortSignal): Promise<ConfigFetchResult> => {
      const now = Date.now()
      const cached = configCacheRef.current

      if (cached && configCacheIsFresh(cached, now)) {
        assignConfigSnapshot(cached)
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
      assignConfigSnapshot(snapshot)
      await saveConfigCache(snapshot)

      return { payload, snapshot }
    },
    [assignConfigSnapshot],
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
      let cacheChanged = false

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
            cacheChanged = orderCacheRef.current.delete(guid) || cacheChanged
            return
          }

          if (order?.voided === true) {
            cacheChanged = orderCacheRef.current.delete(guid) || cacheChanged
            return
          }

          if (order) {
            seen.add(guid)
            fetchedOrders.push(order)
            applyRawOrder(order, now)
            cacheChanged = true
          }
        })
      }

      if (cacheChanged) {
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

      recordDiagnostic({
        type: 'orders.refresh.started',
        payload: {
          silent,
          cachedOrderCount: orderCacheRef.current.size,
        },
      })

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

      let fetchedOrderCount = 0
      let targetedRefreshCount = 0
      let omissionCount = 0

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
        const workerGuids = new Set<string>()
        let workerGuidListProvided = false
        let targetedExclusions: Set<string> | undefined

        if (ordersPayload.detail === 'ids') {
          workerGuidListProvided = true
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
            workerGuids.add(guid)
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
            fetchedOrderCount += fetchedOrders.length
            targetedExclusions = new Set(fetchedSeen)
            fetchedSeen.forEach((guid) => {
              seenGuids.add(guid)
              workerGuids.add(guid)
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
            workerGuids.add(guid)
          })

          windowTimestamps.push(...collectOrderTimestamps(ordersData))
        }

        if (workerGuidListProvided) {
          const cachedButMissing: string[] = []
          orderCacheRef.current.forEach((_, guid) => {
            if (workerGuids.has(guid)) {
              return
            }

            cachedButMissing.push(guid)
          })

          if (cachedButMissing.length > 0) {
            omissionCount += cachedButMissing.length
            recordDiagnostic({
              type: 'orders.refresh.omission-detected',
              level: 'warn',
              payload: {
                guids: cachedButMissing,
                count: cachedButMissing.length,
              },
            })
            console.warn(
              '[useOrdersData] Worker omitted cached orders; triggering targeted refresh',
              cachedButMissing,
            )

            const { seen: omissionSeen, orders: omissionOrders } = await fetchOrdersByGuidList(
              cachedButMissing,
              signal,
              now,
            )
            fetchedOrderCount += omissionOrders.length

            if (omissionOrders.length > 0) {
              windowTimestamps.push(...collectOrderTimestamps(omissionOrders))
            }

            if (targetedExclusions) {
              omissionSeen.forEach((guid) => {
                targetedExclusions!.add(guid)
              })
            } else {
              targetedExclusions = new Set(omissionSeen)
            }

            omissionSeen.forEach((guid) => {
              seenGuids.add(guid)
            })
          }
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
        targetedRefreshCount = targetedSeen.size
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
          assignMenuSnapshot(menusResult.snapshot)
        } else if (menuCacheRef.current) {
          menuPayload = menuCacheRef.current.payload
          assignMenuSnapshot(menuCacheRef.current)
        } else {
          assignMenuSnapshot(undefined)
        }

        let configPayload: unknown | undefined
        if (!isFetchError(configResult)) {
          configPayload = configResult.payload
          assignConfigSnapshot(configResult.snapshot)
        } else if (configCacheRef.current) {
          configPayload = configCacheRef.current.payload
          assignConfigSnapshot(configCacheRef.current)
        } else {
          assignConfigSnapshot(undefined)
        }

        const lookupsChanged = applyLookupPayloads(menuPayload, configPayload)
        if (lookupsChanged) {
          reNormalizeOrders()
        }

        removeStaleEntries(now, seenGuids)
        await persistOrdersCache()

        recordDiagnostic({
          type: 'orders.refresh.success',
          payload: {
            silent,
            normalizedOrderCount: orderCacheRef.current.size,
            fetchedOrderCount,
            targetedRefreshCount,
            omissionCount,
            workerGuidListProvided,
          },
          clearLastError: true,
        })
      } catch (fetchError) {
        if ((fetchError as Error)?.name === 'AbortError' || !isMountedRef.current) {
          return
        }

        recordDiagnostic({
          type: 'orders.refresh.error',
          level: 'error',
          payload: {
            message: (fetchError as Error)?.message ?? 'Unknown error',
            name: (fetchError as Error)?.name ?? 'Error',
            silent,
          },
          error: fetchError as Error,
        })
        setError(fetchError as Error)
        if (!silent) {
          setOrders([])
          setRawOrders([])
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
      assignConfigSnapshot,
      assignMenuSnapshot,
      applyLookupPayloads,
      applyOrdersBatch,
      fetchConfigWithCache,
      fetchMenusWithCache,
      recordDiagnostic,
      persistOrdersCache,
      reNormalizeOrders,
      refreshActiveOrders,
      removeStaleEntries,
    ],
  )

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      await Promise.all([clearOrdersCache(), clearMenuCache(), clearConfigCache()])

      if (cancelled || !isMountedRef.current) {
        return
      }

      const [ordersSnapshot, menuSnapshot, configSnapshot] = await Promise.all([
        loadOrdersCache(),
        loadMenuCache(),
        loadConfigCache(),
      ])

      if (cancelled || !isMountedRef.current) {
        return
      }

      if (menuSnapshot) {
        assignMenuSnapshot(menuSnapshot)
        applyLookupPayloads(menuSnapshot.payload)
      } else {
        assignMenuSnapshot(undefined)
      }

      if (configSnapshot) {
        assignConfigSnapshot(configSnapshot)
        applyLookupPayloads(undefined, configSnapshot.payload)
      } else {
        assignConfigSnapshot(undefined)
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

      if (!cancelled && isMountedRef.current) {
        await refresh({ silent: false })
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [
    applyLookupPayloads,
    assignConfigSnapshot,
    assignMenuSnapshot,
    publishOrders,
    reNormalizeOrders,
    refresh,
  ])

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

  const lookupsVersion = lookupsRef.current.version

  return {
    orders,
    rawOrders,
    isLoading,
    isRefreshing,
    isHydrating,
    error,
    refresh,
    menuSnapshot: menuDebugSnapshot,
    configSnapshot: configDebugSnapshot,
    lookupsVersion,
  }
}

export type UseOrdersDataResult = ReturnType<typeof useOrdersData>

export default useOrdersData
