/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FULFILLMENT_FILTERS } from '../domain/status/fulfillmentFilters'
import { useDashboardDiagnostics } from './DashboardDiagnosticsContext'

const OrdersViewContext = createContext(null)

const useOrdersViewContext = () => {
  const context = useContext(OrdersViewContext)

  if (!context) {
    throw new Error('useOrdersViewContext must be used within an OrdersViewProvider')
  }

  return context
}

export function OrdersViewProvider({ children }) {
  const { recordDiagnostic } = useDashboardDiagnostics()
  const [activeFulfillmentFilters, setActiveFulfillmentFilters] = useState(
    () => new Set(FULFILLMENT_FILTERS.map(({ key }) => key)),
  )
  const [activeOrderIds, setActiveOrderIds] = useState(() => new Set())
  const [activePrepStationId, setActivePrepStationId] = useState(null)
  const [dismissedOrderIds, setDismissedOrderIds] = useState(() => new Set())
  const [isDebugPanelEnabled, setIsDebugPanelEnabled] = useState(false)
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false)

  const toggleFulfillmentFilter = useCallback(
    (key) => {
      const normalizedKey = typeof key === 'string' ? key.trim() : ''
      if (!normalizedKey) {
        return
      }

      let change = null
      let nextFilters = null

      setActiveFulfillmentFilters((previous) => {
        const next = new Set(previous)

        if (next.has(normalizedKey)) {
          next.delete(normalizedKey)
          change = { state: 'deactivated', isActive: false }
        } else {
          next.add(normalizedKey)
          change = { state: 'activated', isActive: true }
        }

        if (!change) {
          return previous
        }

        nextFilters = next
        return next
      })

      if (change && nextFilters) {
        recordDiagnostic({
          type: 'orders.filters.toggle',
          payload: {
            key: normalizedKey,
            action: change.state,
            isActive: change.isActive,
            activeCount: nextFilters.size,
            activeKeys: Array.from(nextFilters),
          },
        })
      }
    },
    [recordDiagnostic],
  )

  const toggleOrderActive = useCallback(
    (orderId) => {
      const normalizedId = typeof orderId === 'string' ? orderId.trim() : ''
      if (!normalizedId) {
        return
      }

      let isActive = false
      let activeCount = 0

      setActiveOrderIds((previous) => {
        const next = new Set(previous)

        if (next.has(normalizedId)) {
          next.delete(normalizedId)
          isActive = false
        } else {
          next.add(normalizedId)
          isActive = true
        }

        activeCount = next.size

        return next
      })

      recordDiagnostic({
        type: 'orders.selection.toggle',
        payload: {
          orderId: normalizedId,
          isActive,
          activeCount,
        },
      })
    },
    [recordDiagnostic],
  )

  const clearSelection = useCallback(() => {
    let clearedCount = 0

    setActiveOrderIds((previous) => {
      if (previous.size === 0) {
        return previous
      }

      clearedCount = previous.size
      return new Set()
    })

    if (clearedCount > 0) {
      recordDiagnostic({
        type: 'orders.selection.cleared',
        payload: {
          clearedCount,
        },
      })
    }
  }, [recordDiagnostic])

  const dismissOrders = useCallback(
    (orderIds) => {
      if (!orderIds || (Array.isArray(orderIds) && orderIds.length === 0)) {
        return
      }

      const ids = Array.isArray(orderIds) ? orderIds : Array.from(orderIds ?? [])
      const normalized = ids
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0)

      if (normalized.length === 0) {
        return
      }

      let added = []
      let totalDismissed = 0

      setDismissedOrderIds((previous) => {
        const next = new Set(previous)

        normalized.forEach((id) => {
          if (!next.has(id)) {
            next.add(id)
            added.push(id)
          }
        })

        if (added.length === 0) {
          return previous
        }

        totalDismissed = next.size
        return next
      })

      if (added.length > 0) {
        recordDiagnostic({
          type: 'orders.dismissed',
          payload: {
            orderIds: added,
            addedCount: added.length,
            totalDismissed,
          },
        })
      }
    },
    [recordDiagnostic],
  )

  const restoreOrders = useCallback(
    (orderIds) => {
      if (!orderIds || (Array.isArray(orderIds) && orderIds.length === 0)) {
        return
      }

      const ids = Array.isArray(orderIds) ? orderIds : Array.from(orderIds ?? [])
      const normalized = ids
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0)

      if (normalized.length === 0) {
        return
      }

      let restored = []
      let remaining = 0

      setDismissedOrderIds((previous) => {
        const next = new Set(previous)

        normalized.forEach((id) => {
          if (next.has(id)) {
            next.delete(id)
            restored.push(id)
          }
        })

        if (restored.length === 0) {
          return previous
        }

        remaining = next.size
        return next
      })

      if (restored.length > 0) {
        recordDiagnostic({
          type: 'orders.restored',
          payload: {
            orderIds: restored,
            restoredCount: restored.length,
            remainingDismissed: remaining,
          },
        })
      }
    },
    [recordDiagnostic],
  )

  const selectPrepStation = useCallback(
    (prepStationId) => {
      const normalized = typeof prepStationId === 'string' ? prepStationId.trim() : null
      setActivePrepStationId((previous) => {
        const nextId = normalized ?? null
        if (nextId === previous) {
          return previous
        }

        return nextId
      })

      const nextId = normalized ?? null
      if (activePrepStationId !== nextId) {
        recordDiagnostic({
          type: 'orders.prep-station.selected',
          payload: {
            prepStationId: normalized,
          },
        })
      }
    },
    [activePrepStationId, recordDiagnostic],
  )

  const clearPrepStation = useCallback(() => {
    let wasCleared = false

    setActivePrepStationId((previous) => {
      if (previous === null) {
        return previous
      }

      wasCleared = true
      return null
    })

    if (wasCleared) {
      recordDiagnostic({
        type: 'orders.prep-station.cleared',
      })
    }
  }, [recordDiagnostic])

  const setDebugPanelEnabled = useCallback(
    (enabled) => {
      let didChange = false

      setIsDebugPanelEnabled((previous) => {
        if (previous === enabled) {
          return previous
        }

        didChange = true

        if (!enabled) {
          setIsDebugPanelOpen(false)
        }

        return enabled
      })

      if (didChange) {
        recordDiagnostic({
          type: 'orders.debug-panel.enabled',
          payload: {
            isEnabled: Boolean(enabled),
          },
        })
      }
    },
    [recordDiagnostic],
  )

  const openDebugPanel = useCallback(() => {
    if (!isDebugPanelEnabled) {
      return
    }

    let didOpen = false

    setIsDebugPanelOpen((previous) => {
      if (previous) {
        return previous
      }

      didOpen = true
      return true
    })

    if (didOpen) {
      recordDiagnostic({
        type: 'orders.debug-panel.opened',
      })
    }
  }, [isDebugPanelEnabled, recordDiagnostic])

  const closeDebugPanel = useCallback(() => {
    let didClose = false

    setIsDebugPanelOpen((previous) => {
      if (!previous) {
        return previous
      }

      didClose = true
      return false
    })

    if (didClose) {
      recordDiagnostic({
        type: 'orders.debug-panel.closed',
      })
    }
  }, [recordDiagnostic])

  const toggleDebugPanel = useCallback(() => {
    let nextState = false

    setIsDebugPanelOpen((previous) => {
      if (!isDebugPanelEnabled) {
        nextState = false
        return false
      }

      nextState = !previous
      return nextState
    })

    recordDiagnostic({
      type: 'orders.debug-panel.toggled',
      payload: {
        isEnabled: isDebugPanelEnabled,
        isOpen: nextState,
      },
    })
  }, [isDebugPanelEnabled, recordDiagnostic])

  const value = useMemo(
    () => ({
      activeFulfillmentFilters,
      toggleFulfillmentFilter,
      activeOrderIds,
      toggleOrderActive,
      clearSelection,
      activePrepStationId,
      selectPrepStation,
      clearPrepStation,
      dismissedOrderIds,
      dismissOrders,
      restoreOrders,
      isDebugPanelEnabled,
      isDebugPanelOpen,
      setDebugPanelEnabled,
      openDebugPanel,
      closeDebugPanel,
      toggleDebugPanel,
    }),
    [
      activeFulfillmentFilters,
      toggleFulfillmentFilter,
      activeOrderIds,
      toggleOrderActive,
      clearSelection,
      activePrepStationId,
      selectPrepStation,
      clearPrepStation,
      dismissedOrderIds,
      dismissOrders,
      restoreOrders,
      isDebugPanelEnabled,
      isDebugPanelOpen,
      setDebugPanelEnabled,
      closeDebugPanel,
      openDebugPanel,
      toggleDebugPanel,
    ],
  )

  return <OrdersViewContext.Provider value={value}>{children}</OrdersViewContext.Provider>
}

export function useFulfillmentFilters() {
  const { activeFulfillmentFilters, toggleFulfillmentFilter } = useOrdersViewContext()

  return useMemo(
    () => ({ activeFulfillmentFilters, toggleFulfillmentFilter }),
    [activeFulfillmentFilters, toggleFulfillmentFilter],
  )
}

export function useSelectionState() {
  const { activeOrderIds, toggleOrderActive, clearSelection } = useOrdersViewContext()

  return useMemo(
    () => ({ activeOrderIds, toggleOrderActive, clearSelection }),
    [activeOrderIds, toggleOrderActive, clearSelection],
  )
}

export function usePrepStationFilter() {
  const { activePrepStationId, selectPrepStation, clearPrepStation } = useOrdersViewContext()

  return useMemo(
    () => ({ activePrepStationId, selectPrepStation, clearPrepStation }),
    [activePrepStationId, selectPrepStation, clearPrepStation],
  )
}

export function useDismissedOrders() {
  const { dismissedOrderIds, dismissOrders, restoreOrders } = useOrdersViewContext()

  return useMemo(
    () => ({ dismissedOrderIds, dismissOrders, restoreOrders }),
    [dismissedOrderIds, dismissOrders, restoreOrders],
  )
}

export function useOrdersDebugPanel() {
  const {
    isDebugPanelEnabled,
    isDebugPanelOpen,
    setDebugPanelEnabled,
    openDebugPanel,
    closeDebugPanel,
    toggleDebugPanel,
  } = useOrdersViewContext()

  return useMemo(
    () => ({
      isDebugPanelEnabled,
      isDebugPanelOpen,
      setDebugPanelEnabled,
      openDebugPanel,
      closeDebugPanel,
      toggleDebugPanel,
    }),
    [
      closeDebugPanel,
      isDebugPanelEnabled,
      isDebugPanelOpen,
      openDebugPanel,
      setDebugPanelEnabled,
      toggleDebugPanel,
    ],
  )
}
