import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import DashboardLayout from './components/DashboardLayout'
import { TopBarContainer } from './components/TopBar'
import { parseDateLike } from './domain/orders/normalizeOrders'
import { FULFILLMENT_FILTERS, fulfillmentStatusToClassName, resolveFulfillmentFilterKey } from './domain/status/fulfillmentFilters'
import useOrdersData from './hooks/useOrdersData'
import { OrdersViewProvider, useFulfillmentFilters, useSelectionState } from './viewContext/OrdersViewContext'


const deriveModifiersFromOrders = (orders) => {
  const counts = new Map()

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const itemQuantity = item.quantity && item.quantity > 0 ? item.quantity : 1

      item.modifiers.forEach((modifier) => {
        if (!modifier?.name) {
          return
        }

        const modifierQuantity = modifier.quantity && modifier.quantity > 0 ? modifier.quantity : 1
        const totalQuantity = modifierQuantity * itemQuantity
        const nextValue = (counts.get(modifier.name) ?? 0) + totalQuantity
        counts.set(modifier.name, nextValue)
      })
    })
  })

  return Array.from(counts.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
}

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

const statusToClassName = (status) => {
  if (!status) {
    return ''
  }

  return `order-status--${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function DashboardView() {
  const { orders, isLoading, isRefreshing, error, refresh } = useOrdersData()
  const { activeFulfillmentFilters } = useFulfillmentFilters()
  const { activeOrderIds, toggleOrderActive } = useSelectionState()
  const now = useNow(1000)

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

  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [activeTabId, setActiveTabId] = useState(settingsTabs[0].id)

  const activeTab = settingsTabs.find((tab) => tab.id === activeTabId) ?? settingsTabs[0]

  const ordersForModifiers = useMemo(() => {
    if (activeOrderIds.size === 0) {
      return visibleOrders
    }

    return visibleOrders.filter((order) => activeOrderIds.has(order.id))
  }, [activeOrderIds, visibleOrders])

  const modifierItems = useMemo(() => deriveModifiersFromOrders(ordersForModifiers), [ordersForModifiers])
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

  const handleOrderKeyDown = useCallback(
    (event, orderId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleOrderActive(orderId)
      }
    },
    [toggleOrderActive],
  )

  const handleRefresh = useCallback(() => {
    refresh({ silent: hasExistingOrders })
  }, [hasExistingOrders, refresh])

  const openSettings = useCallback(() => {
    setActiveTabId(settingsTabs[0].id)
    setSettingsOpen(true)
  }, [settingsTabs])

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
  }, [])

  const topBar = (
    <TopBarContainer
      title="Order Dashboard"
      isBusy={isBusy}
      isSettingsOpen={isSettingsOpen}
      onOpenSettings={openSettings}
      onRefresh={handleRefresh}
      refreshAriaLabel={refreshAriaLabel}
    />
  )

  const sidebarContent = (
    <aside className="sidebar">
      <h2>Modifiers</h2>
      {selectionSummaryMessage ? (
        <p className="sidebar-selection-status" aria-live="polite">
          {selectionSummaryMessage}
        </p>
      ) : null}
      {isLoading && modifierItems.length === 0 && !error ? (
        <p className="sidebar-status" aria-live="polite">
          Loading modifiers…
        </p>
      ) : null}
      {!isLoading && error ? (
        <p className="sidebar-status" role="alert">
          Unable to load modifiers.
        </p>
      ) : null}
      {!isLoading && !error && modifierItems.length === 0 ? (
        <p className="sidebar-status">No modifiers found.</p>
      ) : null}
      {modifierItems.length > 0 ? (
        <ul className="modifier-list">
          {modifierItems.map(({ name, qty }) => (
            <li className="modifier-item" key={name}>
              <div className="modifier-qty" aria-label={`Quantity ${qty}`}>
                <span className="modifier-qty-value">{qty}</span>
                <span aria-hidden="true" className="qty-multiplier">
                  ×
                </span>
              </div>
              <div className="modifier-content">
                <span className="modifier-name">{name}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  )

  const ordersArea = (
    <main className="orders-area">
      {isLoading && !hasExistingOrders && !error ? (
        <section className="orders-state" aria-live="polite">
          Loading orders…
        </section>
      ) : null}
      {!isLoading && error ? (
        <section className="orders-state orders-state--error" role="alert">
          <h2>Unable to load orders</h2>
          <p>{error.message ?? 'Please try again later.'}</p>
        </section>
      ) : null}
      {!isLoading && !error && !hasVisibleOrders ? (
        <section className="orders-state">{emptyStateMessage}</section>
      ) : null}
      {hasVisibleOrders ? (
        <section className="orders-grid" aria-live="polite">
          {visibleOrders.map((order) => {
            const isOrderActive = activeOrderIds.has(order.id)
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
                onClick={() => toggleOrderActive(order.id)}
                onKeyDown={(event) => handleOrderKeyDown(event, order.id)}
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
                          <span
                            className="order-card-dining"
                            aria-label={`Dining option ${order.diningOption}`}
                          >
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
                        <time
                          className="order-card-titlebar-timer-value"
                          dateTime={elapsedIsoDuration ?? undefined}
                        >
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
                                  Number.isFinite(rawQuantity) && rawQuantity > 0
                                    ? rawQuantity
                                    : 1

                                return (
                                  <li
                                    className="order-item-modifier"
                                    key={`${item.id}-modifier-${modifierIndex}`}
                                  >
                                    <span
                                      className="order-item-modifier-qty"
                                      aria-label={`Quantity ${quantity}`}
                                    >
                                      {quantity}
                                      <span aria-hidden="true">×</span>
                                    </span>
                                    <span className="order-item-modifier-name">
                                      {modifier.name}
                                    </span>
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
      ) : null}
    </main>
  )

  return (
    <>
      <DashboardLayout topBar={topBar} sidebar={sidebarContent} ordersArea={ordersArea} />
      {isSettingsOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeSettings}>
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-modal-header">
              <h2 id="settings-modal-title">Dashboard Settings</h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={closeSettings}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-body">
              <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTab.id}
                    aria-controls={`settings-tabpanel-${tab.id}`}
                    id={`settings-tab-${tab.id}`}
                    className={`settings-tab${tab.id === activeTab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                className="settings-tabpanel"
                role="tabpanel"
                id={`settings-tabpanel-${activeTab.id}`}
                aria-labelledby={`settings-tab-${activeTab.id}`}
              >
                <p>{activeTab.description}</p>
                <ul className="settings-placeholder-list">
                  <li>Placeholder option A</li>
                  <li>Placeholder option B</li>
                  <li>Placeholder option C</li>
                </ul>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button type="button" className="modal-primary-button" disabled>
                Save Changes
              </button>
              <button type="button" className="modal-secondary-button" onClick={closeSettings}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
