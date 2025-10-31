import type { components } from './types'

export type ToastOrder = components['schemas']['ToastOrder']
export type ToastCheck = components['schemas']['ToastCheck']
export type ToastSelection = components['schemas']['ToastSelection']
export type OrdersLatestSuccessFull = components['schemas']['OrdersLatestSuccessFull']

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

const isOrdersSuccessFull = (value: unknown): value is OrdersLatestSuccessFull => {
  if (!isObject(value)) {
    return false
  }

  if ((value as Record<string, unknown>).ok !== true) {
    return false
  }

  const orders = (value as Record<string, unknown>).orders
  if (!Array.isArray(orders) || !orders.every(isToastOrder)) {
    return false
  }

  const detail = (value as Record<string, unknown>).detail
  if (detail && detail !== 'full') {
    return false
  }

  const data = (value as Record<string, unknown>).data
  if (data !== undefined && (!Array.isArray(data) || !data.every(isToastOrder))) {
    return false
  }

  return true
}

export type FetchToastOrdersOptions = {
  signal?: AbortSignal
}

export const fetchToastOrders = async (
  options: FetchToastOrdersOptions = {},
): Promise<ToastOrder[]> => {
  const response = await fetch(ORDERS_ENDPOINT, { signal: options.signal })

  if (!response.ok) {
    throw new Error(`Orders request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as unknown
  if (!isOrdersSuccessFull(payload)) {
    throw new Error('Unexpected orders payload shape')
  }

  const { orders, data } = payload
  if (Array.isArray(data) && data.length > 0) {
    return data
  }

  return orders
}

export { ORDERS_ENDPOINT }
