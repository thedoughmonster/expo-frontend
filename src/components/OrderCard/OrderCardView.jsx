import { memo } from 'react'
import OrderCardHeader from './OrderCardHeader'
import OrderItemsList from './OrderItemsList'
import styles from './OrderCardView.module.css'

const OrderCardView = ({
  className,
  isActive,
  onClick,
  onKeyDown,
  elapsedLabel,
  showElapsed,
  elapsedAriaLabel,
  elapsedIsoDuration,
  elapsedTimerValue,
  elapsedTitle,
  orderNumber,
  orderNumberLabel,
  displayCustomerName,
  customerAriaLabel,
  customerSubtitle,
  showCustomerSubtitle,
  diningOption,
  showDiningOption,
  fulfillmentStatus,
  fulfillmentBadgeClassName,
  showFulfillmentStatus,
  hasTitlebarMeta,
  status,
  statusClassName,
  timeLabel,
  timeDateTime,
  items,
  hasItems,
  notes,
  hasNotes,
  formattedTotal,
  showFooter,
}) => (
  <article
    className={className}
    role="button"
    tabIndex={0}
    aria-pressed={isActive}
    onClick={onClick}
    onKeyDown={onKeyDown}
  >
    <OrderCardHeader
      isActive={isActive}
      orderNumber={orderNumber}
      orderNumberLabel={orderNumberLabel}
      displayCustomerName={displayCustomerName}
      customerAriaLabel={customerAriaLabel}
      customerSubtitle={customerSubtitle}
      showCustomerSubtitle={showCustomerSubtitle}
      diningOption={diningOption}
      showDiningOption={showDiningOption}
      fulfillmentStatus={fulfillmentStatus}
      fulfillmentBadgeClassName={fulfillmentBadgeClassName}
      showFulfillmentStatus={showFulfillmentStatus}
      hasTitlebarMeta={hasTitlebarMeta}
      status={status}
      statusClassName={statusClassName}
      timeLabel={timeLabel}
      timeDateTime={timeDateTime}
      elapsedAriaLabel={elapsedAriaLabel}
      elapsedIsoDuration={elapsedIsoDuration}
      elapsedTimerValue={elapsedTimerValue}
      elapsedTitle={elapsedTitle}
      showElapsedTimer={Boolean(elapsedTimerValue)}
    />
    {showElapsed ? (
      <p className={styles.elapsed}>
        In queue for <span className={styles.elapsedValue}>{elapsedLabel}</span>
      </p>
    ) : null}
    {hasItems ? <OrderItemsList items={items} /> : <p className={styles.empty}>No line items for this order.</p>}
    {hasNotes ? <p className={styles.notes}>Notes: {notes}</p> : null}
    {showFooter ? (
      <footer className={styles.footer}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>{formattedTotal}</span>
      </footer>
    ) : null}
  </article>
)

export default memo(OrderCardView)
