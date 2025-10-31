import { useMemo } from 'react'
import { OrdersViewProvider } from './OrdersViewContext'
import { SettingsModalProvider } from '../components/SettingsModal/SettingsModalContext'
import KitchenSettingsTab from '../components/SettingsModal/KitchenSettingsTab'

const DASHBOARD_SETTINGS_TABS = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Choose which prep station to monitor in the dashboard order list.',
    render: () => <KitchenSettingsTab />,
  },
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
