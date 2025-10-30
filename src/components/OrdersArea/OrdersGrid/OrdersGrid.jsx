import { memo } from 'react'
import { parseDateLike } from '../../../domain/orders/normalizeOrders'
import { fulfillmentStatusToClassName } from '../../../domain/status/fulfillmentFilters'
import styles from './OrdersGrid.module.css'

const EMPTY_SELECTION = new Set()

const formatCurrency = (value, currency = 'USD') => {
  if (value === undefined || value === null) {
    return undefined
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toString()
  }
}

const formatTimestamp = (date, fallback) => {
  if (!date) {
    return fallback
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return fallback ?? date.toString()
  }
}

const getElapsedTimeParts = (start, end = new Date()) => {
  const startDate = start instanceof Date ? start : parseDateLike(start)
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return null
  }

  const target = end instanceof Date && !Number.isNaN(end.getTime()) ? end : new Date()
  const diffMs = Math.max(0, target.getTime() - startDate.getTime())
  const totalSeconds = Math.floor(diffMs / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  return {
    totalSeconds,
    totalMinutes,
    totalHours,
    totalDays,
    hours: totalHours % 24,
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

const formatElapsedDuration = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const pad = (value) => value.toString().padStart(2, '0')

  if (parts.totalHours > 0) {
    return `${parts.totalHours}:${pad(parts.minutes)}:${pad(parts.seconds)}`
  }

  return `${pad(parts.minutes)}:${pad(parts.seconds)}`
}

const formatElapsedTimer = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const seconds = parts.seconds.toString().padStart(2, '0')
  const minutes = parts.totalMinutes.toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

const formatElapsedLabel = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const { totalDays, totalHours, hours, totalMinutes, minutes, seconds } = parts
  const labels = []

  if (totalDays > 0) {
    labels.push(`${totalDays} day${totalDays === 1 ? '' : 's'}`)
  }

  if (totalHours > 0) {
    const hoursToInclude = totalDays > 0 ? hours : totalHours
    if (hoursToInclude > 0) {
      labels.push(`${hoursToInclude} hour${hoursToInclude === 1 ? '' : 's'}`)
    }
  }

  if (totalMinutes > 0 && labels.length < 2) {
    const minutesToInclude = labels.length > 0 ? minutes : totalMinutes
    if (minutesToInclude > 0) {
      labels.push(`${minutesToInclude} minute${minutesToInclude === 1 ? '' : 's'}`)
    }
  }

  if (labels.length === 0) {
    if (seconds > 0) {
      labels.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
    } else {
      labels.push('moments')
    }
  }

  return labels.slice(0, 2).join(' ')
}

const formatElapsedIsoDuration = (start, end = new Date()) => {
  const parts = getElapsedTimeParts(start, end)
  if (!parts) {
    return undefined
  }

  const { totalDays, hours, minutes, seconds } = parts
  const dateSegments = []
  const timeSegments = []

  if (totalDays > 0) {
    dateSegments.push(`${totalDays}D`)
  }

  if (hours > 0) {
    timeSegments.push(`${hours}H`)
  }

  if (minutes > 0 || (timeSegments.length > 0 && seconds > 0)) {
    timeSegments.push(`${minutes}M`)
  }

  if (seconds > 0 || (dateSegments.length === 0 && timeSegments.length === 0)) {
    timeSegments.push(`${seconds}S`)
  }

  if (dateSegments.length === 0 && timeSegments.length === 0) {
    timeSegments.push('0S')
  }

  const datePart = dateSegments.length > 0 ? dateSegments.join('') : ''
  const timePart = timeSegments.length > 0 ? `T${timeSegments.join('')}` : ''

  return `P${datePart}${timePart || 'T0S'}`
}

const statusToClassName = (status) => {
  if (!status) {
    return ''
  }

  return `order-status--${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

const OrdersGrid = ({ orders, activeOrderIds, onOrderClick, onOrderKeyDown, now }) => {
  const selection = activeOrderIds ?? EMPTY_SELECTION

  return (
    <section className={styles.ordersGrid} aria-live="polite">
      {orders.map((order) => {
        const isOrderActive = selection.has(order.id)
        const orderCardClasses = ['order-card']
        if (isOrderActive) {
          orderCardClasses.push('is-active')
        }
        const formattedTotal = formatCurrency(order.total, order.currency ?? 'USD')
        const statusClass = statusToClassName(order.status)
        const elapsedStart = order.createdAt ?? order.createdAtRaw
        const timeLabel = formatTimestamp(order.createdAt, order.createdAtRaw)
        const elapsedDuration = formatElapsedDuration(elapsedStart, now)
        const elapsedTimerValue = formatElapsedTimer(elapsedStart, now)
        const elapsedIsoDuration = formatElapsedIsoDuration(elapsedStart, now)
        const elapsedLabel = formatElapsedLabel(elapsedStart, now)
        const elapsedAriaLabel = elapsedLabel
          ? `Elapsed time ${elapsedLabel}`
          : elapsedDuration
            ? `Elapsed time ${elapsedDuration}`
            : undefined
        const shouldShowFulfillmentStatus = Boolean(order.fulfillmentStatus)
        const trimmedTabName = order.tabName?.trim()
        const trimmedCustomerName = order.customerName?.trim()
        const shouldShowCustomerSubtitle = Boolean(
          trimmedCustomerName &&
            (!trimmedTabName || trimmedCustomerName.toLowerCase() !== trimmedTabName.toLowerCase()),
        )

        const displayCustomerName = trimmedTabName || trimmedCustomerName
        const orderNumberLabel = order.displayId ? `Order number ${order.displayId}` : undefined
        const fulfillmentBadgeClass = shouldShowFulfillmentStatus
          ? fulfillmentStatusToClassName(order.fulfillmentStatus)
          : ''
        const fulfillmentBadgeClasses = ['order-fulfillment-badge']
        if (fulfillmentBadgeClass) {
          fulfillmentBadgeClasses.push(fulfillmentBadgeClass)
        }
        const hasTitlebarMeta = Boolean(order.diningOption || shouldShowFulfillmentStatus)

        return (
          <article
            className={orderCardClasses.join(' ')}
            key={order.id}
            role="button"
            tabIndex={0}
            aria-pressed={isOrderActive}
            onClick={() => onOrderClick(order.id)}
            onKeyDown={(event) => onOrderKeyDown(event, order.id)}
          >
            <header className="order-card-header">
              <div className="order-card-titlebar">
                <div className="order-card-titlebar-main">
                  {order.displayId ? (
                    <span className="order-card-number" aria-label={orderNumberLabel}>
                      {order.displayId}
                    </span>
                  ) : null}
                  {displayCustomerName ? (
                    <span
                      className="order-card-tabname"
                      aria-label={`Customer ${displayCustomerName}`}
                      title={displayCustomerName}
                    >
                      {displayCustomerName}
                    </span>
                  ) : null}
                </div>
                {hasTitlebarMeta ? (
                  <div className="order-card-titlebar-meta">
                    {order.diningOption ? (
                      <span className="order-card-dining" aria-label={`Dining option ${order.diningOption}`}>
                        {order.diningOption}
                      </span>
                    ) : null}
                    {shouldShowFulfillmentStatus ? (
                      <span
                        className={fulfillmentBadgeClasses.join(' ')}
                        aria-label={`Fulfillment status ${order.fulfillmentStatus}`}
                      >
                        {order.fulfillmentStatus}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {elapsedTimerValue ? (
                  <div
                    className="order-card-titlebar-timer"
                    role="timer"
                    aria-live="polite"
                    aria-label={elapsedAriaLabel}
                    title={elapsedLabel ?? elapsedDuration ?? undefined}
                  >
                    <span className="order-card-titlebar-timer-icon" aria-hidden="true">
                      ⏱
                    </span>
                    <time className="order-card-titlebar-timer-value" dateTime={elapsedIsoDuration ?? undefined}>
                      {elapsedTimerValue}
                    </time>
                  </div>
                ) : null}
              </div>
              <div className="order-card-header-body">
                {shouldShowCustomerSubtitle ? (
                  <p className="order-card-subtitle">for {order.customerName}</p>
                ) : null}
                <div className="order-card-meta">
                  {order.status ? (
                    <span className={`order-status-badge ${statusClass}`}>{order.status}</span>
                  ) : null}
                  {timeLabel ? (
                    <time className="order-card-time" dateTime={order.createdAt?.toISOString() ?? undefined}>
                      {timeLabel}
                    </time>
                  ) : null}
                </div>
              </div>
            </header>
            {elapsedLabel ? (
              <p className="order-card-elapsed">
                In queue for <span className="order-card-elapsed-value">{elapsedLabel}</span>
              </p>
            ) : null}
            {order.items.length > 0 ? (
              <ul className="order-items">
                {order.items.map((item) => (
                  <li className="order-item" key={`${order.id}-${item.id}`}>
                    <div className="order-item-header">
                      <div className="order-item-title">
                        <span className="order-item-qty" aria-label={`Quantity ${item.quantity}`}>
                          {item.quantity}
                          <span aria-hidden="true">×</span>
                        </span>
                        <span className="order-item-name">{item.name}</span>
                      </div>
                      {item.price !== undefined ? (
                        <span className="order-item-price">
                          {formatCurrency(item.price, item.currency ?? order.currency ?? 'USD')}
                        </span>
                      ) : null}
                    </div>
                    {item.modifiers.length > 0 ? (
                      <div className="order-item-modifiers-card">
                        <p className="order-item-modifiers-title">Modifiers</p>
                        <ul className="order-item-modifiers">
                          {item.modifiers.map((modifier, modifierIndex) => {
                            const rawQuantity = Number(modifier.quantity)
                            const quantity =
                              Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1

                            return (
                              <li className="order-item-modifier" key={`${item.id}-modifier-${modifierIndex}`}>
                                <span className="order-item-modifier-qty" aria-label={`Quantity ${quantity}`}>
                                  {quantity}
                                  <span aria-hidden="true">×</span>
                                </span>
                                <span className="order-item-modifier-name">{modifier.name}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null}
                    {item.notes ? <p className="order-item-notes">{item.notes}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="order-card-empty">No line items for this order.</p>
            )}
            {order.notes ? <p className="order-card-notes">Notes: {order.notes}</p> : null}
            {formattedTotal ? (
              <footer className="order-card-footer">
                <span className="order-card-total-label">Total</span>
                <span className="order-card-total-value">{formattedTotal}</span>
              </footer>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}

export default memo(OrdersGrid)
