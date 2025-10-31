import { memo } from 'react'
import styles from './OrderCardHeader.module.css'

const OrderCardHeader = ({
  isActive,
  orderNumber,
  orderNumberLabel,
  displayCustomerName,
  customerAriaLabel,
  diningOption,
  showDiningOption,
  fulfillmentStatus,
  fulfillmentBadgeClassName,
  showFulfillmentStatus,
  hasTitlebarMeta,
  elapsedAriaLabel,
  elapsedIsoDuration,
  elapsedTimerValue,
  elapsedTitle,
  showElapsedTimer,
}) => (
  <header className={styles.header}>
    <div className={`${styles.titlebar} ${isActive ? styles.titlebarActive : ''}`.trim()}>
      <div className={styles.titlebarRow}>
        <div className={styles.titlebarMain}>
          {orderNumber ? (
            <span className={styles.number} aria-label={orderNumberLabel}>
              {orderNumber}
            </span>
          ) : null}
          {displayCustomerName ? (
            <span
              className={styles.tabName}
              aria-label={customerAriaLabel}
              title={displayCustomerName}
            >
              {displayCustomerName}
            </span>
          ) : null}
        </div>
        {showElapsedTimer ? (
          <div
            className={styles.titlebarTimer}
            role="timer"
            aria-live="polite"
            aria-label={elapsedAriaLabel}
            title={elapsedTitle || undefined}
          >
            <span className={styles.titlebarTimerIcon} aria-hidden="true">
              ⏱
            </span>
            <time className={styles.titlebarTimerValue} dateTime={elapsedIsoDuration}>
              {elapsedTimerValue}
            </time>
          </div>
        ) : null}
      </div>
      {hasTitlebarMeta ? (
        <div className={styles.titlebarMeta}>
          {showDiningOption ? (
            <span className={styles.dining} aria-label={`Dining option ${diningOption}`}>
              {diningOption}
            </span>
          ) : null}
          {showFulfillmentStatus ? (
            <span
              className={`${styles.fulfillmentBadge} ${fulfillmentBadgeClassName}`.trim()}
              aria-label={`Fulfillment status ${fulfillmentStatus}`}
            >
              {fulfillmentStatus}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  </header>
)

export default memo(OrderCardHeader)
