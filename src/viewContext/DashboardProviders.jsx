import { useMemo } from 'react'
import { OrdersViewProvider } from './OrdersViewContext'
import { DashboardDiagnosticsProvider } from './DashboardDiagnosticsContext'
import { SettingsModalProvider } from '../components/SettingsModal/SettingsModalContext'
import KitchenSettingsTab from '../components/SettingsModal/KitchenSettingsTab'
import GeneralSettingsTab from '../components/SettingsModal/GeneralSettingsTab'

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
    render: () => <GeneralSettingsTab />,
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
    <DashboardDiagnosticsProvider>
      <OrdersViewProvider>
        <SettingsModalProvider tabs={settingsTabs}>{children}</SettingsModalProvider>
      </OrdersViewProvider>
    </DashboardDiagnosticsProvider>
  )
}

export default DashboardProviders
