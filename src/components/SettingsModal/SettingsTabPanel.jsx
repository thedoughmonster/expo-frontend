import { memo } from 'react'
import styles from './SettingsTabPanel.module.css'

const SettingsTabPanel = memo(({ tab }) => {
  if (!tab) {
    return null
  }

  return (
    <div
      className={styles.settingsTabPanel}
      role="tabpanel"
      id={`settings-tabpanel-${tab.id}`}
      aria-labelledby={`settings-tab-${tab.id}`}
    >
      <p className={styles.description}>{tab.description}</p>
      <ul className={styles.placeholderList}>
        <li>Placeholder option A</li>
        <li>Placeholder option B</li>
        <li>Placeholder option C</li>
      </ul>
    </div>
  )
})

SettingsTabPanel.displayName = 'SettingsTabPanel'

export default SettingsTabPanel
