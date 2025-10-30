import React, { useCallback } from 'react'
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
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={refreshIconClassName}
            >
              <path d="M21 4V9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M21 12A9 9 0 1 1 9.515 3.308"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.settingsIcon}
            >
              <path
                d="M12 15.25C13.7949 15.25 15.25 13.7949 15.25 12C15.25 10.2051 13.7949 8.75 12 8.75C10.2051 8.75 8.75 10.2051 8.75 12C8.75 13.7949 10.2051 15.25 12 15.25Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15A1.65 1.65 0 0 0 20.24 13.1L21.24 11.3A1.5 1.5 0 0 0 20.7 9.33L18.91 8.33A1.65 1.65 0 0 0 17 7.49L16.62 5.5A1.5 1.5 0 0 0 15.13 4.3H12.87A1.5 1.5 0 0 0 11.38 5.5L11 7.49A1.65 1.65 0 0 0 9.09 8.33L7.3 9.33A1.5 1.5 0 0 0 6.76 11.3L7.76 13.1A1.65 1.65 0 0 0 8.6 15L8.24 17A1.5 1.5 0 0 0 9.74 18.2H12A1.65 1.65 0 0 0 13.91 19.04L14.29 21A1.5 1.5 0 0 0 15.78 22.2H18.04A1.5 1.5 0 0 0 19.54 21L19.92 19.04A1.65 1.65 0 0 0 21.83 18.2H24.09A1.5 1.5 0 0 0 25.59 17L25.97 15.04A1.65 1.65 0 0 0 27.88 14.2H30.14A1.5 1.5 0 0 0 31.64 13L32.02 11.04A1.65 1.65 0 0 0 33.93 10.2H36.19A1.5 1.5 0 0 0 37.69 9L38.07 7.04A1.65 1.65 0 0 0 39.98 6.2H42.24A1.5 1.5 0 0 0 43.74 5L44.12 3.04A1.65 1.65 0 0 0 46.03 2.2H48.29"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    )
  },
)

export default ToolsSection
