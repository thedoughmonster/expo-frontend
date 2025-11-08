import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const DashboardDiagnosticsContext = createContext(null)

const DEFAULT_LOGGER = {
  info: (...args) => console.info(...args),
  error: (...args) => console.error(...args),
}

const LOG_PREFIX = '[DashboardDiagnostics]'

const normalizeEvent = (event, sequence, timestamp) => {
  if (!event || typeof event !== 'object') {
    return {
      id: `${timestamp}-${sequence}`,
      type: 'diagnostic/invalid-event',
      level: 'error',
      timestamp,
      payload: { received: event },
    }
  }

  const level = event.level ?? (event.error ? 'error' : 'info')
  const normalizedTimestamp = event.timestamp ?? timestamp

  return {
    ...event,
    id: event.id ?? `${normalizedTimestamp}-${sequence}`,
    level,
    timestamp: normalizedTimestamp,
    sequence,
  }
}

export const DashboardDiagnosticsProvider = ({ children, logger = DEFAULT_LOGGER }) => {
  const [timeline, setTimeline] = useState([])
  const [lastErrorEvent, setLastErrorEvent] = useState(null)
  const counterRef = useRef(0)
  const loggerRef = useRef(logger)

  loggerRef.current = logger

  const recordDiagnostic = useCallback((event) => {
    counterRef.current += 1
    const sequence = counterRef.current
    const timestamp = new Date().toISOString()
    const entry = normalizeEvent(event, sequence, timestamp)

    if (entry.clearLastError) {
      setLastErrorEvent(null)
    }

    const logArgs = [LOG_PREFIX, entry]
    if (entry.level === 'error') {
      loggerRef.current.error(...logArgs)
    } else {
      loggerRef.current.info(...logArgs)
    }

    setLastErrorEvent((previous) => {
      if (entry.clearLastError) {
        return null
      }

      if (entry.trackLastError ?? entry.level === 'error') {
        return entry
      }

      return previous
    })

    setTimeline((previous) => [...previous, entry])

    return entry
  }, [])

  const clearLastError = useCallback(() => {
    setLastErrorEvent(null)
  }, [])

  const value = useMemo(
    () => ({
      timeline,
      lastErrorEvent,
      recordDiagnostic,
      clearLastError,
    }),
    [timeline, lastErrorEvent, recordDiagnostic, clearLastError],
  )

  return (
    <DashboardDiagnosticsContext.Provider value={value}>
      {children}
    </DashboardDiagnosticsContext.Provider>
  )
}

export const useDashboardDiagnostics = () => {
  const context = useContext(DashboardDiagnosticsContext)
  if (!context) {
    throw new Error('useDashboardDiagnostics must be used within a DashboardDiagnosticsProvider')
  }

  return context
}

export default DashboardDiagnosticsContext
