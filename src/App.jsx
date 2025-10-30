import DashboardLayout from './components/DashboardLayout'
import OrdersAreaContainer from './components/OrdersArea/OrdersAreaContainer'
import ModifierSidebarContainer from './components/ModifierSidebar/ModifierSidebarContainer'
import { TopBarContainer } from './components/TopBar'
import SettingsModalContainer from './components/SettingsModal/SettingsModalContainer'
import useDashboardView from './hooks/useDashboardView'
import DashboardProviders from './viewContext/DashboardProviders'

function DashboardView() {
  const { topBarProps, sidebarProps, ordersAreaProps, settingsModalTitle } = useDashboardView()

  return (
    <>
      <DashboardLayout>
        <DashboardLayout.TopBar>
          <TopBarContainer {...topBarProps} />
        </DashboardLayout.TopBar>
        <DashboardLayout.Sidebar>
          <ModifierSidebarContainer {...sidebarProps} />
        </DashboardLayout.Sidebar>
        <DashboardLayout.Main>
          <OrdersAreaContainer {...ordersAreaProps} />
        </DashboardLayout.Main>
      </DashboardLayout>
      <SettingsModalContainer title={settingsModalTitle} />
    </>
  )
}

function App() {
  return (
    <DashboardProviders>
      <DashboardView />
    </DashboardProviders>
  )
}

export default App
