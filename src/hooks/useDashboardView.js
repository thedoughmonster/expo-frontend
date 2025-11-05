import { useCallback, useEffect, useMemo } from 'react'
import { FULFILLMENT_FILTERS, resolveFulfillmentFilterKey } from '../domain/status/fulfillmentFilters'
import useOrdersData from './useOrdersData'
import {
  useDismissedOrders,
  useFulfillmentFilters,
  useOrdersDebugPanel,
  usePrepStationFilter,
  useSelectionState,
} from '../viewContext/OrdersViewContext'

const DASHBOARD_TITLE = 'Order Dashboard'
const SETTINGS_MODAL_TITLE = 'Dashboard Settings'

const useDashboardView = () => {
  const {
    orders,
    rawOrders,
    isLoading,
    isRefreshing,
    isHydrating,
    error,
    refresh,
    menuSnapshot,
    configSnapshot,
    lookupsVersion,
  } = useOrdersData()
  const { activeFulfillmentFilters } = useFulfillmentFilters()
  const { activeOrderIds, toggleOrderActive } = useSelectionState()
  const { dismissedOrderIds } = useDismissedOrders()
  const { activePrepStationId } = usePrepStationFilter()
  const {
    isDebugPanelEnabled,
    isDebugPanelOpen,
    toggleDebugPanel,
    closeDebugPanel,
  } = useOrdersDebugPanel()

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
      const orderFilterKey = resolveFulfillmentFilterKey({
        fulfillmentStatus: order?.fulfillmentStatus,
        status: order?.status,
      })
      const orderMatchesFilters = orderFilterKey
        ? activeFulfillmentFilters.has(orderFilterKey)
        : false
      const allowHoldFallback = orderMatchesFilters && orderFilterKey === 'hold'

      if (items.length === 0) {
        if (shouldApplyStatusFilter && !orderMatchesFilters) {
          return filteredOrders
        }

        if (!activePrepStationId) {
          filteredOrders.push(order)
        }

        return filteredOrders
      }

      const matchingItems = items.filter((item) => {
        if (shouldApplyStatusFilter) {
          const itemFilterKey = resolveFulfillmentFilterKey({
            fulfillmentStatus: item?.fulfillmentStatus,
            status: item?.status,
          })

          if (itemFilterKey) {
            if (!activeFulfillmentFilters.has(itemFilterKey)) {
              if (!allowHoldFallback) {
                return false
              }
            }
          } else if (orderFilterKey) {
            if (!orderMatchesFilters) {
              return false
            }
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

  const debugFilterContext = useMemo(() => {
    const activeFilters = Array.from(activeFulfillmentFilters)
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
      .sort()

    const dismissedIds = Array.from(dismissedOrderIds)
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
      .sort()

    const visibleOrdersSummary = {
      totalOrders: visibleOrders.length,
      totalItems: visibleOrders.reduce((count, order) => {
        const items = Array.isArray(order?.items) ? order.items : []
        return count + items.length
      }, 0),
      orders: visibleOrders.map((order) => {
        const items = Array.isArray(order?.items) ? order.items : []
        const prepStationGuids = Array.isArray(order?.prepStationGuids)
          ? order.prepStationGuids
              .filter((value) => typeof value === 'string' && value.trim().length > 0)
              .map((value) => value.trim())
          : undefined

        const orderId = typeof order?.id === 'string' ? order.id.trim() : null

        return {
          id: orderId,
          status: order?.status ?? null,
          fulfillmentStatus: order?.fulfillmentStatus ?? null,
          itemCount: items.length,
          prepStationGuids,
        }
      }),
    }

    return {
      activeFulfillmentFilters: activeFilters,
      activePrepStationId: activePrepStationId ?? null,
      dismissedOrderIds: dismissedIds,
      visibleOrdersSummary,
    }
  }, [activeFulfillmentFilters, activePrepStationId, dismissedOrderIds, visibleOrders])

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

  const handleToggleDebugPanel = useCallback(() => {
    toggleDebugPanel()
  }, [toggleDebugPanel])

  const canDismissSelectedOrders = activeOrderIds.size > 0

  const topBarProps = useMemo(
    () => ({
      title: DASHBOARD_TITLE,
      isBusy,
      onRefresh: handleRefresh,
      refreshAriaLabel,
      canDismissSelectedOrders,
      isDebugPanelEnabled,
      isDebugPanelOpen,
      onToggleDebugPanel: handleToggleDebugPanel,
    }),
    [
      canDismissSelectedOrders,
      handleRefresh,
      handleToggleDebugPanel,
      isBusy,
      isDebugPanelEnabled,
      isDebugPanelOpen,
      refreshAriaLabel,
    ],
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

  const debugPanelProps = useMemo(
    () => ({
      isEnabled: isDebugPanelEnabled,
      isOpen: isDebugPanelEnabled && isDebugPanelOpen,
      onClose: closeDebugPanel,
      rawOrders,
      menuSnapshot,
      configSnapshot,
      lookupsVersion,
      filterContext: debugFilterContext,
    }),
    [
      closeDebugPanel,
      configSnapshot,
      debugFilterContext,
      isDebugPanelEnabled,
      isDebugPanelOpen,
      rawOrders,
      lookupsVersion,
      menuSnapshot,
    ],
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
      debugPanel: debugPanelProps,
    }),
    [
      activeOrderIds,
      debugPanelProps,
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
