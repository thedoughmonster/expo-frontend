import React, { useCallback } from 'react'
import styles from './SelectionSection.module.css'

const SelectionSection = React.memo(({ selectionCount, onClearSelection, isClearSelectionDisabled }) => {
  const handleClearSelection = useCallback(() => {
    onClearSelection()
  }, [onClearSelection])

  return (
    <div className={styles.section}>
      <p className={styles.label}>Order selection</p>
      <div className={`${styles.controls} ${styles.selection}`} role="group" aria-label="Order selection actions">
        <span className={styles.selectionCount} aria-live="polite">
          {selectionCount} selected
        </span>
        <button
          type="button"
          className={styles.clearSelectionButton}
          onClick={handleClearSelection}
          disabled={isClearSelectionDisabled}
          title="Clear selected orders"
        >
          Clear selections
        </button>
      </div>
    </div>
  )
})

export default SelectionSection
