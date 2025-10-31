import React, { useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRotateRight, faGear } from '@fortawesome/free-solid-svg-icons'
import styles from './ToolsSection.module.css'

const ToolsSection = React.memo(
  ({ isBusy, onRefresh, refreshAriaLabel, onOpenSettings, isSettingsOpen }) => {
    const handleRefresh = useCallback(() => {
      onRefresh?.()
    }, [onRefresh])

    const handleOpenSettings = useCallback(() => {
      onOpenSettings?.()
    }, [onOpenSettings])

    const refreshIconClassName = isBusy
      ? `${styles.refreshIcon} ${styles.refreshIconRefreshing}`
      : styles.refreshIcon

    return (
      <div className={styles.section}>
        <p className={styles.label}>Dashboard tools</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={isBusy}
            aria-busy={isBusy}
            title="Refresh orders"
          >
            <FontAwesomeIcon
              icon={faArrowRotateRight}
              className={refreshIconClassName}
              aria-hidden="true"
            />
            <span className="sr-only">{refreshAriaLabel}</span>
          </button>
          <button
            type="button"
            className={styles.settingsButton}
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            onClick={handleOpenSettings}
            title="Open settings"
          >
            <span className="sr-only">Open settings</span>
            <FontAwesomeIcon
              icon={faGear}
              className={styles.settingsIcon}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    )
  },
)

export default ToolsSection
