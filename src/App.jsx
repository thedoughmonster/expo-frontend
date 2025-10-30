import { useCallback, useEffect, useMemo } from 'react'
import './App.css'
import DashboardLayout from './components/DashboardLayout'
import OrdersAreaContainer from './components/OrdersArea/OrdersAreaContainer'
import ModifierSidebarContainer from './components/ModifierSidebar/ModifierSidebarContainer'
import { TopBarContainer } from './components/TopBar'
import { FULFILLMENT_FILTERS, resolveFulfillmentFilterKey } from './domain/status/fulfillmentFilters'
import useOrdersData from './hooks/useOrdersData'
import { OrdersViewProvider, useFulfillmentFilters, useSelectionState } from './viewContext/OrdersViewContext'
import SettingsModalContainer from './components/SettingsModal/SettingsModalContainer'
import { SettingsModalProvider } from './components/SettingsModal/SettingsModalContext'


function DashboardView() {
  const { orders, isLoading, isRefreshing, error, refresh } = useOrdersData()
  const { activeFulfillmentFilters } = useFulfillmentFilters()
  const { activeOrderIds, toggleOrderActive } = useSelectionState()
  const visibleOrders = useMemo(() => {
    if (orders.length === 0) {
      return []
    }

    const totalFilters = FULFILLMENT_FILTERS.length
    const activeCount = activeFulfillmentFilters.size
    const shouldApplyFilter = activeCount > 0 && activeCount < totalFilters

    if (!shouldApplyFilter) {
      if (activeCount === 0) {
        return []
      }

      return orders
    }

    return orders.filter((order) => {
      const filterKey = resolveFulfillmentFilterKey(order)
      if (!filterKey) {
        return true
      }

      return activeFulfillmentFilters.has(filterKey)
    })
  }, [activeFulfillmentFilters, orders])

  const hasExistingOrders = orders.length > 0
  const hasVisibleOrders = visibleOrders.length > 0
  const isBusy = isLoading || isRefreshing
  const refreshAriaLabel = isBusy ? 'Refreshing orders' : 'Refresh orders'
  let emptyStateMessage = 'No orders available.'
  const totalFilters = FULFILLMENT_FILTERS.length
  const activeFilterCount = activeFulfillmentFilters.size
  const hasFilterRestriction = activeFilterCount > 0 && activeFilterCount < totalFilters

  if (hasExistingOrders) {
    if (activeFilterCount === 0) {
      emptyStateMessage = 'Select at least one fulfillment status to view orders.'
    } else if (hasFilterRestriction) {
      emptyStateMessage = 'No orders match the selected filters.'
    }
  }

  const settingsTabs = useMemo(
    () => [
      {
        id: 'general',
        label: 'General',
        description:
          'Adjust overall dashboard behavior, appearance, and defaults once settings become available.',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description:
          'Configure notification channels and delivery preferences here when the feature is ready.',
      },
    ],
    [],
  )

  const ordersForModifiers = useMemo(() => {
    if (activeOrderIds.size === 0) {
      return visibleOrders
    }

    return visibleOrders.filter((order) => activeOrderIds.has(order.id))
  }, [activeOrderIds, visibleOrders])

  const activeSelectionCount = activeOrderIds.size
  const visibleOrderCount = visibleOrders.length
  const selectionSummaryMessage =
    activeSelectionCount > 0
      ? `Showing modifiers for ${activeSelectionCount} selected ${activeSelectionCount === 1 ? 'order' : 'orders'}.`
      : hasVisibleOrders
        ? `Showing modifiers for all ${visibleOrderCount} visible ${visibleOrderCount === 1 ? 'order' : 'orders'}.`
        : null

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

  const topBar = (
    <TopBarContainer
      title="Order Dashboard"
      isBusy={isBusy}
      onRefresh={handleRefresh}
      refreshAriaLabel={refreshAriaLabel}
    />
  )

  const sidebarContent = (
    <ModifierSidebarContainer
      error={error}
      isLoading={isLoading}
      orders={ordersForModifiers}
      selectionSummaryMessage={selectionSummaryMessage}
    />
  )

  const ordersArea = (
    <OrdersAreaContainer
      orders={orders}
      visibleOrders={visibleOrders}
      isLoading={isLoading}
      error={error}
      emptyStateMessage={emptyStateMessage}
      activeOrderIds={activeOrderIds}
      toggleOrderActive={toggleOrderActive}
    />
  )

  return (
    <SettingsModalProvider tabs={settingsTabs}>
      <>
        <DashboardLayout topBar={topBar} sidebar={sidebarContent} ordersArea={ordersArea} />
        <SettingsModalContainer title="Dashboard Settings" />
      </>
    </SettingsModalProvider>
  )
}

function App() {
  return (
    <OrdersViewProvider>
      <DashboardView />
    </OrdersViewProvider>
  )
}

export default App
