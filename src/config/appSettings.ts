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

type TimeUnit = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days'
type TimeTargetUnit = 'milliseconds' | 'minutes'

const TIME_UNIT_IN_MS: Record<TimeUnit, number> = {
  milliseconds: 1,
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const ensureSettingRecord = (entry: unknown, key: string): Record<string, unknown> => {
  if (!isRecord(entry)) {
    throw new Error(`App settings field "${key}" must be an object`)
  }

  return entry
}

const ensureDescription = (record: Record<string, unknown>, key: string): void => {
  const { description } = record
  if (typeof description !== 'string' || !description.trim()) {
    throw new Error(`App settings field "${key}" must include a non-empty description`)
  }
}

const readNumericValue = (record: Record<string, unknown>, key: string): number => {
  const { value } = record
  if (!isFiniteNumber(value)) {
    throw new Error(`App settings field "${key}" must supply a finite numeric value`)
  }

  return value
}

const parseNumericSetting = (entry: unknown, key: string): number => {
  const record = ensureSettingRecord(entry, key)
  ensureDescription(record, key)
  return readNumericValue(record, key)
}

const parseStringSetting = (entry: unknown, key: string): string => {
  const record = ensureSettingRecord(entry, key)
  ensureDescription(record, key)

  const { value } = record
  if (typeof value !== 'string' || !value) {
    throw new Error(`App settings field "${key}" must supply a non-empty string value`)
  }

  return value
}

const parseTimeSetting = (
  entry: unknown,
  key: string,
  targetUnit: TimeTargetUnit,
): number => {
  const record = ensureSettingRecord(entry, key)
  ensureDescription(record, key)

  const { unit } = record
  if (typeof unit !== 'string' || !(unit in TIME_UNIT_IN_MS)) {
    throw new Error(
      `App settings field "${key}" must declare a valid unit (milliseconds, seconds, minutes, hours, days)`,
    )
  }

  const numericValue = readNumericValue(record, key)
  const multiplier = TIME_UNIT_IN_MS[unit as TimeUnit]
  const valueInMs = numericValue * multiplier

  if (!Number.isFinite(valueInMs)) {
    throw new Error(`App settings field "${key}" resolves to an invalid time value`)
  }

  if (targetUnit === 'milliseconds') {
    return valueInMs
  }

  if (targetUnit === 'minutes') {
    return valueInMs / TIME_UNIT_IN_MS.minutes
  }

  throw new Error(`Unsupported target unit "${targetUnit}" for field "${key}"`)
}

const validateAppSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    throw new Error('App settings must be an object')
  }

  return {
    orderPollingWindowMinutes: parseTimeSetting(
      value.orderPollingWindowMinutes,
      'orderPollingWindowMinutes',
      'minutes',
    ),
    pollIntervalMs: parseTimeSetting(value.pollIntervalMs, 'pollIntervalMs', 'milliseconds'),
    pollLimit: parseNumericSetting(value.pollLimit, 'pollLimit'),
    driftBufferMs: parseTimeSetting(value.driftBufferMs, 'driftBufferMs', 'milliseconds'),
    staleActiveRetentionMs: parseTimeSetting(
      value.staleActiveRetentionMs,
      'staleActiveRetentionMs',
      'milliseconds',
    ),
    staleReadyRetentionMs: parseTimeSetting(
      value.staleReadyRetentionMs,
      'staleReadyRetentionMs',
      'milliseconds',
    ),
    targetedFetchConcurrency: parseNumericSetting(
      value.targetedFetchConcurrency,
      'targetedFetchConcurrency',
    ),
    targetedFetchMaxRetries: parseNumericSetting(
      value.targetedFetchMaxRetries,
      'targetedFetchMaxRetries',
    ),
    targetedFetchBackoffMs: parseTimeSetting(
      value.targetedFetchBackoffMs,
      'targetedFetchBackoffMs',
      'milliseconds',
    ),
    ordersEndpoint: parseStringSetting(value.ordersEndpoint, 'ordersEndpoint'),
    menusEndpoint: parseStringSetting(value.menusEndpoint, 'menusEndpoint'),
    configSnapshotEndpoint: parseStringSetting(
      value.configSnapshotEndpoint,
      'configSnapshotEndpoint',
    ),
  }
}

export const APP_SETTINGS: AppSettings = validateAppSettings(rawAppSettings)
