import React, { useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRotateRight, faBug, faGear } from '@fortawesome/free-solid-svg-icons'
import styles from './ToolsSection.module.css'

const ToolsSection = React.memo(
  ({
    isBusy,
    onRefresh,
    refreshAriaLabel,
    onOpenSettings,
    isSettingsOpen,
    isDebugPanelEnabled,
    isDebugPanelOpen,
    onToggleDebugPanel,
  }) => {
    const handleRefresh = useCallback(() => {
      onRefresh?.()
    }, [onRefresh])

    const handleOpenSettings = useCallback(() => {
      onOpenSettings?.()
    }, [onOpenSettings])

    const handleToggleDebug = useCallback(() => {
      onToggleDebugPanel?.()
    }, [onToggleDebugPanel])

    const refreshIconClassName = isBusy
      ? `${styles.refreshIcon} ${styles.refreshIconRefreshing}`
      : styles.refreshIcon

    const debugButtonClassName = isDebugPanelOpen
      ? `${styles.debugButton} ${styles.debugButtonActive}`
      : styles.debugButton

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
          {isDebugPanelEnabled ? (
            <button
              type="button"
              className={debugButtonClassName}
              onClick={handleToggleDebug}
              aria-pressed={isDebugPanelOpen}
              title={isDebugPanelOpen ? 'Hide debug drawer' : 'Show debug drawer'}
            >
              <FontAwesomeIcon icon={faBug} className={styles.debugIcon} aria-hidden="true" />
              <span className="sr-only">
                {isDebugPanelOpen ? 'Hide the orders debug drawer' : 'Show the orders debug drawer'}
              </span>
            </button>
          ) : null}
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
