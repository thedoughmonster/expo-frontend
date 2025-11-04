import { useMemo } from 'react'
import ModifierSidebarView from './ModifierSidebarView'
import deriveModifiersFromOrders from './deriveModifiersFromOrders'

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

export default ModifierSidebarContainer
