import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import DashboardLayout from '../DashboardLayout'
import { TopBarContainer } from '../TopBar'
import ModifierSidebarContainer from '../ModifierSidebar/ModifierSidebarContainer'
import OrdersAreaContainer from '../OrdersArea/OrdersAreaContainer'
import SettingsModalContainer from '../SettingsModal/SettingsModalContainer'
import DashboardProviders from '../../viewContext/DashboardProviders'
import { useSettingsModal } from '../SettingsModal/SettingsModalContext'

describe('Dashboard UI components', () => {
  it('renders DashboardLayout slots', () => {
    const { container } = render(
      <DashboardLayout>
        <DashboardLayout.TopBar>
          <div>Top area</div>
        </DashboardLayout.TopBar>
        <DashboardLayout.Sidebar>
          <div>Sidebar area</div>
        </DashboardLayout.Sidebar>
        <DashboardLayout.Main>
          <div>Main area</div>
        </DashboardLayout.Main>
      </DashboardLayout>,
    )

    expect(container.textContent).toContain('Top area')
    expect(container.textContent).toContain('Sidebar area')
    expect(container.textContent).toContain('Main area')
  })

  it('renders TopBarContainer with providers', () => {
    render(
      <DashboardProviders>
        <TopBarContainer
          title="Orders"
          isBusy={false}
          onRefresh={vi.fn()}
          refreshAriaLabel="Refresh orders"
        />
      </DashboardProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Orders' })).toBeTruthy()
  })

  it('renders ModifierSidebarContainer', () => {
    render(
      <ModifierSidebarContainer
        orders={[]}
        isLoading={false}
        error={null}
        selectionSummaryMessage="No selection"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Modifiers' })).toBeTruthy()
    expect(screen.getByText('No selection')).toBeTruthy()
  })

  it('renders OrdersAreaContainer empty state', () => {
    render(
      <OrdersAreaContainer
        orders={[]}
        visibleOrders={[]}
        isLoading={false}
        isHydrating={false}
        error={null}
        emptyStateMessage="Nothing to show"
        activeOrderIds={new Set()}
        toggleOrderActive={vi.fn()}
      />, 
    )

    expect(screen.getByText('Nothing to show')).toBeTruthy()
  })

  it('renders SettingsModalContainer when opened', async () => {
    const OpenSettings = () => {
      const { open } = useSettingsModal()

      useEffect(() => {
        open()
      }, [open])

      return null
    }

    render(
      <DashboardProviders>
        <SettingsModalContainer title="Dashboard Settings" />
        <OpenSettings />
      </DashboardProviders>,
    )

    expect(await screen.findByRole('dialog', { name: 'Dashboard Settings' })).toBeTruthy()
  })
})
