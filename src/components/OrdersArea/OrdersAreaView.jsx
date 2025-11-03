import styles from './OrdersArea.module.css'

function OrdersAreaView({
  hasExistingOrders,
  hasVisibleOrders,
  isLoading,
  isHydrating,
  error,
  emptyStateMessage,
  grid,
}) {
  const statusMessage = (() => {
    if (error) {
      return null
    }

    if (isLoading && !hasExistingOrders) {
      return 'Loading orders…'
    }

    if (!isLoading && isHydrating && hasExistingOrders) {
      return 'Updating order details…'
    }

    return null
  })()

  return (
    <main className={styles.ordersArea} data-orders-area>
      {statusMessage ? (
        <div
          className={styles.ordersStatusOverlay}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={styles.ordersStatusText}>{statusMessage}</span>
        </div>
      ) : null}
      {!isLoading && error ? (
        <section
          className={`${styles.ordersState} ${styles.ordersStateError}`}
          role="alert"
        >
          <h2 className={styles.ordersStateHeading}>Unable to load orders</h2>
          <p className={styles.ordersStateText}>{error.message ?? 'Please try again later.'}</p>
        </section>
      ) : null}
      {!isLoading && !error && !hasVisibleOrders ? (
        <section className={styles.ordersState}>{emptyStateMessage}</section>
      ) : null}
      {grid}
    </main>
  )
}

export default OrdersAreaView
