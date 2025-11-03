import type { components, paths } from './types'

export type ToastOrder = components['schemas']['ToastOrder']
export type ToastCheck = components['schemas']['ToastCheck']
export type ToastSelection = components['schemas']['ToastSelection']
export type OrdersLatestSuccessFull = components['schemas']['OrdersLatestSuccessFull']
export type OrdersLatestSuccessIds = components['schemas']['OrdersLatestSuccessIds']
export type OrdersLatestSuccess = OrdersLatestSuccessFull | OrdersLatestSuccessIds
export type OrderByIdSuccess = components['schemas']['OrderByIdSuccess']
export type OrdersLatestQuery =
  paths['/api/orders']['get']['parameters']['query'] extends infer Query
    ? { [Key in keyof Query]?: Query[Key] | null | undefined }
    : Record<string, unknown>

const ORDERS_ENDPOINT = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isToastSelection = (value: unknown): value is ToastSelection => {
  if (!isObject(value)) {
    return false
  }

  const quantity = (value as Record<string, unknown>).quantity
  if (quantity !== undefined && typeof quantity !== 'number') {
    return false
  }

  const modifiers = (value as Record<string, unknown>).modifiers
  if (modifiers !== undefined && !Array.isArray(modifiers)) {
    return false
  }

  return true
}

const isToastCheck = (value: unknown): value is ToastCheck => {
  if (!isObject(value)) {
    return false
  }

  const selections = (value as Record<string, unknown>).selections
  if (!Array.isArray(selections)) {
    return false
  }

  return selections.every(isToastSelection)
}

const isToastOrder = (value: unknown): value is ToastOrder => {
  if (!isObject(value)) {
    return false
  }

  if (typeof (value as Record<string, unknown>).guid !== 'string') {
    return false
  }

  const checks = (value as Record<string, unknown>).checks
  if (!Array.isArray(checks)) {
    return false
  }

  return checks.every(isToastCheck)
}

const isOrdersSuccess = (value: unknown): value is OrdersLatestSuccess => {
  if (!isObject(value)) {
    return false
  }

  if ((value as Record<string, unknown>).ok !== true) {
    return false
  }

  const orders = (value as Record<string, unknown>).orders
  if (!Array.isArray(orders)) {
    return false
  }

  const detail = (value as Record<string, unknown>).detail
  if (detail === 'ids') {
    return orders.every((order) => typeof order === 'string')
  }

  if (detail !== undefined && detail !== 'full') {
    return false
  }

  if (!orders.every(isToastOrder)) {
    return false
  }

  const data = (value as Record<string, unknown>).data
  if (data !== undefined && data !== null) {
    if (!Array.isArray(data) || !data.every(isToastOrder)) {
      return false
    }
  }

  return true
}

const isOrderByIdSuccess = (value: unknown): value is OrderByIdSuccess => {
  if (!isObject(value)) {
    return false
  }

  if ((value as Record<string, unknown>).ok !== true) {
    return false
  }

  const order = (value as Record<string, unknown>).order
  if (!isToastOrder(order)) {
    return false
  }

  const guid = (value as Record<string, unknown>).guid
  if (typeof guid !== 'string' || guid !== order.guid) {
    return false
  }

  return true
}

const toQueryRecord = (query: OrdersLatestQuery = {}): Record<string, string> => {
  const params: Record<string, string> = {}

  Object.entries(query).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) {
      return
    }

    const value = rawValue as string | number | boolean
    if (typeof value === 'boolean') {
      params[key] = value ? 'true' : 'false'
      return
    }

    params[key] = String(value)
  })

  return params
}

export type FetchToastOrdersOptions = {
  signal?: AbortSignal
  query?: OrdersLatestQuery
}

export const fetchToastOrders = async (
  options: FetchToastOrdersOptions = {},
): Promise<OrdersLatestSuccess> => {
  const query = toQueryRecord(options.query)
  const url = new URL(ORDERS_ENDPOINT)

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString(), { signal: options.signal })

  if (!response.ok) {
    throw new Error(`Orders request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as unknown
  if (!isOrdersSuccess(payload)) {
    throw new Error('Unexpected orders payload shape')
  }

  return payload
}

export type FetchToastOrderByGuidOptions = {
  signal?: AbortSignal
}

export const fetchToastOrderByGuid = async (
  guid: string,
  options: FetchToastOrderByGuidOptions = {},
): Promise<ToastOrder | null> => {
  if (!guid || typeof guid !== 'string') {
    throw new Error('A valid order GUID is required')
  }

  const url = `${ORDERS_ENDPOINT}/${encodeURIComponent(guid)}`
  const response = await fetch(url, { signal: options.signal })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Order ${guid} request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as unknown
  if (!isOrderByIdSuccess(payload)) {
    throw new Error('Unexpected order payload shape')
  }

  return payload.order
}

export { ORDERS_ENDPOINT }
