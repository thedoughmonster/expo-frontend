import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import useDashboardView from '../useDashboardView'
import * as ordersDataModule from '../useOrdersData'
import { useFulfillmentFilters } from '../../viewContext/OrdersViewContext'
import DashboardProviders from '../../viewContext/DashboardProviders'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
}))

const mockOrders = [
  {
    id: 'order-1',
    fulfillmentStatus: 'NEW',
    items: [
      {
        id: 'order-1-item',
        name: 'Pretzel',
        fulfillmentStatus: 'NEW',
        prepStations: ['station-1'],
      },
    ],
  },
  {
    id: 'order-2',
    fulfillmentStatus: 'READY',
    items: [
      {
        id: 'order-2-item',
        name: 'Cookie',
        fulfillmentStatus: 'READY',
        prepStations: ['station-2'],
      },
    ],
  },
]

const createWrapper = () => ({ children }) => <DashboardProviders>{children}</DashboardProviders>

describe('useDashboardView', () => {
  const mockUseOrdersData = vi.spyOn(ordersDataModule, 'default')

  beforeEach(() => {
    const refreshMock = vi.fn()
    mockUseOrdersData.mockReturnValue({
      orders: mockOrders,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: refreshMock,
    })
  })

  afterEach(() => {
    mockUseOrdersData.mockReset()
  })

  it('derives visible orders and selection summaries', () => {
    const refreshMock = vi.fn()
    mockUseOrdersData.mockReturnValue({
      orders: mockOrders,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: refreshMock,
    })

    const { result } = renderHook(() => useDashboardView(), { wrapper: createWrapper() })

    expect(result.current.ordersAreaProps.visibleOrders).toHaveLength(2)
    expect(result.current.sidebarProps.selectionSummaryMessage).toBe(
      'Showing modifiers for all 2 visible orders.',
    )

    act(() => {
      result.current.topBarProps.onRefresh()
    })

    expect(refreshMock).toHaveBeenCalledWith({ silent: true })
  })

  it('removes selections for orders that are no longer visible', async () => {
    const { result } = renderHook(
      () => {
        const dashboard = useDashboardView()
        const filters = useFulfillmentFilters()

        return { dashboard, filters }
      },
      { wrapper: createWrapper() },
    )

    act(() => {
      result.current.dashboard.ordersAreaProps.toggleOrderActive('order-1')
    })

    expect(result.current.dashboard.ordersAreaProps.activeOrderIds.has('order-1')).toBe(true)

    act(() => {
      result.current.filters.toggleFulfillmentFilter('new')
    })

    await waitFor(() => {
      expect(result.current.dashboard.ordersAreaProps.visibleOrders).toHaveLength(1)
      expect(result.current.dashboard.ordersAreaProps.activeOrderIds.has('order-1')).toBe(false)
    })
  })

  it('filters items by fulfillment status before removing orders', async () => {
    const refreshMock = vi.fn()
    mockUseOrdersData.mockReturnValue({
      orders: [
        {
          id: 'order-ready',
          fulfillmentStatus: 'READY',
          items: [
            {
              id: 'order-ready-item-new',
              name: 'Bagel',
              fulfillmentStatus: 'NEW',
            },
            {
              id: 'order-ready-item-ready',
              name: 'Croissant',
              fulfillmentStatus: 'READY',
            },
          ],
        },
      ],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: refreshMock,
    })

    const { result } = renderHook(
      () => {
        const dashboard = useDashboardView()
        const filters = useFulfillmentFilters()

        return { dashboard, filters }
      },
      { wrapper: createWrapper() },
    )

    expect(result.current.dashboard.ordersAreaProps.visibleOrders).toHaveLength(1)
    expect(result.current.dashboard.ordersAreaProps.visibleOrders[0].items).toHaveLength(2)

    act(() => {
      result.current.filters.toggleFulfillmentFilter('ready')
    })

    await waitFor(() => {
      expect(result.current.dashboard.ordersAreaProps.visibleOrders).toHaveLength(1)
      expect(result.current.dashboard.ordersAreaProps.visibleOrders[0].items).toHaveLength(1)
      expect(
        result.current.dashboard.ordersAreaProps.visibleOrders[0].items[0].fulfillmentStatus,
      ).toBe('NEW')
    })

    act(() => {
      result.current.filters.toggleFulfillmentFilter('new')
    })

    await waitFor(() => {
      expect(result.current.dashboard.ordersAreaProps.visibleOrders).toHaveLength(0)
    })
  })

  it('keeps hold orders visible when items lack fulfillment statuses', async () => {
    const refreshMock = vi.fn()
    mockUseOrdersData.mockReturnValue({
      orders: [
        {
          id: 'order-hold',
          fulfillmentStatus: 'HOLD',
          items: [
            { id: 'order-hold-item-1', name: 'Pretzel' },
            { id: 'order-hold-item-2', name: 'Churro', fulfillmentStatus: null },
          ],
        },
      ],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: refreshMock,
    })

    const { result } = renderHook(
      () => {
        const dashboard = useDashboardView()
        const filters = useFulfillmentFilters()

        return { dashboard, filters }
      },
      { wrapper: createWrapper() },
    )

    expect(result.current.dashboard.ordersAreaProps.visibleOrders).toHaveLength(1)

    act(() => {
      result.current.filters.toggleFulfillmentFilter('new')
      result.current.filters.toggleFulfillmentFilter('sent')
      result.current.filters.toggleFulfillmentFilter('ready')
    })

    await waitFor(() => {
      expect(result.current.dashboard.ordersAreaProps.visibleOrders).toHaveLength(1)
      expect(result.current.dashboard.ordersAreaProps.visibleOrders[0].items).toHaveLength(2)
    })
  })
})
