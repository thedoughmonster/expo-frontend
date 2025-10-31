import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FULFILLMENT_FILTERS } from '../domain/status/fulfillmentFilters'

const OrdersViewContext = createContext(null)

const useOrdersViewContext = () => {
  const context = useContext(OrdersViewContext)

  if (!context) {
    throw new Error('useOrdersViewContext must be used within an OrdersViewProvider')
  }

  return context
}

export function OrdersViewProvider({ children }) {
  const [activeFulfillmentFilters, setActiveFulfillmentFilters] = useState(
    () => new Set(FULFILLMENT_FILTERS.map(({ key }) => key)),
  )
  const [activeOrderIds, setActiveOrderIds] = useState(() => new Set())
  const [activePrepStationId, setActivePrepStationId] = useState(null)

  const toggleFulfillmentFilter = useCallback((key) => {
    setActiveFulfillmentFilters((previous) => {
      const next = new Set(previous)

      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      return next
    })
  }, [])

  const toggleOrderActive = useCallback((orderId) => {
    setActiveOrderIds((previous) => {
      const next = new Set(previous)

      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }

      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setActiveOrderIds((previous) => {
      if (previous.size === 0) {
        return previous
      }

      return new Set()
    })
  }, [])

  const selectPrepStation = useCallback(
    (prepStationId) => {
      setActivePrepStationId((previous) => {
        if (prepStationId === previous) {
          return previous
        }

        return prepStationId ?? null
      })
    },
    [setActivePrepStationId],
  )

  const clearPrepStation = useCallback(() => {
    setActivePrepStationId((previous) => {
      if (previous === null) {
        return previous
      }

      return null
    })
  }, [setActivePrepStationId])

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
    ],
  )

  return <OrdersViewContext.Provider value={value}>{children}</OrdersViewContext.Provider>
}

export const useFulfillmentFilters = () => {
  const { activeFulfillmentFilters, toggleFulfillmentFilter } = useOrdersViewContext()

  return useMemo(
    () => ({ activeFulfillmentFilters, toggleFulfillmentFilter }),
    [activeFulfillmentFilters, toggleFulfillmentFilter],
  )
}

export const useSelectionState = () => {
  const { activeOrderIds, toggleOrderActive, clearSelection } = useOrdersViewContext()

  return useMemo(
    () => ({ activeOrderIds, toggleOrderActive, clearSelection }),
    [activeOrderIds, toggleOrderActive, clearSelection],
  )
}

export const usePrepStationFilter = () => {
  const { activePrepStationId, selectPrepStation, clearPrepStation } = useOrdersViewContext()

  return useMemo(
    () => ({ activePrepStationId, selectPrepStation, clearPrepStation }),
    [activePrepStationId, selectPrepStation, clearPrepStation],
  )
}
