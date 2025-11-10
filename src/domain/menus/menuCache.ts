import stableStringify from '../../utils/stableStringify'

export type MenuCacheSnapshot = {
  payload: unknown
  fetchedAt: string
  expiresAt?: string
  signature: string
}

const isExpired = (snapshot: MenuCacheSnapshot | undefined, now = Date.now()): boolean => {
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

export const prepareMenuCacheSnapshot = (
  payload: unknown,
  ttlMs?: number,
  now = Date.now(),
): MenuCacheSnapshot => {
  const fetchedAt = new Date(now).toISOString()
  const expiresAt = ttlMs && Number.isFinite(ttlMs) ? new Date(now + ttlMs).toISOString() : undefined

  return {
    payload,
    fetchedAt,
    expiresAt,
    signature: stableStringify(payload ?? null),
  }
}

export const menuCacheIsFresh = (
  snapshot: MenuCacheSnapshot | undefined,
  now = Date.now(),
): snapshot is MenuCacheSnapshot => {
  if (!snapshot) {
    return false
  }

  return !isExpired(snapshot, now)
}
