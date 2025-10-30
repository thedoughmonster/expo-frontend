import { useCallback } from 'react'
import { FULFILLMENT_FILTERS } from '../../domain/status/fulfillmentFilters'
import { useFulfillmentFilters, useSelectionState } from '../../viewContext/OrdersViewContext'
import TopBarView from './TopBarView'

const TopBarContainer = ({
  title,
  isBusy,
  isSettingsOpen,
  onOpenSettings,
  onRefresh,
  refreshAriaLabel,
}) => {
  const { activeFulfillmentFilters, toggleFulfillmentFilter } = useFulfillmentFilters()
  const { activeOrderIds, clearSelection } = useSelectionState()

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
    onOpenSettings?.()
  }, [onOpenSettings])

  return (
    <TopBarView
      title={title}
      filters={FULFILLMENT_FILTERS}
      activeFilters={activeFulfillmentFilters}
      onToggleFilter={handleToggleFilter}
      selectionCount={selectionCount}
      onClearSelection={handleClearSelection}
      isClearSelectionDisabled={isClearSelectionDisabled}
      isBusy={isBusy}
      onRefresh={handleRefresh}
      refreshAriaLabel={refreshAriaLabel}
      onOpenSettings={handleOpenSettings}
      isSettingsOpen={isSettingsOpen}
    />
  )
}

export default TopBarContainer
