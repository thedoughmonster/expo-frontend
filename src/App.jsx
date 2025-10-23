import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DATA_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders-detailed'

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
  }

  return []
}

const pickValue = (source, keys) => {
  if (!source) {
    return undefined
  }

  for (const key of keys) {
    const path = key.split('.')
    let current = source

    for (const segment of path) {
      if (current == null) {
        break
      }

      current = current[segment]
    }

    if (current !== undefined && current !== null && current !== '') {
      return current
    }
  }

  return undefined
}

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.-]+/g, '')
    if (sanitized) {
      const parsed = Number(sanitized)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  return undefined
}

const toStringValue = (value) => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  return String(value)
}

const parseDateLike = (value) => {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000
    const parsed = new Date(milliseconds)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      const fromNumeric = parseDateLike(numeric)
      if (fromNumeric) {
        return fromNumeric
      }
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  return undefined
}

const normalizeItemModifiers = (item) => {
  const modifierKeys = ['modifiers', 'options', 'toppings', 'customizations', 'addOns', 'add_ons']
  for (const key of modifierKeys) {
    const candidate = item?.[key]
    if (!candidate) {
      continue
    }

    const modifierArray = ensureArray(candidate)
    const normalized = modifierArray
      .map((modifier) => {
        if (!modifier) {
          return null
        }

        if (typeof modifier === 'string') {
          return { name: modifier, quantity: 1 }
        }

        if (Array.isArray(modifier)) {
          return modifier
            .map((nested) => {
              if (!nested) {
                return null
              }

              if (typeof nested === 'string') {
                return { name: nested, quantity: 1 }
              }

              if (typeof nested === 'object') {
                const nestedName = toStringValue(
                  pickValue(nested, ['name', 'title', 'label', 'modifier', 'value', 'description']),
                )
                if (!nestedName) {
                  return null
                }

                const nestedQuantity = toNumber(pickValue(nested, ['quantity', 'qty', 'count', 'amount']))
                return {
                  name: nestedName,
                  quantity: nestedQuantity && nestedQuantity > 0 ? nestedQuantity : 1,
                }
              }

              return null
            })
            .filter(Boolean)
        }

        if (typeof modifier === 'object') {
          const name = toStringValue(pickValue(modifier, ['name', 'title', 'label', 'modifier', 'value', 'description']))
          if (!name) {
            return null
          }

          const quantity = toNumber(pickValue(modifier, ['quantity', 'qty', 'count', 'amount']))
          return { name, quantity: quantity && quantity > 0 ? quantity : 1 }
        }

        return null
      })
      .flat()
      .filter(Boolean)

    if (normalized.length > 0) {
      return normalized
    }
  }

  return []
}

const normalizeOrderItems = (order) => {
  const itemKeys = ['items', 'line_items', 'lineItems', 'products', 'order_items', 'entries', 'cartItems']
  let rawItems

  for (const key of itemKeys) {
    const candidate = order?.[key]
    if (Array.isArray(candidate) && candidate.length > 0) {
      rawItems = candidate
      break
    }
  }

  if (!rawItems && Array.isArray(order?.details?.items)) {
    rawItems = order.details.items
  }

  if (!rawItems && Array.isArray(order?.summary?.items)) {
    rawItems = order.summary.items
  }

  if (!rawItems) {
    return []
  }

  return rawItems.map((item, index) => {
    const name = toStringValue(pickValue(item, ['name', 'title', 'item', 'product', 'description'])) ?? `Item ${index + 1}`
    const quantity = toNumber(pickValue(item, ['quantity', 'qty', 'count', 'amount'])) ?? 1
    const price = toNumber(pickValue(item, ['price', 'unit_price', 'price_total', 'total', 'cost']))
    const currency = toStringValue(pickValue(item, ['currency', 'currencyCode']))
    const notes = toStringValue(pickValue(item, ['notes', 'note', 'specialInstructions', 'instructions']))
    const modifiers = normalizeItemModifiers(item)

    const identifier =
      toStringValue(pickValue(item, ['id', 'uuid', 'sku', 'code', 'line_id', 'lineId'])) ?? `${index}`

    return {
      id: identifier,
      name,
      quantity,
      price,
      currency,
      notes,
      modifiers,
    }
  })
}

const normalizeOrders = (rawOrders) => {
  const collection = ensureArray(rawOrders)

  return collection.map((order, index) => {
    if (!order || typeof order !== 'object') {
      return null
    }

    const displayId = toStringValue(
      pickValue(order, [
        'displayId',
        'display_id',
        'orderNumber',
        'order_number',
        'ticket',
        'number',
        'id',
        'reference',
        'name',
      ]),
    )

    const status = toStringValue(pickValue(order, ['status', 'orderStatus', 'state', 'stage', 'fulfillment_status']))
    const createdAtRaw =
      pickValue(order, ['createdAt', 'created_at', 'placedAt', 'placed_at', 'timestamp', 'time', 'submitted_at']) ??
      pickValue(order, ['timing.createdAt', 'timing.created_at'])
    const createdAt = parseDateLike(createdAtRaw)
    const total = toNumber(
      pickValue(order, [
        'total',
        'totalPrice',
        'total_price',
        'amount',
        'amount_total',
        'order_total',
        'totals.total',
      ]),
    )
    const currency = toStringValue(pickValue(order, ['currency', 'currencyCode', 'totals.currency']))
    const customerName = toStringValue(
      pickValue(order, ['customer', 'customerName', 'customer_name', 'guest', 'client', 'user']),
    )
    const notes = toStringValue(pickValue(order, ['notes', 'note', 'specialInstructions', 'instructions']))

    return {
      id: displayId ?? `order-${index}`,
      displayId: displayId ?? `#${index + 1}`,
      status,
      createdAt,
      createdAtRaw: createdAtRaw ? toStringValue(createdAtRaw) : undefined,
      total,
      currency,
      customerName,
      notes,
      items: normalizeOrderItems(order),
    }
  }).filter(Boolean)
}

const extractOrdersFromPayload = (payload) => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload)) {
    return payload
  }

  const candidateKeys = [
    'orders',
    'data.orders',
    'result.orders',
    'payload.orders',
    'body.orders',
    'data',
  ]

  for (const key of candidateKeys) {
    const candidate = pickValue(payload, [key])
    const asArray = ensureArray(candidate)
    if (asArray.length > 0) {
      return asArray
    }
  }

  return []
}

const normalizeModifierEntry = (modifier, fallbackIndex) => {
  if (!modifier) {
    return null
  }

  if (typeof modifier === 'string') {
    return { name: modifier, qty: 1 }
  }

  if (typeof modifier === 'number') {
    return { name: `Modifier ${fallbackIndex + 1}`, qty: modifier }
  }

  if (typeof modifier === 'object') {
    if ('name' in modifier || 'title' in modifier || 'label' in modifier) {
      const name =
        toStringValue(pickValue(modifier, ['name', 'title', 'label', 'modifier', 'value', 'description'])) ??
        `Modifier ${fallbackIndex + 1}`
      const qty =
        toNumber(pickValue(modifier, ['qty', 'quantity', 'count', 'total', 'amount', 'value'])) ?? undefined
      return {
        name,
        qty: qty && qty > 0 ? qty : 1,
      }
    }

    const entries = Object.entries(modifier)
    if (entries.length === 1) {
      const [[entryName, entryQty]] = entries
      const parsedQty = toNumber(entryQty)
      return {
        name: toStringValue(entryName) ?? `Modifier ${fallbackIndex + 1}`,
        qty: parsedQty && parsedQty > 0 ? parsedQty : 1,
      }
    }
  }

  return null
}

const normalizeModifiersFromPayload = (payload) => {
  if (!payload) {
    return []
  }

  const candidateKeys = [
    'modifiers',
    'modifierSummary',
    'modifier_summary',
    'topModifiers',
    'popularModifiers',
    'data.modifiers',
    'summary.modifiers',
  ]

  for (const key of candidateKeys) {
    const candidate = pickValue(payload, [key])
    if (!candidate) {
      continue
    }

    const arrayForm = ensureArray(candidate)
    if (arrayForm.length > 0) {
      const normalized = arrayForm
        .map((entry, index) => normalizeModifierEntry(entry, index))
        .filter(Boolean)
      if (normalized.length > 0) {
        return normalized
      }
    }

    if (candidate && typeof candidate === 'object') {
      const normalized = Object.entries(candidate)
        .map(([name, qty], index) => {
          const parsedQty = toNumber(qty)
          return {
            name,
            qty: parsedQty && parsedQty > 0 ? parsedQty : 1,
          }
        })
        .filter((entry) => entry.name)
      if (normalized.length > 0) {
        return normalized
      }
    }
  }

  return []
}

const deriveModifiersFromOrders = (orders) => {
  const counts = new Map()

  orders.forEach((order) => {
    order.items.forEach((item) => {
      item.modifiers.forEach((modifier) => {
        if (!modifier?.name) {
          return
        }

        const quantity = modifier.quantity && modifier.quantity > 0 ? modifier.quantity : 1
        const nextValue = (counts.get(modifier.name) ?? 0) + quantity
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
  } catch (_error) {
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
  } catch (_error) {
    return fallback ?? date.toString()
  }
}

const statusToClassName = (status) => {
  if (!status) {
    return ''
  }

  return `order-status--${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function App() {
  const [orders, setOrders] = useState([])
  const [modifiers, setModifiers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isSubscribed = true
    const controller = new AbortController()

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(DATA_ENDPOINT, { signal: controller.signal })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = await response.json()
        if (!isSubscribed) {
          return
        }

        const rawOrders = extractOrdersFromPayload(payload)
        const normalizedOrders = normalizeOrders(rawOrders)
        const payloadModifiers = normalizeModifiersFromPayload(payload)
        const aggregatedModifiers = payloadModifiers.length > 0
          ? payloadModifiers
          : deriveModifiersFromOrders(normalizedOrders)

        setOrders(normalizedOrders)
        setModifiers(aggregatedModifiers)
      } catch (fetchError) {
        if (!isSubscribed || fetchError.name === 'AbortError') {
          return
        }

        setError(fetchError)
        setOrders([])
        setModifiers([])
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isSubscribed = false
      controller.abort()
    }
  }, [])

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

  const modifierItems = modifiers.length > 0 ? modifiers : []

  const openSettings = () => {
    setActiveTabId(settingsTabs[0].id)
    setSettingsOpen(true)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
  }

  return (
    <div className="dashboard">
      <header className="top-bar">
        <h1>Order Dashboard</h1>
        <button
          type="button"
          className="settings-button"
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          onClick={openSettings}
        >
          <span className="sr-only">Open settings</span>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="settings-icon"
          >
            <path
              d="M12 15.25C13.7949 15.25 15.25 13.7949 15.25 12C15.25 10.2051 13.7949 8.75 12 8.75C10.2051 8.75 8.75 10.2051 8.75 12C8.75 13.7949 10.2051 15.25 12 15.25Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.5 12.0001C19.5001 12.5003 19.4412 12.9991 19.3245 13.4846L21.1815 15.0631L19.0631 18.1815L17.2055 16.9091C16.6021 17.3539 15.9295 17.7011 15.2155 17.9346L14.8725 20.25H9.1275L8.7845 17.9346C8.0705 17.7011 7.39792 17.3539 6.7945 16.9091L4.93688 18.1815L2.81848 15.0631L4.67548 13.4846C4.55879 12.9991 4.4999 12.5003 4.5 12.0001C4.4999 11.4999 4.55879 11.0011 4.67548 10.5156L2.81848 8.93705L4.93688 5.81865L6.7945 7.09105C7.39792 6.64625 8.0705 6.29903 8.7845 6.06555L9.1275 3.75H14.8725L15.2155 6.06555C15.9295 6.29903 16.6021 6.64625 17.2055 7.09105L19.0631 5.81865L21.1815 8.93705L19.3245 10.5156C19.4412 11.0011 19.5001 11.4999 19.5 12.0001Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>
      <div className="dashboard-body">
        <aside className="sidebar">
          <h2>Modifiers</h2>
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
        <main className="orders-area">
          {isLoading && orders.length === 0 && !error ? (
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
          {!isLoading && !error && orders.length === 0 ? (
            <section className="orders-state">No orders available.</section>
          ) : null}
          {orders.length > 0 ? (
            <section className="orders-grid" aria-live="polite">
              {orders.map((order) => {
                const formattedTotal = formatCurrency(order.total, order.currency ?? 'USD')
                const statusClass = statusToClassName(order.status)
                const timeLabel = formatTimestamp(order.createdAt, order.createdAtRaw)

                return (
                  <article className="order-card" key={order.id}>
                    <header className="order-card-header">
                      <div className="order-card-heading">
                        <h2 className="order-card-title">Order {order.displayId}</h2>
                        {order.customerName ? (
                          <p className="order-card-subtitle">for {order.customerName}</p>
                        ) : null}
                      </div>
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
                    </header>
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
                              <ul className="order-item-modifiers">
                                {item.modifiers.map((modifier, modifierIndex) => (
                                  <li className="order-item-modifier" key={`${item.id}-modifier-${modifierIndex}`}>
                                    {modifier.quantity && modifier.quantity > 1
                                      ? `${modifier.quantity} × ${modifier.name}`
                                      : modifier.name}
                                  </li>
                                ))}
                              </ul>
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
      </div>
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
    </div>
  )
}

export default App
