import { useCallback, useEffect, useRef, useState } from 'react'
import {
  extractOrderGuid,
  extractOrdersFromPayload,
  normalizeOrders,
} from '../domain/orders/normalizeOrders'
import {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  extractUnfulfilledOrderGuids,
} from '../domain/menus/menuLookup'

const ORDERS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders'
const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

const useOrdersData = () => {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const isMountedRef = useRef(true)
  const activeControllerRef = useRef(null)

  const abortActiveRequest = useCallback(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort()
      activeControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      abortActiveRequest()
    }
  }, [abortActiveRequest])

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!isMountedRef.current) {
        return
      }

      abortActiveRequest()

      const controller = new AbortController()
      activeControllerRef.current = controller
      const { signal } = controller

      if (signal.aborted) {
        return
      }

      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
        setIsRefreshing(false)
      }

      setError(null)

      try {
        const configPromise = (async () => {
          try {
            const response = await fetch(CONFIG_SNAPSHOT_ENDPOINT, { signal })
            if (!response.ok) {
              return null
            }

            return await response.json()
          } catch (configError) {
            if (configError?.name === 'AbortError') {
              return null
            }

            return null
          }
        })()

        const [ordersResponse, menusResponse] = await Promise.all([
          fetch(ORDERS_ENDPOINT, { signal }),
          fetch(MENUS_ENDPOINT, { signal }),
        ])

        if (!ordersResponse.ok) {
          throw new Error(`Orders request failed with status ${ordersResponse.status}`)
        }

        if (!menusResponse.ok) {
          throw new Error(`Menus request failed with status ${menusResponse.status}`)
        }

        const [ordersPayload, menusPayload, configPayload] = await Promise.all([
          ordersResponse.json(),
          menusResponse.json(),
          configPromise,
        ])

        if (signal.aborted || !isMountedRef.current) {
          return
        }

        const rawOrders = extractOrdersFromPayload(ordersPayload)
        const menuLookup = buildMenuItemLookup(menusPayload)
        const diningOptionLookup = buildDiningOptionLookup(configPayload)
        const outstandingGuids = extractUnfulfilledOrderGuids(menusPayload)
        const filteredOrders =
          outstandingGuids.size > 0
            ? rawOrders.filter((order) => {
                const guid = extractOrderGuid(order)
                return guid ? outstandingGuids.has(guid) : false
              })
            : rawOrders

        const normalizedOrders = normalizeOrders(filteredOrders, menuLookup, diningOptionLookup)

        if (!isMountedRef.current || signal.aborted) {
          return
        }

        setOrders(normalizedOrders)
      } catch (fetchError) {
        if (fetchError?.name === 'AbortError' || !isMountedRef.current) {
          return
        }

        setError(fetchError)

        if (!silent) {
          setOrders([])
        }
      } finally {
        if (isMountedRef.current) {
          if (silent) {
            setIsRefreshing(false)
          } else {
            setIsLoading(false)
            setIsRefreshing(false)
          }
        }

        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null
        }
      }
    },
    [abortActiveRequest],
  )

  useEffect(() => {
    refresh({ silent: false })
  }, [refresh])

  return { orders, isLoading, isRefreshing, error, refresh }
}

export default useOrdersData
