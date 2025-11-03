import rawAppSettings from './appSettings.json' assert { type: 'json' }

export type AppSettings = {
  orderPollingWindowMinutes: number
  pollIntervalMs: number
  pollLimit: number
  driftBufferMs: number
  staleActiveRetentionMs: number
  staleReadyRetentionMs: number
  targetedFetchConcurrency: number
  targetedFetchMaxRetries: number
  targetedFetchBackoffMs: number
  ordersEndpoint: string
  menusEndpoint: string
  configSnapshotEndpoint: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const validateAppSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    throw new Error('App settings must be an object')
  }

  const {
    orderPollingWindowMinutes,
    pollIntervalMs,
    pollLimit,
    driftBufferMs,
    staleActiveRetentionMs,
    staleReadyRetentionMs,
    targetedFetchConcurrency,
    targetedFetchMaxRetries,
    targetedFetchBackoffMs,
    ordersEndpoint,
    menusEndpoint,
    configSnapshotEndpoint,
  } = value

  const numericEntries: Array<[string, unknown]> = [
    ['orderPollingWindowMinutes', orderPollingWindowMinutes],
    ['pollIntervalMs', pollIntervalMs],
    ['pollLimit', pollLimit],
    ['driftBufferMs', driftBufferMs],
    ['staleActiveRetentionMs', staleActiveRetentionMs],
    ['staleReadyRetentionMs', staleReadyRetentionMs],
    ['targetedFetchConcurrency', targetedFetchConcurrency],
    ['targetedFetchMaxRetries', targetedFetchMaxRetries],
    ['targetedFetchBackoffMs', targetedFetchBackoffMs],
  ]

  numericEntries.forEach(([key, entry]) => {
    if (!isFiniteNumber(entry)) {
      throw new Error(`App settings field "${key}" must be a finite number`)
    }
  })

  const stringEntries: Array<[string, unknown]> = [
    ['ordersEndpoint', ordersEndpoint],
    ['menusEndpoint', menusEndpoint],
    ['configSnapshotEndpoint', configSnapshotEndpoint],
  ]

  stringEntries.forEach(([key, entry]) => {
    if (typeof entry !== 'string' || !entry) {
      throw new Error(`App settings field "${key}" must be a non-empty string`)
    }
  })

  return {
    orderPollingWindowMinutes: orderPollingWindowMinutes as number,
    pollIntervalMs: pollIntervalMs as number,
    pollLimit: pollLimit as number,
    driftBufferMs: driftBufferMs as number,
    staleActiveRetentionMs: staleActiveRetentionMs as number,
    staleReadyRetentionMs: staleReadyRetentionMs as number,
    targetedFetchConcurrency: targetedFetchConcurrency as number,
    targetedFetchMaxRetries: targetedFetchMaxRetries as number,
    targetedFetchBackoffMs: targetedFetchBackoffMs as number,
    ordersEndpoint: ordersEndpoint as string,
    menusEndpoint: menusEndpoint as string,
    configSnapshotEndpoint: configSnapshotEndpoint as string,
  }
}

export const APP_SETTINGS: AppSettings = validateAppSettings(rawAppSettings)
