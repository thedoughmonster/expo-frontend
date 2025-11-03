import stableStringify from '../../utils/stableStringify'
import { safeDelete, safeGet, safeSet } from '../storage/safeIndexedDb'

const CONFIG_CACHE_KEY = 'config-cache-v1'

export type ConfigCacheSnapshot = {
  payload: unknown
  fetchedAt: string
  expiresAt?: string
  signature: string
}

const isExpired = (snapshot: ConfigCacheSnapshot | undefined, now = Date.now()): boolean => {
  if (!snapshot) {
    return true
  }

  if (!snapshot.expiresAt) {
    return false
  }

  const expiresAt = Date.parse(snapshot.expiresAt)
  if (Number.isNaN(expiresAt)) {
    return false
  }

  return expiresAt <= now
}

export const loadConfigCache = async (): Promise<ConfigCacheSnapshot | undefined> => {
  const snapshot = await safeGet<ConfigCacheSnapshot>(CONFIG_CACHE_KEY)
  return snapshot ?? undefined
}

export const saveConfigCache = async (snapshot: ConfigCacheSnapshot): Promise<void> => {
  await safeSet(CONFIG_CACHE_KEY, snapshot)
}

export const clearConfigCache = async (): Promise<void> => {
  await safeDelete(CONFIG_CACHE_KEY)
}

export const prepareConfigCacheSnapshot = (
  payload: unknown,
  ttlMs?: number,
  now = Date.now(),
): ConfigCacheSnapshot => {
  const fetchedAt = new Date(now).toISOString()
  const expiresAt = ttlMs && Number.isFinite(ttlMs) ? new Date(now + ttlMs).toISOString() : undefined

  return {
    payload,
    fetchedAt,
    expiresAt,
    signature: stableStringify(payload ?? null),
  }
}

export const configCacheIsFresh = (
  snapshot: ConfigCacheSnapshot | undefined,
  now = Date.now(),
): snapshot is ConfigCacheSnapshot => {
  if (!snapshot) {
    return false
  }

  return !isExpired(snapshot, now)
}
