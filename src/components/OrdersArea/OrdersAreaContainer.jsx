import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import OrdersAreaView from './OrdersAreaView'
import OrdersGrid from './OrdersGrid/OrdersGrid'

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
  error,
  emptyStateMessage,
  activeOrderIds,
  toggleOrderActive,
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

  return (
    <OrdersAreaView
      hasExistingOrders={hasExistingOrders}
      hasVisibleOrders={hasVisibleOrders}
      isLoading={isLoading}
      error={error}
      emptyStateMessage={emptyStateMessage}
      grid={hasVisibleOrders ? <OrdersGrid {...gridProps} /> : null}
    />
  )
}

export default memo(OrdersAreaContainer)
