import { useCallback, useEffect, useMemo } from 'react'
import { FULFILLMENT_FILTERS, resolveFulfillmentFilterKey } from '../domain/status/fulfillmentFilters'
import useOrdersData from './useOrdersData'
import {
  useDismissedOrders,
  useFulfillmentFilters,
  usePrepStationFilter,
  useSelectionState,
} from '../viewContext/OrdersViewContext'

const DASHBOARD_TITLE = 'Order Dashboard'
const SETTINGS_MODAL_TITLE = 'Dashboard Settings'

const useDashboardView = () => {
  const { orders, isLoading, isRefreshing, isHydrating, error, refresh } = useOrdersData()
  const { activeFulfillmentFilters } = useFulfillmentFilters()
  const { activeOrderIds, toggleOrderActive } = useSelectionState()
  const { dismissedOrderIds } = useDismissedOrders()
  const { activePrepStationId } = usePrepStationFilter()

  const totalFilters = FULFILLMENT_FILTERS.length
  const activeFilterCount = activeFulfillmentFilters.size

  const visibleOrders = useMemo(() => {
    if (orders.length === 0) {
      return []
    }

    if (activeFilterCount === 0) {
      return []
    }

    const shouldApplyStatusFilter = activeFilterCount < totalFilters

    return orders.reduce((filteredOrders, order) => {
      const orderId = typeof order.id === 'string' ? order.id.trim() : order.id

      if (orderId && dismissedOrderIds.has(orderId)) {
        return filteredOrders
      }

      const items = Array.isArray(order.items) ? order.items : []

      if (items.length === 0) {
        if (!shouldApplyStatusFilter && !activePrepStationId) {
          filteredOrders.push(order)
        }

        return filteredOrders
      }

      const matchingItems = items.filter((item) => {
        if (shouldApplyStatusFilter) {
          const filterKey = resolveFulfillmentFilterKey({
            fulfillmentStatus: item?.fulfillmentStatus,
          })

          if (filterKey && !activeFulfillmentFilters.has(filterKey)) {
            return false
          }
        }

        if (!activePrepStationId) {
          return true
        }

        const prepStations = Array.isArray(item?.prepStations) ? item.prepStations : []
        return prepStations.some((station) => station === activePrepStationId)
      })

      if (matchingItems.length === 0) {
        return filteredOrders
      }

      const prepStationSet = new Set()
      matchingItems.forEach((item) => {
        item.prepStations
          ?.filter((station) => typeof station === 'string')
          .forEach((station) => {
            const trimmed = station.trim()
            if (trimmed) {
              prepStationSet.add(trimmed)
            }
          })
      })

      filteredOrders.push({
        ...order,
        items: matchingItems,
        prepStationGuids: prepStationSet.size > 0 ? Array.from(prepStationSet) : undefined,
      })

      return filteredOrders
    }, [])
  }, [
    activeFilterCount,
    activeFulfillmentFilters,
    activePrepStationId,
    dismissedOrderIds,
    orders,
    totalFilters,
  ])

  const hasExistingOrders = orders.length > 0
  const hasVisibleOrders = visibleOrders.length > 0
  const isBusy = isLoading || isRefreshing
  const refreshAriaLabel = isBusy ? 'Refreshing orders' : 'Refresh orders'

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

  const canDismissSelectedOrders = activeOrderIds.size > 0

  const topBarProps = useMemo(
    () => ({
      title: DASHBOARD_TITLE,
      isBusy,
      onRefresh: handleRefresh,
      refreshAriaLabel,
      canDismissSelectedOrders,
    }),
    [canDismissSelectedOrders, handleRefresh, isBusy, refreshAriaLabel],
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
      isHydrating,
      error,
      emptyStateMessage,
      activeOrderIds,
      toggleOrderActive,
    }),
    [
      activeOrderIds,
      emptyStateMessage,
      error,
      isHydrating,
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
