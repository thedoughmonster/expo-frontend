import { useMemo } from 'react'
import { OrdersViewProvider } from './OrdersViewContext'
import { SettingsModalProvider } from '../components/SettingsModal/SettingsModalContext'

const DASHBOARD_SETTINGS_TABS = [
  {
    id: 'general',
    label: 'General',
    description:
      'Adjust overall dashboard behavior, appearance, and defaults once settings become available.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description:
      'Configure notification channels and delivery preferences here when the feature is ready.',
  },
]

const DashboardProviders = ({ children }) => {
  const settingsTabs = useMemo(() => DASHBOARD_SETTINGS_TABS, [])

  return (
    <OrdersViewProvider>
      <SettingsModalProvider tabs={settingsTabs}>{children}</SettingsModalProvider>
    </OrdersViewProvider>
  )
}

export default DashboardProviders
export { DASHBOARD_SETTINGS_TABS }
