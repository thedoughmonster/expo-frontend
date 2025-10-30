import { memo, useMemo } from 'react'
import OrderCardContainer from '../../OrderCard/OrderCardContainer'
import styles from './OrdersGrid.module.css'

const EMPTY_SELECTION = new Set()

const OrdersGrid = ({ orders, activeOrderIds, onOrderClick, onOrderKeyDown, now }) => {
  const selection = useMemo(() => activeOrderIds ?? EMPTY_SELECTION, [activeOrderIds])

  return (
    <section className={styles.ordersGrid} aria-live="polite">
      {orders.map((order) => (
        <OrderCardContainer
          key={order.id}
          order={order}
          isActive={selection.has(order.id)}
          onOrderClick={onOrderClick}
          onOrderKeyDown={onOrderKeyDown}
          now={now}
        />
      ))}
    </section>
  )
}

export default memo(OrdersGrid)
