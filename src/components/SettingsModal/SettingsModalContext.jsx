/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useDashboardDiagnostics } from '../../viewContext/DashboardDiagnosticsContext'

const SettingsModalContext = createContext(null)

export const SettingsModalProvider = ({ tabs = [], children }) => {
  const { recordDiagnostic } = useDashboardDiagnostics()
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
    const defaultTabId = tabs[0]?.id ?? null
    if (defaultTabId) {
      setActiveTabId(defaultTabId)
    }

    let didOpen = false
    setIsOpen((previous) => {
      if (previous) {
        return previous
      }

      didOpen = true
      return true
    })

    if (didOpen) {
      recordDiagnostic({
        type: 'settings.modal.opened',
        payload: {
          defaultTabId,
          tabCount: tabs.length,
        },
      })
    }
  }, [recordDiagnostic, tabs])

  const close = useCallback(() => {
    let didClose = false

    setIsOpen((previous) => {
      if (!previous) {
        return previous
      }

      didClose = true
      return false
    })

    if (didClose) {
      recordDiagnostic({ type: 'settings.modal.closed' })
    }
  }, [recordDiagnostic])

  const selectTab = useCallback(
    (tabId) => {
      if (!tabs.some((tab) => tab.id === tabId)) {
        return
      }

      let didChange = false

      setActiveTabId((previous) => {
        if (previous === tabId) {
          return previous
        }

        didChange = true
        return tabId
      })

      if (didChange) {
        recordDiagnostic({
          type: 'settings.modal.tab-selected',
          payload: {
            tabId,
          },
        })
      }
    },
    [recordDiagnostic, tabs],
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
