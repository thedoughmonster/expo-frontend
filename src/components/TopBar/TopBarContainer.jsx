import { useCallback } from 'react'
import { FULFILLMENT_FILTERS } from '../../domain/status/fulfillmentFilters'
import {
  useDismissedOrders,
  useFulfillmentFilters,
  useOrdersDebugPanel,
  useSelectionState,
} from '../../viewContext/OrdersViewContext'
import { useSettingsModal } from '../SettingsModal/SettingsModalContext'
import TopBarView from './TopBarView'
import { useDashboardDiagnostics } from '../../viewContext/DashboardDiagnosticsContext'

const TopBarContainer = ({
  title,
  isBusy,
  onRefresh,
  refreshAriaLabel,
  canDismissSelectedOrders = false,
}) => {
  const { recordDiagnostic } = useDashboardDiagnostics()
  const { activeFulfillmentFilters, toggleFulfillmentFilter } = useFulfillmentFilters()
  const { activeOrderIds, clearSelection } = useSelectionState()
  const { dismissOrders } = useDismissedOrders()
  const { open: openSettings, isOpen: isSettingsOpen } = useSettingsModal()
  const { isDebugPanelEnabled, isDebugPanelOpen, toggleDebugPanel } = useOrdersDebugPanel()

  const selectionCount = activeOrderIds.size
  const isClearSelectionDisabled = selectionCount === 0

  const handleToggleFilter = useCallback(
    (key) => {
      recordDiagnostic({
        type: 'ui.top-bar.filter-toggled',
        payload: {
          key,
        },
      })
      toggleFulfillmentFilter(key)
    },
    [recordDiagnostic, toggleFulfillmentFilter],
  )

  const handleClearSelection = useCallback(() => {
    recordDiagnostic({
      type: 'ui.top-bar.selection-cleared',
      payload: {
        clearedCount: activeOrderIds.size,
      },
    })
    clearSelection()
  }, [activeOrderIds.size, clearSelection, recordDiagnostic])

  const handleRefresh = useCallback(() => {
    recordDiagnostic({
      type: 'ui.top-bar.refresh-clicked',
      payload: {
        isBusy,
      },
    })
    onRefresh?.()
  }, [isBusy, onRefresh, recordDiagnostic])

  const handleOpenSettings = useCallback(() => {
    recordDiagnostic({ type: 'ui.top-bar.settings-opened' })
    openSettings()
  }, [openSettings, recordDiagnostic])

  const handleDismissSelection = useCallback(() => {
    if (activeOrderIds.size === 0) {
      return
    }

    recordDiagnostic({
      type: 'ui.top-bar.selection-dismissed',
      payload: {
        dismissedIds: Array.from(activeOrderIds),
      },
    })
    dismissOrders(Array.from(activeOrderIds))
    clearSelection()
  }, [activeOrderIds, clearSelection, dismissOrders, recordDiagnostic])

  const handleToggleDebugPanel = useCallback(() => {
    recordDiagnostic({
      type: 'ui.top-bar.debug-toggle',
      payload: {
        isEnabled: isDebugPanelEnabled,
        isOpen: isDebugPanelOpen,
      },
    })
    toggleDebugPanel()
  }, [isDebugPanelEnabled, isDebugPanelOpen, recordDiagnostic, toggleDebugPanel])

  return (
    <TopBarView
      title={title}
      filters={FULFILLMENT_FILTERS}
      activeFilters={activeFulfillmentFilters}
      onToggleFilter={handleToggleFilter}
      selectionCount={selectionCount}
      onClearSelection={handleClearSelection}
      isClearSelectionDisabled={isClearSelectionDisabled}
      onDismissSelection={handleDismissSelection}
      isDismissSelectionDisabled={!canDismissSelectedOrders}
      isBusy={isBusy}
      onRefresh={handleRefresh}
      refreshAriaLabel={refreshAriaLabel}
      onOpenSettings={handleOpenSettings}
      isSettingsOpen={isSettingsOpen}
      isDebugPanelEnabled={isDebugPanelEnabled}
      isDebugPanelOpen={isDebugPanelOpen}
      onToggleDebugPanel={handleToggleDebugPanel}
    />
  )
}

export default TopBarContainer
