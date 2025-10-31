import type { components } from './types'

export type ToastPrepStation = components['schemas']['ToastPrepStation']
export type KitchenPrepStationsSuccess = components['schemas']['KitchenPrepStationsSuccess']

const KITCHEN_PREP_STATIONS_ENDPOINT =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/kitchen/prep-stations'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isToastPrepStation = (value: unknown): value is ToastPrepStation => {
  if (!isObject(value)) {
    return false
  }

  return typeof value.guid === 'string'
}

const isKitchenPrepStationsSuccess = (
  value: unknown,
): value is KitchenPrepStationsSuccess => {
  if (!isObject(value)) {
    return false
  }

  if (value.ok !== true) {
    return false
  }

  if (value.route !== '/api/kitchen/prep-stations') {
    return false
  }

  if (!Array.isArray(value.prepStations)) {
    return false
  }

  return value.prepStations.every(isToastPrepStation)
}

export type FetchKitchenPrepStationsOptions = {
  signal?: AbortSignal
  lastModified?: string
}

export const fetchKitchenPrepStations = async (
  options: FetchKitchenPrepStationsOptions = {},
): Promise<ToastPrepStation[]> => {
  const stations: ToastPrepStation[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(KITCHEN_PREP_STATIONS_ENDPOINT)

    if (options.lastModified) {
      url.searchParams.set('lastModified', options.lastModified)
    }

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), { signal: options.signal })

    if (!response.ok) {
      throw new Error(`Kitchen prep stations request failed with status ${response.status}`)
    }

    const payload = (await response.json()) as unknown
    if (!isKitchenPrepStationsSuccess(payload)) {
      throw new Error('Unexpected kitchen prep stations payload shape')
    }

    stations.push(...payload.prepStations)

    if (typeof payload.nextPageToken === 'string' && payload.nextPageToken.trim()) {
      pageToken = payload.nextPageToken.trim()
    } else {
      pageToken = undefined
    }
  } while (pageToken)

  return stations
}

export { KITCHEN_PREP_STATIONS_ENDPOINT }
