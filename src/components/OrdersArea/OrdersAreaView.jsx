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
  return (
    <main className={styles.ordersArea} data-orders-area>
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
