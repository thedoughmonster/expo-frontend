import { memo } from 'react'
import styles from './DashboardLayout.module.css'

function DashboardLayout({ topBar, sidebar, ordersArea }) {
  return (
    <div className={styles.dashboard}>
      {topBar}
      <div className={styles.dashboardBody}>
        {sidebar}
        {ordersArea}
      </div>
    </div>
  )
}

DashboardLayout.displayName = 'DashboardLayout'

export default memo(DashboardLayout)
