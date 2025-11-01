import { useCallback, useEffect, useRef, useState } from 'react'
import { extractOrderGuid, normalizeOrders } from '../domain/orders/normalizeOrders'
import { createSampleOrders } from '../domain/orders/sampleOrders'
import {
  buildDiningOptionLookup,
  buildMenuItemLookup,
  buildModifierMetadataLookup,
  extractUnfulfilledOrderGuids,
} from '../domain/menus/menuLookup'
import { fetchToastOrders } from '../api/orders'

const MENUS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus'
const CONFIG_SNAPSHOT_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot'

const isAutomationEnvironment = () => {
  if (typeof window !== 'undefined' && window.__USE_SAMPLE_ORDERS__ === true) {
    return true
  }

  if (typeof navigator !== 'undefined' && navigator.webdriver === true) {
    return true
  }

  return false
}

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

      if (isAutomationEnvironment()) {
        setOrders(createSampleOrders())

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

        return
      }

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

        const [toastOrders, menusResponse] = await Promise.all([
          fetchToastOrders({ signal }),
          fetch(MENUS_ENDPOINT, { signal }),
        ])

        if (!menusResponse.ok) {
          throw new Error(`Menus request failed with status ${menusResponse.status}`)
        }

        const [menusPayload, configPayload] = await Promise.all([
          menusResponse.json(),
          configPromise,
        ])

        if (signal.aborted || !isMountedRef.current) {
          return
        }

        const menuLookup = buildMenuItemLookup(menusPayload)
        const modifierMetadataLookup = buildModifierMetadataLookup(menusPayload)
        const diningOptionLookup = buildDiningOptionLookup(configPayload)
        const outstandingGuids = extractUnfulfilledOrderGuids(menusPayload)
        const filteredOrders =
          outstandingGuids.size > 0
            ? toastOrders.filter((order) => {
                const guid = extractOrderGuid(order)
                return guid ? outstandingGuids.has(guid) : false
              })
            : toastOrders

        const normalizedOrders = normalizeOrders(
          filteredOrders,
          menuLookup,
          diningOptionLookup,
          modifierMetadataLookup,
        )

        const shouldInjectSampleOrders =
          normalizedOrders.length === 0 && isAutomationEnvironment()

        const nextOrders = shouldInjectSampleOrders ? createSampleOrders() : normalizedOrders

        if (!isMountedRef.current || signal.aborted) {
          return
        }

        setOrders(nextOrders)
      } catch (fetchError) {
        if (fetchError?.name === 'AbortError' || !isMountedRef.current) {
          return
        }

        setError(fetchError)

        if (isAutomationEnvironment()) {
          setOrders(createSampleOrders())
        } else if (!silent) {
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
