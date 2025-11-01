import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import useOrdersData from '../useOrdersData'
import { createSampleOrders } from '../../domain/orders/sampleOrders'

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

const originalFetch = globalThis.fetch

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
    globalThis.fetch = originalFetch
  } else {
    delete globalThis.fetch
  }

  vi.restoreAllMocks()
  if (typeof window !== 'undefined' && '__USE_SAMPLE_ORDERS__' in window) {
    delete window.__USE_SAMPLE_ORDERS__
  }
})

describe('useOrdersData', () => {
  it('loads orders on mount and exposes resolved state', async () => {
    const orderGuid = '12345678-abcd-1234-abcd-abcdefabcdef'
    const ordersPayload = {
      ok: true,
      orders: [
        {
          guid: orderGuid,
          displayNumber: '21',
          approvalStatus: 'APPROVED',
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
                  price: 42.5,
                  fulfillmentStatus: 'NEW',
                  modifiers: [
                    { guid: 'modifier-1', displayName: 'Extra Cheese', quantity: 1 },
                  ],
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
            displayName: 'Pickup',
          },
        ],
      },
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse(configPayload))
      .mockResolvedValueOnce(createFetchResponse(ordersPayload))
      .mockResolvedValueOnce(createFetchResponse(menusPayload))

    globalThis.fetch = fetchMock

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
      ok: true,
      orders: [
        {
          guid: '12345678-abcd-1234-abcd-abcdefabcdef',
          displayNumber: '10',
          approvalStatus: 'APPROVED',
          openedDate: '2025-01-01T10:15:00Z',
          checks: [
            {
              guid: 'check-1',
              displayNumber: '10',
              createdDate: '2025-01-01T10:15:00Z',
              totalAmount: 42.5,
              paymentStatus: 'OPEN',
              selections: [],
            },
          ],
        },
      ],
    }
    const refreshedOrdersPayload = {
      ok: true,
      orders: [
        {
          guid: 'abcdef12-3456-7890-abcd-abcdefabcdef',
          displayNumber: '11',
          approvalStatus: 'READY',
          openedDate: '2025-01-01T11:00:00Z',
          checks: [
            {
              guid: 'check-2',
              displayNumber: '11',
              createdDate: '2025-01-01T11:00:00Z',
              totalAmount: 18.5,
              paymentStatus: 'READY',
              selections: [],
            },
          ],
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

    globalThis.fetch = fetchMock

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

    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders).toHaveLength(0)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error.message).toBe(fetchError.message)
  })

  it('falls back to sample orders for automation environments when no orders are returned', async () => {
    const fetchMock = vi.fn()

    globalThis.fetch = fetchMock
    if (typeof window !== 'undefined') {
      window.__USE_SAMPLE_ORDERS__ = true
    }

    const { result } = renderHook(() => useOrdersData(), { wrapper: NoStrictModeWrapper })

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(createSampleOrders().length)
    })

    expect(result.current.error).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
