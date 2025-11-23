import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import useOrdersData, { computeIsOrderReady } from '../useOrdersData'
import { clearOrdersCache } from '../../domain/orders/ordersCache'
import { clearMenuCache } from '../../domain/menus/menuCache'
import { clearConfigCache } from '../../domain/config/configCache'
import { normalizeOrders } from '../../domain/orders/normalizeOrders'
import { APP_SETTINGS } from '../../config/appSettings'
import {
  DashboardDiagnosticsProvider,
  useDashboardDiagnostics,
} from '../../viewContext/DashboardDiagnosticsContext'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
}))

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

const originalFetch = globalThis.fetch

const NoStrictModeWrapper = ({ children }) => <>{children}</>

const DiagnosticsWrapper = ({ children }) => (
  <DashboardDiagnosticsProvider>{children}</DashboardDiagnosticsProvider>
)

const createFetchResponse = (
  payload,
  { ok = true, status = 200, headers = {} } = {},
) => ({
  ok,
  status,
  json: async () => payload,
  headers: {
    get: (key) => headers?.[key] ?? headers?.[key?.toLowerCase?.()] ?? null,
  },
})

const baseOrder = {
  guid: '12345678-abcd-1234-abcd-abcdefabcdef',
  displayNumber: '21',
  approvalStatus: 'SENT',
  openedDate: '2025-01-01T10:15:00Z',
  diningOption: { guid: 'pickup-guid' },
  checks: [
    {
      guid: 'check-1',
      displayNumber: '21',
      createdDate: '2025-01-01T10:15:00Z',
      totalAmount: 42.5,
      paymentStatus: 'OPEN',
      selections: [
        {
          guid: 'selection-1',
          displayName: 'Pizza',
          quantity: 1,
          modifiers: [],
          fulfillmentStatus: 'SENT',
        },
      ],
    },
  ],
}

const createOrdersIdsPayload = (overrides = {}) => ({
  ok: true,
  route: '/api/orders',
  limit: APP_SETTINGS.pollLimit,
  detail: 'ids',
  minutes: 30,
  window: {
    start: '2025-01-01T10:10:00Z',
    end: '2025-01-01T10:20:00Z',
  },
  pageSize: 100,
  expandUsed: [],
  count: 1,
  ids: [baseOrder.guid],
  orders: [baseOrder.guid],
  ...overrides,
})

const menusPayload = { menus: [] }

const configPayload = {
  ttlSeconds: 3600,
  data: {
    diningOptions: [
      {
        guid: 'pickup-guid',
        displayName: 'Pickup',
      },
    ],
  },
}

beforeEach(async () => {
  await Promise.all([clearOrdersCache(), clearMenuCache(), clearConfigCache()])
})

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch
  } else {
    delete globalThis.fetch
  }

  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useOrdersData', () => {
  it('loads orders on mount, applies lookups, and hydrates targeted tickets', async () => {
    const singleOrderPayload = {
      ok: true,
      route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
      guid: baseOrder.guid,
      order: baseOrder,
    }

    const nowMs = Date.now()
    const nowDate = new Date(nowMs)
    const startOfDay = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate())
    const expectedMinutes = Math.max(
      Math.ceil(Math.max(nowMs - startOfDay, 0) / 60000),
      APP_SETTINGS.orderPollingWindowMinutes,
    )

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        expect(url).toContain('detail=ids')
        expect(url).toContain(`limit=${APP_SETTINGS.pollLimit}`)
        expect(url).toContain(`minutes=${expectedMinutes}`)
        return createFetchResponse(createOrdersIdsPayload({ data: [baseOrder] }))
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload, {
          headers: { 'cache-control': 'max-age=300' },
        })
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
        return createFetchResponse(singleOrderPayload)
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1)
    })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3)

    const [order] = result.current.orders
    expect(order.diningOption).toBe('Pickup')
    expect(order.items).toHaveLength(1)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isHydrating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('performs silent refresh with incremental window and preserves existing orders', async () => {
    let bulkCallCount = 0
    let targetedCallCount = 0

    const refreshedOrder = {
      ...baseOrder,
      approvalStatus: 'READY',
      checks: baseOrder.checks.map((check) => ({
        ...check,
        paymentStatus: 'READY',
        selections: check.selections.map((selection) => ({
          ...selection,
          fulfillmentStatus: 'READY',
        })),
      })),
    }

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        bulkCallCount += 1
        expect(url).toContain('detail=ids')
        expect(url).toMatch(/businessDate=\d{8}/)
        if (bulkCallCount === 1) {
          return createFetchResponse(createOrdersIdsPayload())
        }

        expect(url).toContain('since=')
        expect(url).not.toContain('minutes=')
        expect(url).toMatch(/businessDate=\d{8}/)
        return createFetchResponse(createOrdersIdsPayload({ minutes: null }))
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload, {
          headers: { 'cache-control': 'max-age=300' },
        })
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
        targetedCallCount += 1
        const order = targetedCallCount === 1 ? baseOrder : refreshedOrder
        return createFetchResponse({
          ok: true,
          route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
          guid: baseOrder.guid,
          order,
        })
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1)
    })

    let refreshPromise
    act(() => {
      refreshPromise = result.current.refresh({ silent: true })
    })

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true)
    })

    await act(async () => {
      await refreshPromise
    })

    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.orders).toHaveLength(1)
    expect(result.current.orders[0].status).toBe('READY')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('polls silently on an interval and stops polling after unmount', async () => {
    vi.useFakeTimers()

    let bulkCallCount = 0

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        bulkCallCount += 1
        expect(url).toContain('detail=ids')
        expect(url).toMatch(/businessDate=\d{8}/)
        return createFetchResponse(createOrdersIdsPayload())
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload, {
          headers: { 'cache-control': 'max-age=300' },
        })
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
        return createFetchResponse({
          ok: true,
          route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
          guid: baseOrder.guid,
          order: baseOrder,
        })
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result, unmount } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

    await act(async () => {
      await result.current.refresh({ silent: false })
    })

    expect(result.current.orders).toHaveLength(1)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isRefreshing).toBe(false)

    const callCountAfterInitialLoad = fetchMock.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(APP_SETTINGS.pollIntervalMs)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(bulkCallCount).toBeGreaterThanOrEqual(2)

    const callCountAfterInterval = fetchMock.mock.calls.length
    expect(callCountAfterInterval).toBeGreaterThan(callCountAfterInitialLoad)

    expect(result.current.isRefreshing).toBe(false)

    unmount()

    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(callCountAfterInterval)
  })

  it('triggers targeted fetch when cached GUID is missing from worker payload', async () => {
    const missingOrder = {
      ...baseOrder,
      guid: 'fedcba98-7654-4321-fedc-abcdefabcdef',
      displayNumber: '22',
      checks: baseOrder.checks.map((check, index) => ({
        ...check,
        guid: `fedcba98-7654-4321-fedc-abcdefabcde${index}`,
        selections: check.selections.map((selection, selectionIndex) => ({
          ...selection,
          guid: `fedcba98-7654-4321-fedc-abcdefabcdf${index}${selectionIndex}`,
        })),
      })),
    }

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let ordersPollCount = 0
    let targetedHydrations = 0
    const missingOrderResponses = []

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        ordersPollCount += 1
        expect(url).toContain('detail=ids')

        if (ordersPollCount <= 2) {
          return createFetchResponse(
            createOrdersIdsPayload({
              count: 2,
              ids: [baseOrder.guid, missingOrder.guid],
              orders: [baseOrder.guid, missingOrder.guid],
              data: [
                { ...baseOrder },
                missingOrder,
              ],
            }),
          )
        }

        return createFetchResponse(
          createOrdersIdsPayload({
            count: 1,
            ids: [baseOrder.guid],
            orders: [baseOrder.guid],
            data: [
              { ...baseOrder },
            ],
          }),
        )
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload, {
          headers: { 'cache-control': 'max-age=300' },
        })
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
        targetedHydrations += 1
        return createFetchResponse({
          ok: true,
          route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
          guid: baseOrder.guid,
          order: { ...baseOrder },
        })
      }

      if (url === `${ORDERS_ENDPOINT}/${missingOrder.guid}`) {
        targetedHydrations += 1
        if (ordersPollCount <= 2) {
          missingOrderResponses.push('hydrate')
          return createFetchResponse({
            ok: true,
            route: `${ORDERS_ENDPOINT}/${missingOrder.guid}`,
            guid: missingOrder.guid,
            order: missingOrder,
          })
        }

        missingOrderResponses.push('missing')
        return createFetchResponse(null, { ok: false, status: 404 })
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

    await waitFor(() => {
      const guids = result.current.orders.map((order) => order.guid)
      expect(guids).toContain(baseOrder.guid)
      expect(guids).toContain(missingOrder.guid)
    })

    const hydrationCallsBeforeRefresh = targetedHydrations

    await act(async () => {
      await result.current.refresh({ silent: true })
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[useOrdersData] Worker omitted cached orders; triggering targeted refresh',
      [missingOrder.guid],
    )

    const missingOrderCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === 'string' ? input : input.url
      return url === `${ORDERS_ENDPOINT}/${missingOrder.guid}`
    })

    expect(missingOrderCalls.length).toBeGreaterThanOrEqual(2)
    expect(missingOrderResponses.filter((state) => state === 'missing')).toHaveLength(1)
    expect(targetedHydrations).toBeGreaterThan(hydrationCallsBeforeRefresh)
    expect(result.current.orders).toHaveLength(1)

    consoleWarnSpy.mockRestore()
  })

  it.each([
    { label: 'null response', removalType: 'null' },
    { label: 'voided payload', removalType: 'voided' },
  ])(
    'removes cached orders when targeted refresh returns a %s',
    async ({ removalType }) => {
      let ordersPollCount = 0
      let targetedCallCount = 0

      const fetchMock = vi.fn(async (input) => {
        const url = typeof input === 'string' ? input : input.url

        if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
          ordersPollCount += 1
          expect(url).toContain('detail=ids')

          if (ordersPollCount <= 2) {
            return createFetchResponse(createOrdersIdsPayload())
          }

          return createFetchResponse(
            createOrdersIdsPayload({ count: 0, ids: [], orders: [], data: [] }),
          )
        }

        if (url === MENUS_ENDPOINT) {
          return createFetchResponse(menusPayload, {
            headers: { 'cache-control': 'max-age=300' },
          })
        }

        if (url === CONFIG_SNAPSHOT_ENDPOINT) {
          return createFetchResponse(configPayload)
        }

        if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
          targetedCallCount += 1

          if (targetedCallCount <= 2) {
            return createFetchResponse({
              ok: true,
              route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
              guid: baseOrder.guid,
              order: baseOrder,
            })
          }

          if (removalType === 'null') {
            return createFetchResponse(null, { ok: false, status: 404 })
          }

          return createFetchResponse({
            ok: true,
            route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
            guid: baseOrder.guid,
            order: { ...baseOrder, voided: true },
          })
        }

        throw new Error(`Unexpected fetch to ${url}`)
      })

      globalThis.fetch = fetchMock

      const { result } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(1)
      })

      await act(async () => {
        await result.current.refresh({ silent: true })
      })

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(0)
      })

      expect(
        result.current.orders.find((order) => order.guid === baseOrder.guid),
      ).toBeUndefined()
      expect(targetedCallCount).toBeGreaterThanOrEqual(2)
    },
  )

  it('treats orders with any non-ready items as not ready', () => {
    const mixedOrder = {
      ...baseOrder,
      checks: baseOrder.checks.map((check) => ({
        ...check,
        selections: [
          {
            ...check.selections[0],
            fulfillmentStatus: 'READY',
          },
          {
            guid: 'selection-sent',
            displayName: 'Breadsticks',
            quantity: 1,
            modifiers: [],
            fulfillmentStatus: 'SENT',
          },
        ],
      })),
    }

    const [normalizedMixed] = normalizeOrders([mixedOrder])
    expect(computeIsOrderReady(normalizedMixed)).toBe(false)

    const readyOrder = {
      ...mixedOrder,
      checks: mixedOrder.checks.map((check) => ({
        ...check,
        selections: check.selections.map((selection) => ({
          ...selection,
          fulfillmentStatus: 'READY',
        })),
      })),
    }

    const [normalizedReady] = normalizeOrders([readyOrder])
    expect(computeIsOrderReady(normalizedReady)).toBe(true)
  })

  it('filters voided orders from the normalized output', async () => {
    const voidedOrder = {
      ...baseOrder,
      guid: 'voided-order-guid',
      displayNumber: '22',
      voided: true,
    }

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        return createFetchResponse(
          createOrdersIdsPayload({
            count: 2,
            ids: [baseOrder.guid, voidedOrder.guid],
            orders: [baseOrder.guid, voidedOrder.guid],
            data: [baseOrder, voidedOrder],
          }),
        )
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload, {
          headers: { 'cache-control': 'max-age=300' },
        })
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
        return createFetchResponse({
          ok: true,
          route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
          guid: baseOrder.guid,
          order: baseOrder,
        })
      }

      if (url === `${ORDERS_ENDPOINT}/${voidedOrder.guid}`) {
        return createFetchResponse({
          ok: true,
          route: `${ORDERS_ENDPOINT}/${voidedOrder.guid}`,
          guid: voidedOrder.guid,
          order: voidedOrder,
        })
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1)
      expect(result.current.orders[0]?.displayId).toBe('21')
    })

    expect(result.current.orders.find((order) => order.guid === voidedOrder.guid)).toBeUndefined()
  })

  it('captures fetch errors when the orders request fails', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        return createFetchResponse({}, { ok: false, status: 500 })
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload)
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: DiagnosticsWrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders).toHaveLength(0)
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('records diagnostics when the orders payload saturates the poll limit', async () => {
    const limit = APP_SETTINGS.pollLimit
    const ordersPayload = createOrdersIdsPayload({
      count: limit,
      debug: {
        pages: [
          { index: 0, nextPage: 'cursor-1' },
          { index: 1, nextPage: null },
        ],
      },
    })

    const singleOrderPayload = {
      ok: true,
      route: `${ORDERS_ENDPOINT}/${baseOrder.guid}`,
      guid: baseOrder.guid,
      order: baseOrder,
    }

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        return createFetchResponse(ordersPayload)
      }

      if (url === MENUS_ENDPOINT) {
        return createFetchResponse(menusPayload)
      }

      if (url === CONFIG_SNAPSHOT_ENDPOINT) {
        return createFetchResponse(configPayload)
      }

      if (url === `${ORDERS_ENDPOINT}/${baseOrder.guid}`) {
        return createFetchResponse(singleOrderPayload)
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    globalThis.fetch = fetchMock

    const { result } = renderHook(
      () => ({ data: useOrdersData(), diagnostics: useDashboardDiagnostics() }),
      { wrapper: DiagnosticsWrapper },
    )

    await waitFor(() => {
      expect(result.current.data.orders).toHaveLength(1)
      expect(result.current.data.hasOrderLimitWarning).toBe(true)
    })

    expect(result.current.data.orderLimitWarning).toEqual(
      expect.objectContaining({
        limit,
        count: limit,
        pagesWithNext: 1,
        totalPages: 2,
      }),
    )

    const timeline = result.current.diagnostics.timeline
    const limitEvent = timeline.find((event) => event.type === 'orders.refresh.limit-saturated')
    expect(limitEvent).toBeDefined()
    expect(limitEvent?.level).toBe('warn')
    expect(limitEvent?.payload).toEqual(
      expect.objectContaining({
        silent: false,
        limit,
        count: limit,
        pagesWithNext: 1,
        totalPages: 2,
      }),
    )

    const successEvent = timeline.find((event) => event.type === 'orders.refresh.success')
    expect(successEvent?.payload).toEqual(
      expect.objectContaining({
        limitSaturated: true,
      }),
    )
  })

  it('logs diagnostics events for refresh failures', async () => {
    const failure = new Error('Orders offline')
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const failingFetch = vi.fn(async () => {
      throw failure
    })

    globalThis.fetch = failingFetch

    const { result } = renderHook(
      () => ({
        data: useOrdersData(),
        diagnostics: useDashboardDiagnostics(),
      }),
      { wrapper: DiagnosticsWrapper },
    )

    await act(async () => {
      await result.current.data.refresh({ silent: false })
    })

    expect(result.current.data.error).toBeInstanceOf(Error)

    const timeline = result.current.diagnostics.timeline
    const errorEvent = timeline.find((event) => event.type === 'orders.refresh.error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.payload).toMatchObject({ message: 'Orders offline', silent: false })

    expect(consoleInfo).toHaveBeenCalledWith(
      '[DashboardDiagnostics]',
      expect.objectContaining({ type: 'orders.refresh.started' }),
    )
    expect(consoleError).toHaveBeenCalledWith(
      '[DashboardDiagnostics]',
      expect.objectContaining({ type: 'orders.refresh.error' }),
    )
  })
})
