import { useCallback, useEffect, useMemo } from 'react'
import { FULFILLMENT_FILTERS, resolveFulfillmentFilterKey } from '../domain/status/fulfillmentFilters'
import useOrdersData from './useOrdersData'
import {
  useFulfillmentFilters,
  usePrepStationFilter,
  useSelectionState,
} from '../viewContext/OrdersViewContext'

const DASHBOARD_TITLE = 'Order Dashboard'
const SETTINGS_MODAL_TITLE = 'Dashboard Settings'

const useDashboardView = () => {
  const { orders, isLoading, isRefreshing, error, refresh } = useOrdersData()
  const { activeFulfillmentFilters } = useFulfillmentFilters()
  const { activeOrderIds, toggleOrderActive } = useSelectionState()
  const { activePrepStationId } = usePrepStationFilter()

  const visibleOrders = useMemo(() => {
    if (orders.length === 0) {
      return []
    }

    const totalFilters = FULFILLMENT_FILTERS.length
    const activeCount = activeFulfillmentFilters.size
    const shouldApplyFilter = activeCount > 0 && activeCount < totalFilters

    let baseOrders = orders

    if (!shouldApplyFilter) {
      if (activeCount === 0) {
        baseOrders = []
      }
    } else {
      baseOrders = orders.filter((order) => {
        const filterKey = resolveFulfillmentFilterKey(order)
        if (!filterKey) {
          return true
        }

        return activeFulfillmentFilters.has(filterKey)
      })
    }

    if (!activePrepStationId) {
      return baseOrders
    }

    return baseOrders.filter((order) => order.prepStationGuids?.includes(activePrepStationId))
  }, [activeFulfillmentFilters, activePrepStationId, orders])

  const hasExistingOrders = orders.length > 0
  const hasVisibleOrders = visibleOrders.length > 0
  const isBusy = isLoading || isRefreshing
  const refreshAriaLabel = isBusy ? 'Refreshing orders' : 'Refresh orders'

  const totalFilters = FULFILLMENT_FILTERS.length
  const activeFilterCount = activeFulfillmentFilters.size
  const hasFilterRestriction = activeFilterCount > 0 && activeFilterCount < totalFilters

  const hasPrepStationFilter = Boolean(activePrepStationId)

  const emptyStateMessage = useMemo(() => {
    if (!hasExistingOrders) {
      return 'No orders available.'
    }

    if (activeFilterCount === 0) {
      return 'Select at least one fulfillment status to view orders.'
    }

    if (hasPrepStationFilter && hasFilterRestriction && !hasVisibleOrders) {
      return 'No orders match the selected prep station and fulfillment filters.'
    }

    if (hasPrepStationFilter && !hasVisibleOrders) {
      return 'No orders match the selected prep station.'
    }

    if (hasFilterRestriction && !hasVisibleOrders) {
      return 'No orders match the selected filters.'
    }

    return 'No orders available.'
  }, [
    activeFilterCount,
    hasExistingOrders,
    hasFilterRestriction,
    hasPrepStationFilter,
    hasVisibleOrders,
  ])

  const ordersForModifiers = useMemo(() => {
    if (activeOrderIds.size === 0) {
      return visibleOrders
    }

    return visibleOrders.filter((order) => activeOrderIds.has(order.id))
  }, [activeOrderIds, visibleOrders])

  const activeSelectionCount = activeOrderIds.size
  const visibleOrderCount = visibleOrders.length

  const selectionSummaryMessage = useMemo(() => {
    if (activeSelectionCount > 0) {
      const noun = activeSelectionCount === 1 ? 'order' : 'orders'
      return `Showing modifiers for ${activeSelectionCount} selected ${noun}.`
    }

    if (hasVisibleOrders) {
      const noun = visibleOrderCount === 1 ? 'order' : 'orders'
      return `Showing modifiers for all ${visibleOrderCount} visible ${noun}.`
    }

    return null
  }, [activeSelectionCount, hasVisibleOrders, visibleOrderCount])

  useEffect(() => {
    if (activeOrderIds.size === 0) {
      return
    }

    const visibleIds = new Set(visibleOrders.map((order) => order.id))
    const idsToRemove = []

    activeOrderIds.forEach((id) => {
      if (!visibleIds.has(id)) {
        idsToRemove.push(id)
      }
    })

    if (idsToRemove.length === 0) {
      return
    }

    idsToRemove.forEach((id) => {
      toggleOrderActive(id)
    })
  }, [activeOrderIds, toggleOrderActive, visibleOrders])

  const handleRefresh = useCallback(() => {
    refresh({ silent: hasExistingOrders })
  }, [hasExistingOrders, refresh])

  const topBarProps = useMemo(
    () => ({
      title: DASHBOARD_TITLE,
      isBusy,
      onRefresh: handleRefresh,
      refreshAriaLabel,
    }),
    [handleRefresh, isBusy, refreshAriaLabel],
  )

  const sidebarProps = useMemo(
    () => ({
      error,
      isLoading,
      orders: ordersForModifiers,
      selectionSummaryMessage,
    }),
    [error, isLoading, ordersForModifiers, selectionSummaryMessage],
  )

  const ordersAreaProps = useMemo(
    () => ({
      orders,
      visibleOrders,
      isLoading,
      error,
      emptyStateMessage,
      activeOrderIds,
      toggleOrderActive,
    }),
    [
      activeOrderIds,
      emptyStateMessage,
      error,
      isLoading,
      orders,
      toggleOrderActive,
      visibleOrders,
    ],
  )

  return {
    topBarProps,
    sidebarProps,
    ordersAreaProps,
    settingsModalTitle: SETTINGS_MODAL_TITLE,
  }
}

export default useDashboardView
