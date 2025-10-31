import React, { useCallback } from 'react'
import styles from './ToolsSection.module.css'

const RefreshIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4.5 12a7.5 7.5 0 0 1 12.546-5.303L21 10.5M21 10.5V6m0 4.5h-4.5M19.5 12a7.5 7.5 0 0 1-12.546 5.303L3 13.5M3 13.5V18m0-4.5h4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SettingsIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.28c.063.378.325.693.68.86l1.18.54c.508.233.707.847.45 1.326l-.6 1.104c-.18.33-.131.738.123 1.01l.907.908c.39.39.44 1.004.122 1.45l-.814 1.085a1.125 1.125 0 0 1-1.274.37l-1.2-.48a1.125 1.125 0 0 0-1.17.27l-.894.894a1.125 1.125 0 0 1-1.59 0l-.894-.894a1.125 1.125 0 0 0-1.17-.27l-1.2.48a1.125 1.125 0 0 1-1.274-.37l-.814-1.085a1.125 1.125 0 0 1 .122-1.45l.907-.907a1.125 1.125 0 0 0 .21-1.29l-.6-1.105a1.125 1.125 0 0 1 .45-1.325l1.18-.541a1.125 1.125 0 0 0 .68-.86l.213-1.28Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

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
            <RefreshIcon className={refreshIconClassName} />
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
            <SettingsIcon className={styles.settingsIcon} />
          </button>
        </div>
      </div>
    )
  },
)

export default ToolsSection
