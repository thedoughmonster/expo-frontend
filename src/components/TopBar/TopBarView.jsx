import React from 'react'
import FiltersSection from './FiltersSection'
import SelectionSection from './SelectionSection'
import ToolsSection from './ToolsSection'
import styles from './TopBarView.module.css'

const TopBarView = React.memo(
  ({
    title,
    filters,
    activeFilters,
    onToggleFilter,
    selectionCount,
    onClearSelection,
    isClearSelectionDisabled,
    onDismissSelection,
    isDismissSelectionDisabled,
    isBusy,
    onRefresh,
    refreshAriaLabel,
    onOpenSettings,
    isSettingsOpen,
  }) => (
    <header className={styles.topBar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        <FiltersSection filters={filters} activeFilters={activeFilters} onToggleFilter={onToggleFilter} />
        <SelectionSection
          selectionCount={selectionCount}
          onClearSelection={onClearSelection}
          isClearSelectionDisabled={isClearSelectionDisabled}
          onDismissSelection={onDismissSelection}
          isDismissSelectionDisabled={isDismissSelectionDisabled}
        />
        <ToolsSection
          isBusy={isBusy}
          onRefresh={onRefresh}
          refreshAriaLabel={refreshAriaLabel}
          onOpenSettings={onOpenSettings}
          isSettingsOpen={isSettingsOpen}
        />
      </div>
    </header>
  ),
)

export default TopBarView
