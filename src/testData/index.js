import ordersLatest from './orders-latest.json'
import menusLatest from './menus-latest.json'
import configSnapshot from './config-snapshot.json'

export const SAVED_API_ENDPOINTS = {
  orders: 'https://doughmonster-worker.thedoughmonster.workers.dev/api/orders',
  menus: 'https://doughmonster-worker.thedoughmonster.workers.dev/api/menus',
  configSnapshot:
    'https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot',
}

export const SAVED_API_RESPONSES = {
  [SAVED_API_ENDPOINTS.orders]: ordersLatest,
  [SAVED_API_ENDPOINTS.menus]: menusLatest,
  [SAVED_API_ENDPOINTS.configSnapshot]: configSnapshot,
}

export const hasSavedResponseForUrl = (url) =>
  typeof url === 'string' && url in SAVED_API_RESPONSES

export const getSavedResponseForUrl = (url) => {
  if (!hasSavedResponseForUrl(url)) {
    return null
  }

  return SAVED_API_RESPONSES[url]
}
