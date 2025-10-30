import { Children, isValidElement, memo } from 'react'
import styles from './DashboardLayout.module.css'

const TopBarSlot = ({ children }) => children
TopBarSlot.displayName = 'DashboardLayoutTopBar'

const SidebarSlot = ({ children }) => children
SidebarSlot.displayName = 'DashboardLayoutSidebar'

const MainSlot = ({ children }) => children
MainSlot.displayName = 'DashboardLayoutMain'

function DashboardLayout({ children }) {
  const slots = {
    topBar: null,
    sidebar: null,
    main: null,
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }

    if (child.type === TopBarSlot) {
      slots.topBar = child.props?.children ?? null
      return
    }

    if (child.type === SidebarSlot) {
      slots.sidebar = child.props?.children ?? null
      return
    }

    if (child.type === MainSlot) {
      slots.main = child.props?.children ?? null
    }
  })

  return (
    <div className={styles.dashboard}>
      {slots.topBar}
      <div className={styles.dashboardBody}>
        {slots.sidebar}
        {slots.main}
      </div>
    </div>
  )
}

DashboardLayout.displayName = 'DashboardLayout'

const MemoizedDashboardLayout = memo(DashboardLayout)

MemoizedDashboardLayout.TopBar = TopBarSlot
MemoizedDashboardLayout.Sidebar = SidebarSlot
MemoizedDashboardLayout.Main = MainSlot

export default MemoizedDashboardLayout
