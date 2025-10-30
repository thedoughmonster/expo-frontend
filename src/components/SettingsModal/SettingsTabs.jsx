import { memo } from 'react'
import SettingsTab from './SettingsTab'
import styles from './SettingsTabs.module.css'

const SettingsTabs = memo(({ tabs, activeTabId, onSelectTab }) => {
  if (!tabs || tabs.length === 0) {
    return null
  }

  return (
    <div className={styles.settingsTabs} role="tablist" aria-label="Settings tabs">
      {tabs.map((tab) => (
        <SettingsTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} onSelect={onSelectTab} />
      ))}
    </div>
  )
})

SettingsTabs.displayName = 'SettingsTabs'

export default SettingsTabs
