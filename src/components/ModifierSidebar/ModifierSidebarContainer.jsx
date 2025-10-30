import { useMemo } from 'react'
import ModifierSidebarView from './ModifierSidebarView'

const DEFAULT_GROUP_NAME = 'Other modifiers'

const toOrderValue = (value) => (Number.isFinite(value) && value >= 0 ? value : Number.POSITIVE_INFINITY)

const normalizeKey = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    return trimmed || undefined
  }

  return undefined
}

const deriveModifiersFromOrders = (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return []
  }

  const groups = new Map()

  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const itemQuantity = Number.isFinite(item?.quantity) && item.quantity > 0 ? item.quantity : 1

      item?.modifiers?.forEach((modifier) => {
        if (!modifier?.name) {
          return
        }

        const modifierQuantity = Number.isFinite(modifier.quantity) && modifier.quantity > 0 ? modifier.quantity : 1
        const totalQuantity = modifierQuantity * itemQuantity

        const groupOrder = toOrderValue(modifier.groupOrder)
        const groupName = modifier.groupName?.trim() || DEFAULT_GROUP_NAME
        const groupKey = normalizeKey(modifier.groupId ?? modifier.groupName) ?? normalizeKey(groupName) ?? '__other__'

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            id: modifier.groupId ?? groupKey,
            name: groupName,
            order: groupOrder,
            items: new Map(),
          })
        }

        const group = groups.get(groupKey)

        if (groupOrder < group.order) {
          group.order = groupOrder
        }

        if (group.name === DEFAULT_GROUP_NAME && groupName !== DEFAULT_GROUP_NAME) {
          group.name = groupName
        }

        const optionOrder = toOrderValue(modifier.optionOrder)
        const itemKey = normalizeKey(modifier.identifier) ?? normalizeKey(modifier.name) ?? `${group.items.size}`

        if (!group.items.has(itemKey)) {
          group.items.set(itemKey, {
            id: modifier.identifier ?? `${group.id ?? groupKey}-${group.items.size}`,
            name: modifier.name,
            qty: totalQuantity,
            order: optionOrder,
          })
          return
        }

        const entry = group.items.get(itemKey)
        entry.qty += totalQuantity
        if (modifier.name && !entry.name) {
          entry.name = modifier.name
        }
        if (optionOrder < entry.order) {
          entry.order = optionOrder
        }
      })
    })
  })

  const sortedGroups = Array.from(groups.values())
    .map((group) => {
      const items = Array.from(group.items.values())
        .filter((item) => item.name && item.qty > 0)
        .sort((a, b) => {
          const orderA = toOrderValue(a.order)
          const orderB = toOrderValue(b.order)
          if (orderA !== orderB) {
            return orderA - orderB
          }

          return a.name.localeCompare(b.name)
        })

      return {
        id: group.id ?? group.name,
        name: group.name,
        order: group.order,
        items,
      }
    })
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
      const orderA = toOrderValue(a.order)
      const orderB = toOrderValue(b.order)
      if (orderA !== orderB) {
        return orderA - orderB
      }

      const isDefaultA = a.name === DEFAULT_GROUP_NAME
      const isDefaultB = b.name === DEFAULT_GROUP_NAME
      if (isDefaultA !== isDefaultB) {
        return isDefaultA ? 1 : -1
      }

      return a.name.localeCompare(b.name)
    })

  return sortedGroups
}

const deriveStatus = (isLoading, error, modifierGroups) => {
  if (isLoading && modifierGroups.length === 0 && !error) {
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

  if (!isLoading && !error && modifierGroups.length === 0) {
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
  const modifierGroups = useMemo(() => deriveModifiersFromOrders(orders), [orders])

  const status = useMemo(
    () => deriveStatus(isLoading, error, modifierGroups),
    [isLoading, error, modifierGroups],
  )

  return (
    <ModifierSidebarView
      modifierGroups={modifierGroups}
      selectionSummaryMessage={selectionSummaryMessage}
      status={status}
    />
  )
}

export { deriveModifiersFromOrders }

export default ModifierSidebarContainer
