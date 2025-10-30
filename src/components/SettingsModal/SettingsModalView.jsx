import { memo } from 'react'
import SettingsTabs from './SettingsTabs'
import SettingsTabPanel from './SettingsTabPanel'
import styles from './SettingsModalView.module.css'

const SettingsModalView = memo(({ title, tabs, activeTabId, activeTab, onSelectTab, onClose, onBackdropClick }) => (
  <div className={styles.modalBackdrop} role="presentation" onClick={onBackdropClick}>
    <div
      className={styles.settingsModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.header}>
        <h2 id="settings-modal-title" className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close settings">
          ×
        </button>
      </div>
      <div className={styles.body}>
        <SettingsTabs tabs={tabs} activeTabId={activeTabId} onSelectTab={onSelectTab} />
        <SettingsTabPanel tab={activeTab} />
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.primaryButton} disabled>
          Save Changes
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  </div>
))

SettingsModalView.displayName = 'SettingsModalView'

export default SettingsModalView
