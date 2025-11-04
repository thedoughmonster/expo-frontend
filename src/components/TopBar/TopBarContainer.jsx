import { useCallback } from 'react'
import { FULFILLMENT_FILTERS } from '../../domain/status/fulfillmentFilters'
import {
  useDismissedOrders,
  useFulfillmentFilters,
  useSelectionState,
} from '../../viewContext/OrdersViewContext'
import { useSettingsModal } from '../SettingsModal/SettingsModalContext'
import TopBarView from './TopBarView'

const TopBarContainer = ({
  title,
  isBusy,
  onRefresh,
  refreshAriaLabel,
  canDismissSelectedOrders = false,
}) => {
  const { activeFulfillmentFilters, toggleFulfillmentFilter } = useFulfillmentFilters()
  const { activeOrderIds, clearSelection } = useSelectionState()
  const { dismissOrders } = useDismissedOrders()
  const { open: openSettings, isOpen: isSettingsOpen } = useSettingsModal()

  const selectionCount = activeOrderIds.size
  const isClearSelectionDisabled = selectionCount === 0

  const handleToggleFilter = useCallback(
    (key) => {
      toggleFulfillmentFilter(key)
    },
    [toggleFulfillmentFilter],
  )

  const handleClearSelection = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleRefresh = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  const handleOpenSettings = useCallback(() => {
    openSettings()
  }, [openSettings])

  const handleDismissSelection = useCallback(() => {
    if (activeOrderIds.size === 0) {
      return
    }

    dismissOrders(Array.from(activeOrderIds))
    clearSelection()
  }, [activeOrderIds, clearSelection, dismissOrders])

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
    />
  )
}

export default TopBarContainer
