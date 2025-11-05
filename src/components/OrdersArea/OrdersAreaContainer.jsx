import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import OrdersAreaView from './OrdersAreaView'
import OrdersGrid from './OrdersGrid/OrdersGrid'
import OrdersDebugPanel from './OrdersDebugPanel'

const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return undefined
    }

    const id = setInterval(() => {
      setNow(new Date())
    }, intervalMs)

    return () => {
      clearInterval(id)
    }
  }, [intervalMs])

  return now
}

function OrdersAreaContainer({
  orders,
  visibleOrders,
  isLoading,
  isHydrating,
  error,
  emptyStateMessage,
  activeOrderIds,
  toggleOrderActive,
  debugPanel,
}) {
  const now = useNow(1000)
  const hasExistingOrders = orders.length > 0
  const hasVisibleOrders = visibleOrders.length > 0

  const handleOrderClick = useCallback(
    (orderId) => {
      toggleOrderActive(orderId)
    },
    [toggleOrderActive],
  )

  const handleOrderKeyDown = useCallback(
    (event, orderId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleOrderActive(orderId)
      }
    },
    [toggleOrderActive],
  )

  const gridProps = useMemo(
    () => ({
      orders: visibleOrders,
      activeOrderIds,
      onOrderClick: handleOrderClick,
      onOrderKeyDown: handleOrderKeyDown,
      now,
    }),
    [visibleOrders, activeOrderIds, handleOrderClick, handleOrderKeyDown, now],
  )

  const debugPanelNode = debugPanel?.isEnabled ? (
    <OrdersDebugPanel
      isOpen={Boolean(debugPanel.isOpen)}
      onClose={debugPanel.onClose}
      orders={orders}
      rawOrders={debugPanel.rawOrders}
      menuSnapshot={debugPanel.menuSnapshot}
      configSnapshot={debugPanel.configSnapshot}
      lookupsVersion={debugPanel.lookupsVersion}
      filterContext={debugPanel.filterContext}
    />
  ) : null

  return (
    <OrdersAreaView
      hasExistingOrders={hasExistingOrders}
      hasVisibleOrders={hasVisibleOrders}
      isLoading={isLoading}
      isHydrating={isHydrating}
      error={error}
      emptyStateMessage={emptyStateMessage}
      grid={hasVisibleOrders ? <OrdersGrid {...gridProps} /> : null}
      debugPanel={debugPanelNode}
    />
  )
}

export default memo(OrdersAreaContainer)
