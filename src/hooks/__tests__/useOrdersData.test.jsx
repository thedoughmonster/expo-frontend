import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import useOrdersData from '../useOrdersData'
import { clearOrdersCache } from '../../domain/orders/ordersCache'
import { clearMenuCache } from '../../domain/menus/menuCache'
import { clearConfigCache } from '../../domain/config/configCache'

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

const originalFetch = global.fetch

const NoStrictModeWrapper = ({ children }) => <>{children}</>

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

const createOrdersPayload = (orderOverrides = {}) => ({
  ok: true,
  route: '/api/orders',
  limit: 50,
  detail: 'full',
  minutes: 30,
  window: {
    start: '2025-01-01T10:10:00Z',
    end: '2025-01-01T10:20:00Z',
  },
  pageSize: 100,
  expandUsed: [],
  count: 1,
  ids: [baseOrder.guid],
  orders: [{ ...baseOrder, ...orderOverrides }],
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
    global.fetch = originalFetch
  } else {
    delete global.fetch
  }

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

    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.startsWith(`${ORDERS_ENDPOINT}?`)) {
        expect(url).toContain('detail=full')
        expect(url).toContain('limit=50')
        expect(url).toContain('minutes=30')
        return createFetchResponse(createOrdersPayload())
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

    global.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1)
    })

    const [order] = result.current.orders
    expect(order.diningOption).toBe('Pickup')
    expect(order.items).toHaveLength(1)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isHydrating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('performs silent refresh with incremental window and preserves existing orders', async () => {
    let bulkCallCount = 0

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
        if (bulkCallCount === 1) {
          return createFetchResponse(createOrdersPayload())
        }

        expect(url).toContain('since=')
        expect(url).not.toContain('minutes=')
        return createFetchResponse({ ...createOrdersPayload(refreshedOrder), minutes: null })
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

    global.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

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

    global.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders).toHaveLength(0)
    expect(result.current.error).toBeInstanceOf(Error)
  })
})
