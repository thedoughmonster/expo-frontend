/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SettingsModalContext = createContext(null)

export const SettingsModalProvider = ({ tabs = [], children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? null)

  useEffect(() => {
    if (tabs.length === 0) {
      setActiveTabId(null)
      return
    }

    const hasActiveTab = tabs.some((tab) => tab.id === activeTabId)
    if (!hasActiveTab) {
      setActiveTabId(tabs[0].id)
    }
  }, [tabs, activeTabId])

  const open = useCallback(() => {
    if (tabs[0]) {
      setActiveTabId(tabs[0].id)
    }

    setIsOpen(true)
  }, [tabs])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const selectTab = useCallback(
    (tabId) => {
      if (!tabs.some((tab) => tab.id === tabId)) {
        return
      }

      setActiveTabId(tabId)
    },
    [tabs],
  )

  const value = useMemo(
    () => ({
      tabs,
      isOpen,
      activeTabId,
      open,
      close,
      selectTab,
    }),
    [tabs, isOpen, activeTabId, open, close, selectTab],
  )

  return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>
}

export function useSettingsModal() {
  const context = useContext(SettingsModalContext)

  if (!context) {
    throw new Error('useSettingsModal must be used within a SettingsModalProvider')
  }

  return context
}
