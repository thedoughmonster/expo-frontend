import { memo, useCallback } from 'react'
import styles from './SettingsTab.module.css'

const SettingsTab = memo(({ tab, isActive, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect?.(tab.id)
  }, [onSelect, tab.id])

  const className = isActive ? `${styles.settingsTab} ${styles.settingsTabActive}` : styles.settingsTab

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`settings-tabpanel-${tab.id}`}
      id={`settings-tab-${tab.id}`}
      className={className}
      onClick={handleClick}
      data-active={isActive}
    >
      {tab.label}
    </button>
  )
})

SettingsTab.displayName = 'SettingsTab'

export default SettingsTab
