import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import useOrdersData from '../useOrdersData'

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

const originalFetch = global.fetch

const NoStrictModeWrapper = ({ children }) => <>{children}</>

const createFetchResponse = (payload, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => payload,
})

const createDeferred = () => {
  let resolve
  let reject

  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

afterEach(() => {
  if (originalFetch) {
    global.fetch = originalFetch
  } else {
    delete global.fetch
  }

  vi.restoreAllMocks()
})

describe('useOrdersData', () => {
  it('loads orders on mount and exposes resolved state', async () => {
    const orderGuid = '12345678-abcd-1234-abcd-abcdefabcdef'
    const ordersPayload = {
      orders: [
        {
          guid: orderGuid,
          status: 'OPEN',
          createdAt: '2025-01-01T10:15:00Z',
          total: 42.5,
          currency: 'USD',
          diningOptionGuid: 'pickup-guid',
          items: [
            {
              id: 'menu-item-1',
              name: 'Pizza',
              quantity: 1,
              modifiers: [
                {
                  name: 'Extra Cheese',
                  quantity: 1,
                },
              ],
            },
          ],
        },
      ],
    }
    const menusPayload = { menus: [] }
    const configPayload = {
      data: {
        diningOptions: [
          {
            guid: 'pickup-guid',
            name: 'Pickup',
          },
        ],
      },
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse(configPayload))
      .mockResolvedValueOnce(createFetchResponse(ordersPayload))
      .mockResolvedValueOnce(createFetchResponse(menusPayload))

    global.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.orders[0].id).toBe(orderGuid)
    expect(result.current.orders[0].diningOption).toBe('Pickup')
    expect(result.current.error).toBeNull()
    expect(result.current.isRefreshing).toBe(false)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe(CONFIG_SNAPSHOT_ENDPOINT)
    expect(fetchMock.mock.calls[1][0]).toBe(ORDERS_ENDPOINT)
    expect(fetchMock.mock.calls[2][0]).toBe(MENUS_ENDPOINT)
  })

  it('flags refreshing state for silent refresh without clearing existing orders', async () => {
    const firstOrdersPayload = {
      orders: [
        {
          guid: '12345678-abcd-1234-abcd-abcdefabcdef',
          status: 'OPEN',
          createdAt: '2025-01-01T10:15:00Z',
          total: 42.5,
          currency: 'USD',
          items: [],
        },
      ],
    }
    const refreshedOrdersPayload = {
      orders: [
        {
          guid: 'abcdef12-3456-7890-abcd-abcdefabcdef',
          status: 'READY',
          createdAt: '2025-01-01T11:00:00Z',
          total: 18.5,
          currency: 'USD',
          items: [],
        },
      ],
    }
    const menusPayload = { menus: [] }

    const deferredOrders = createDeferred()

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse(null))
      .mockResolvedValueOnce(createFetchResponse(firstOrdersPayload))
      .mockResolvedValueOnce(createFetchResponse(menusPayload))
      .mockResolvedValueOnce(createFetchResponse(null))
      .mockReturnValueOnce(deferredOrders.promise)
      .mockResolvedValueOnce(createFetchResponse(menusPayload))

    global.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1)
    })

    expect(result.current.isLoading).toBe(false)

    let refreshPromise
    act(() => {
      refreshPromise = result.current.refresh({ silent: true })
    })

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.orders).toHaveLength(1)

    deferredOrders.resolve(createFetchResponse(refreshedOrdersPayload))

    await act(async () => {
      await refreshPromise
    })

    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.orders).toHaveLength(1)
    expect(result.current.orders[0].status).toBe('READY')
  })

  it('captures fetch errors when requests fail', async () => {
    const fetchError = new Error('Orders request failed with status 500')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse(null))
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce(createFetchResponse(null))

    global.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders).toHaveLength(0)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error.message).toBe(fetchError.message)
  })
})
