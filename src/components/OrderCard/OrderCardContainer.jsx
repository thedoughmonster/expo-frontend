import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fulfillmentStatusToClassName } from '../../domain/status/fulfillmentFilters'
import OrderCardView from './OrderCardView'
import {
  formatCurrency,
  formatElapsedDuration,
  formatElapsedIsoDuration,
  formatElapsedLabel,
  formatElapsedTimer,
  formatTimestamp,
  statusToClassName,
} from './utils'
import styles from './OrderCardContainer.module.css'

const EMPTY_ARRAY = []

const normalizeText = (value) => value?.trim() ?? ''

const OrderCardContainer = ({ order, isActive, onOrderClick, onOrderKeyDown, now }) => {
  const cardRef = useRef(null)
  const [columnCount, setColumnCount] = useState(1)
  const columnCountRef = useRef(1)
  const handleClick = useCallback(() => {
    onOrderClick(order.id)
  }, [onOrderClick, order.id])

  const handleKeyDown = useCallback(
    (event) => {
      onOrderKeyDown(event, order.id)
    },
    [onOrderKeyDown, order.id],
  )

  const cardClassName = useMemo(() => {
    const classNames = [styles.orderCard]
    if (isActive) {
      classNames.push(styles.orderCardActive)
    }
    return classNames.join(' ')
  }, [isActive])

  const formattedTotal = useMemo(
    () => formatCurrency(order.total, order.currency ?? 'USD'),
    [order.currency, order.total],
  )

  const statusClassName = useMemo(() => statusToClassName(order.status), [order.status])

  const timeLabel = useMemo(
    () => formatTimestamp(order.createdAt, order.createdAtRaw),
    [order.createdAt, order.createdAtRaw],
  )

  const elapsedStart = order.createdAt ?? order.createdAtRaw

  const elapsedTimerValue = useMemo(
    () => formatElapsedTimer(elapsedStart, now),
    [elapsedStart, now],
  )

  const elapsedIsoDuration = useMemo(
    () => formatElapsedIsoDuration(elapsedStart, now),
    [elapsedStart, now],
  )

  const elapsedLabel = useMemo(() => formatElapsedLabel(elapsedStart, now), [elapsedStart, now])

  const elapsedDuration = useMemo(
    () => formatElapsedDuration(elapsedStart, now),
    [elapsedStart, now],
  )

  const elapsedAriaLabel = useMemo(() => {
    if (elapsedLabel) {
      return `Elapsed time ${elapsedLabel}`
    }

    if (elapsedDuration) {
      return `Elapsed time ${elapsedDuration}`
    }

    return undefined
  }, [elapsedDuration, elapsedLabel])

  const trimmedTabName = useMemo(() => normalizeText(order.tabName), [order.tabName])
  const trimmedCustomerName = useMemo(() => normalizeText(order.customerName), [order.customerName])

  const shouldShowCustomerSubtitle = useMemo(() => {
    if (!trimmedCustomerName) {
      return false
    }

    if (!trimmedTabName) {
      return true
    }

    return trimmedCustomerName.toLowerCase() !== trimmedTabName.toLowerCase()
  }, [trimmedCustomerName, trimmedTabName])

  const displayCustomerName = trimmedTabName || trimmedCustomerName

  const orderNumberLabel = useMemo(
    () => (order.displayId ? `Order number ${order.displayId}` : undefined),
    [order.displayId],
  )

  const fulfillmentBadgeClassName = useMemo(() => {
    if (!order.fulfillmentStatus) {
      return ''
    }

    return fulfillmentStatusToClassName(order.fulfillmentStatus)
  }, [order.fulfillmentStatus])

  const hasTitlebarMeta = useMemo(
    () => Boolean(order.diningOption || order.fulfillmentStatus),
    [order.diningOption, order.fulfillmentStatus],
  )

  const items = useMemo(() => {
    if (!order.items || order.items.length === 0) {
      return EMPTY_ARRAY
    }

    return order.items.map((item) => {
      const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1
      const price =
        item.price !== undefined
          ? formatCurrency(item.price, item.currency ?? order.currency ?? 'USD')
          : undefined

      const modifiers = (item.modifiers ?? []).map((modifier, modifierIndex) => {
        const rawQuantity = Number(modifier.quantity)
        const modifierQuantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1
        return {
          id: `${item.id}-modifier-${modifierIndex}`,
          quantity: modifierQuantity,
          quantityLabel: `Quantity ${modifierQuantity}`,
          name: modifier.name ?? '',
        }
      })

      return {
        id: item.id ?? `${order.id}-item-${item.name}`,
        quantity,
        quantityLabel: `Quantity ${quantity}`,
        name: item.name ?? '',
        price,
        hasPrice: price !== undefined,
        modifiers,
        hasModifiers: modifiers.length > 0,
        notes: item.notes ?? '',
      }
    })
  }, [order.currency, order.id, order.items])

  const hasItems = items.length > 0
  const notes = order.notes ?? ''
  const showFooter = Boolean(formattedTotal)

  useEffect(() => {
    columnCountRef.current = columnCount
  }, [columnCount])

  const recomputeColumnCount = useCallback(() => {
    const element = cardRef.current

    if (!element || typeof window === 'undefined') {
      return
    }

    const area = element.closest('[data-orders-area]')

    let availableHeight

    if (area) {
      const computedStyle = window.getComputedStyle(area)
      const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0
      availableHeight = area.clientHeight - paddingTop - paddingBottom
    } else {
      const parent = element.parentElement
      availableHeight = parent?.clientHeight ?? element.clientHeight
    }

    if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
      if (columnCountRef.current !== 1) {
        columnCountRef.current = 1
        setColumnCount(1)
      }
      return
    }

    const currentColumns = columnCountRef.current || 1
    const normalizedHeight = element.scrollHeight * currentColumns
    const desiredColumns = Math.max(1, Math.ceil(normalizedHeight / availableHeight))

    if (desiredColumns !== columnCountRef.current) {
      columnCountRef.current = desiredColumns
      setColumnCount(desiredColumns)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const element = cardRef.current

    if (!element) {
      return undefined
    }

    let frameId = window.requestAnimationFrame(recomputeColumnCount)

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(recomputeColumnCount)
    })

    resizeObserver.observe(element)

    const area = element.closest('[data-orders-area]')
    if (area) {
      resizeObserver.observe(area)
    }

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [recomputeColumnCount])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const frameId = window.requestAnimationFrame(recomputeColumnCount)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [items, notes, showFooter, recomputeColumnCount])

  const cardStyle = useMemo(
    () => ({
      '--order-card-columns': columnCount,
    }),
    [columnCount],
  )

  return (
    <OrderCardView
      className={cardClassName}
      style={cardStyle}
      articleRef={cardRef}
      isActive={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      elapsedAriaLabel={elapsedAriaLabel}
      elapsedIsoDuration={elapsedIsoDuration}
      elapsedTimerValue={elapsedTimerValue ?? ''}
      elapsedTitle={elapsedLabel || elapsedDuration || ''}
      orderNumber={order.displayId ?? ''}
      orderNumberLabel={orderNumberLabel}
      displayCustomerName={displayCustomerName}
      customerAriaLabel={displayCustomerName ? `Customer ${displayCustomerName}` : undefined}
      customerSubtitle={order.customerName ?? ''}
      showCustomerSubtitle={shouldShowCustomerSubtitle}
      diningOption={order.diningOption ?? ''}
      showDiningOption={Boolean(order.diningOption)}
      fulfillmentStatus={order.fulfillmentStatus ?? ''}
      fulfillmentBadgeClassName={fulfillmentBadgeClassName}
      showFulfillmentStatus={Boolean(order.fulfillmentStatus)}
      hasTitlebarMeta={hasTitlebarMeta}
      status={order.status ?? ''}
      statusClassName={statusClassName}
      timeLabel={timeLabel ?? ''}
      timeDateTime={order.createdAt?.toISOString() ?? undefined}
      items={items}
      hasItems={hasItems}
      notes={notes}
      hasNotes={Boolean(notes)}
      formattedTotal={formattedTotal ?? ''}
      showFooter={showFooter}
    />
  )
}

export default memo(OrderCardContainer)
