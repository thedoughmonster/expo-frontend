import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchKitchenPrepStations } from '../../api/kitchen'
import { usePrepStationFilter } from '../../viewContext/OrdersViewContext'
import styles from './KitchenSettingsTab.module.css'

const formatStationLabel = (station) => station?.name?.trim() || station?.guid || 'Unnamed station'

const KitchenSettingsTab = () => {
  const { activePrepStationId, selectPrepStation, clearPrepStation } = usePrepStationFilter()
  const [stations, setStations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const activeControllerRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (activeControllerRef.current) {
        activeControllerRef.current.abort()
        activeControllerRef.current = null
      }
    }
  }, [])

  const loadStations = useCallback(async () => {
    if (!isMountedRef.current) {
      return
    }

    if (activeControllerRef.current) {
      activeControllerRef.current.abort()
    }

    const controller = new AbortController()
    activeControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchKitchenPrepStations({ signal: controller.signal })
      if (!isMountedRef.current) {
        return
      }

      setStations(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError' || !isMountedRef.current) {
        return
      }

      setError(fetchError instanceof Error ? fetchError : new Error('Failed to load prep stations'))
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }

      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    loadStations()
  }, [loadStations])

  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => {
      const aLabel = formatStationLabel(a)
      const bLabel = formatStationLabel(b)

      return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' })
    })
  }, [stations])

  const selectedStation = useMemo(
    () => sortedStations.find((station) => station.guid === activePrepStationId) ?? null,
    [sortedStations, activePrepStationId],
  )

  const summaryMessage = useMemo(() => {
    if (!activePrepStationId) {
      return 'Orders from every prep station are currently visible.'
    }

    if (selectedStation) {
      return `Filtering orders for the "${formatStationLabel(selectedStation)}" prep station.`
    }

    return 'The selected prep station is not present in the current list.'
  }, [activePrepStationId, selectedStation])

  const handleSelectChange = useCallback(
    (event) => {
      const { value } = event.target

      if (!value) {
        clearPrepStation()
        return
      }

      selectPrepStation(value)
    },
    [clearPrepStation, selectPrepStation],
  )

  const handleRetry = useCallback(() => {
    loadStations()
  }, [loadStations])

  const errorMessage = error?.message ?? 'Unable to fetch prep stations.'
  const totalStations = sortedStations.length
  const hasStations = totalStations > 0
  const connectedCount = selectedStation?.connectedPrepStations?.length ?? 0
  const printerGuid = selectedStation?.kitchenPrinter?.guid

  return (
    <div className={styles.container}>
      <div className={styles.controlGroup}>
        <label className={styles.label} htmlFor="kitchen-prep-station">
          Prep station
        </label>
        <select
          id="kitchen-prep-station"
          className={styles.select}
          value={activePrepStationId ?? ''}
          onChange={handleSelectChange}
          disabled={isLoading && !hasStations}
        >
          <option value="">All prep stations</option>
          {sortedStations.map((station) => (
            <option key={station.guid} value={station.guid}>
              {formatStationLabel(station)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.statusRow}>
        <span>
          {isLoading
            ? 'Loading prep stations…'
            : `Loaded ${totalStations} prep station${totalStations === 1 ? '' : 's'}.`}
        </span>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={handleRetry}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Reload list'}
        </button>
      </div>

      <p className={styles.helperText}>{summaryMessage}</p>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {activePrepStationId && !selectedStation ? (
        <div className={styles.noticeBox} role="status">
          <p>The previously selected prep station could not be found in the latest response.</p>
        </div>
      ) : null}

      {selectedStation ? (
        <dl className={styles.detailsList}>
          <div>
            <dt>Toast GUID</dt>
            <dd>
              <code>{selectedStation.guid}</code>
            </dd>
          </div>
          <div>
            <dt>Connected stations</dt>
            <dd>{connectedCount > 0 ? connectedCount : 'None'}</dd>
          </div>
          <div>
            <dt>Expo routing</dt>
            <dd>{selectedStation.expoRouting ?? 'Default'}</dd>
          </div>
          <div>
            <dt>Printer routing</dt>
            <dd>{selectedStation.printingMode ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt>Expediter</dt>
            <dd>{selectedStation.includeWithExpediter ? 'Included' : 'Not included'}</dd>
          </div>
          <div>
            <dt>Kitchen printer</dt>
            <dd>{printerGuid ? <code>{printerGuid}</code> : 'Unassigned'}</dd>
          </div>
        </dl>
      ) : hasStations ? (
        <ul className={styles.stationList}>
          {sortedStations.map((station) => (
            <li key={station.guid}>
              <span className={styles.stationName}>{formatStationLabel(station)}</span>
              <span className={styles.stationGuid}>{station.guid}</span>
            </li>
          ))}
        </ul>
      ) : !isLoading ? (
        <p className={styles.emptyMessage}>No prep stations were returned by the worker.</p>
      ) : null}
    </div>
  )
}

export default KitchenSettingsTab
