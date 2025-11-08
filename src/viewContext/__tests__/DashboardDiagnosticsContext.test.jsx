import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { DashboardDiagnosticsProvider, useDashboardDiagnostics } from '../DashboardDiagnosticsContext'
import { OrdersViewProvider, useFulfillmentFilters, usePrepStationFilter } from '../OrdersViewContext'

const Wrapper = ({ children }) => (
  <DashboardDiagnosticsProvider>
    <OrdersViewProvider>{children}</OrdersViewProvider>
  </DashboardDiagnosticsProvider>
)

describe('DashboardDiagnosticsContext integrations', () => {
  let infoSpy

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('records filter toggles and prep-station selections', async () => {
    const { result } = renderHook(
      () => ({
        filters: useFulfillmentFilters(),
        prep: usePrepStationFilter(),
        diagnostics: useDashboardDiagnostics(),
      }),
      { wrapper: Wrapper },
    )

    await act(async () => {
      result.current.filters.toggleFulfillmentFilter('ready')
    })

    const filterEvent = result.current.diagnostics.timeline.find(
      (event) => event.type === 'orders.filters.toggle',
    )
    expect(filterEvent).toBeTruthy()
    expect(filterEvent?.payload).toMatchObject({ key: 'ready', isActive: false })
    expect(infoSpy).toHaveBeenCalledWith(
      '[DashboardDiagnostics]',
      expect.objectContaining({ type: 'orders.filters.toggle' }),
    )

    infoSpy.mockClear()

    await act(async () => {
      result.current.prep.selectPrepStation('prep-station-1')
    })

    const eventTypes = result.current.diagnostics.timeline.map((event) => event.type)
    expect(eventTypes).toContain('orders.prep-station.selected')

    const prepEvent = result.current.diagnostics.timeline.find(
      (event) => event.type === 'orders.prep-station.selected',
    )
    expect(prepEvent?.payload).toMatchObject({ prepStationId: 'prep-station-1' })
    expect(result.current.prep.activePrepStationId).toBe('prep-station-1')
    expect(infoSpy).toHaveBeenCalledWith(
      '[DashboardDiagnostics]',
      expect.objectContaining({ type: 'orders.prep-station.selected' }),
    )
  })
})
