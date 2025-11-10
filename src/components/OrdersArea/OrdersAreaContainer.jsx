import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import OrdersAreaView from './OrdersAreaView'
import OrdersGrid from './OrdersGrid/OrdersGrid'
import OrdersDebugPanel from './OrdersDebugPanel'
import { useDashboardDiagnostics } from '../../viewContext/DashboardDiagnosticsContext'

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
  const { recordDiagnostic } = useDashboardDiagnostics()
  const hasExistingOrders = orders.length > 0
  const hasVisibleOrders = visibleOrders.length > 0

  const handleOrderClick = useCallback(
    (orderId) => {
      const normalizedId = typeof orderId === 'string' ? orderId.trim() : null
      recordDiagnostic({
        type: 'ui.orders-area.order-clicked',
        payload: {
          orderId: normalizedId,
        },
      })

      toggleOrderActive(orderId)
    },
    [recordDiagnostic, toggleOrderActive],
  )

  const handleOrderKeyDown = useCallback(
    (event, orderId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        recordDiagnostic({
          type: 'ui.orders-area.order-activated-via-keyboard',
          payload: {
            orderId: typeof orderId === 'string' ? orderId.trim() : null,
            key: event.key,
          },
        })
        toggleOrderActive(orderId)
      }
    },
    [recordDiagnostic, toggleOrderActive],
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
      diagnosticsTimeline={debugPanel.diagnosticsTimeline}
      hasLimitWarning={debugPanel.hasOrderLimitWarning}
      limitWarning={debugPanel.orderLimitWarning}
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
