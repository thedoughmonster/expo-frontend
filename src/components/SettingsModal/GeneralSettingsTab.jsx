import { useCallback } from 'react'
import { useOrdersDebugPanel } from '../../viewContext/OrdersViewContext'
import styles from './GeneralSettingsTab.module.css'

const GeneralSettingsTab = () => {
  const { isDebugPanelEnabled, isDebugPanelOpen, setDebugPanelEnabled } = useOrdersDebugPanel()

  const handleToggleChange = useCallback(
    (event) => {
      setDebugPanelEnabled(event.target.checked)
    },
    [setDebugPanelEnabled],
  )

  return (
    <div className={styles.container}>
      <label className={styles.card} htmlFor="general-debug-toggle">
        <input
          id="general-debug-toggle"
          type="checkbox"
          className={styles.toggle}
          checked={isDebugPanelEnabled}
          onChange={handleToggleChange}
        />
        <div className={styles.content}>
          <p className={styles.title}>Enable debug drawer</p>
          <p className={styles.description}>
            Surface advanced debugging controls in the dashboard toolbar to help investigate order data
            issues without impacting day-to-day workflows.
          </p>
          <p className={styles.helper}>
            When enabled, use the bug icon in the top bar to open the debug drawer with normalized orders,
            menu payloads, and config snapshots.
          </p>
          {isDebugPanelEnabled ? (
            <p className={styles.notice}>
              {isDebugPanelOpen
                ? 'The debug drawer is currently open.'
                : 'The debug drawer toggle now appears in the dashboard toolbar.'}
            </p>
          ) : null}
        </div>
      </label>
    </div>
  )
}

export default GeneralSettingsTab
