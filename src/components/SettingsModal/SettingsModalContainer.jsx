import { useCallback, useMemo } from 'react'
import SettingsModalView from './SettingsModalView'
import { useSettingsModal } from './SettingsModalContext'

const SettingsModalContainer = ({ title }) => {
  const { tabs, isOpen, activeTabId, selectTab, close } = useSettingsModal()

  const activeTab = useMemo(() => {
    if (!tabs || tabs.length === 0) {
      return null
    }

    return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  }, [tabs, activeTabId])

  const handleSelectTab = useCallback(
    (tabId) => {
      selectTab(tabId)
    },
    [selectTab],
  )

  const handleClose = useCallback(() => {
    close()
  }, [close])

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        close()
      }
    },
    [close],
  )

  if (!isOpen) {
    return null
  }

  return (
    <SettingsModalView
      title={title}
      tabs={tabs}
      activeTabId={activeTabId}
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onClose={handleClose}
      onBackdropClick={handleBackdropClick}
    />
  )
}

export default SettingsModalContainer
