import { useMemo } from 'react'
import ModifierSidebarView from './ModifierSidebarView'

const deriveModifiersFromOrders = (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return []
  }

  const counts = new Map()

  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const itemQuantity = item?.quantity && item.quantity > 0 ? item.quantity : 1

      item?.modifiers?.forEach((modifier) => {
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

const deriveStatus = (isLoading, error, modifierItems) => {
  if (isLoading && modifierItems.length === 0 && !error) {
    return {
      key: 'loading',
      message: 'Loading modifiers…',
      ariaLive: 'polite',
      role: undefined,
    }
  }

  if (!isLoading && error) {
    return {
      key: 'error',
      message: 'Unable to load modifiers.',
      ariaLive: undefined,
      role: 'alert',
    }
  }

  if (!isLoading && !error && modifierItems.length === 0) {
    return {
      key: 'empty',
      message: 'No modifiers found.',
      ariaLive: undefined,
      role: undefined,
    }
  }

  return null
}

const ModifierSidebarContainer = ({ orders, isLoading, error, selectionSummaryMessage }) => {
  const modifierItems = useMemo(() => deriveModifiersFromOrders(orders), [orders])

  const status = useMemo(
    () => deriveStatus(isLoading, error, modifierItems),
    [isLoading, error, modifierItems],
  )

  return (
    <ModifierSidebarView
      modifierItems={modifierItems}
      selectionSummaryMessage={selectionSummaryMessage}
      status={status}
    />
  )
}

export default ModifierSidebarContainer
