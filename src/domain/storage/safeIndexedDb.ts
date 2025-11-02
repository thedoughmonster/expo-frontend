import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval'

const inMemoryStore = new Map<string, unknown>()

const hasIndexedDb = (): boolean => {
  if (typeof indexedDB === 'undefined') {
    return false
  }

  try {
    const name = '__expo_frontend_indexdb_test__'
    const request = indexedDB.open(name)
    request.onerror = () => {
      request.result?.close?.()
    }
    request.onsuccess = () => {
      request.result.close()
      indexedDB.deleteDatabase(name)
    }
  } catch {
    return false
  }

  return true
}

const useIndexedDb = hasIndexedDb()

export const safeGet = async <T>(key: string): Promise<T | undefined> => {
  if (useIndexedDb) {
    try {
      return (await idbGet(key)) as T | undefined
    } catch {
      // fall through to in-memory store on failure
    }
  }

  return inMemoryStore.get(key) as T | undefined
}

export const safeSet = async <T>(key: string, value: T): Promise<void> => {
  if (useIndexedDb) {
    try {
      await idbSet(key, value)
      inMemoryStore.set(key, value)
      return
    } catch {
      // fall back to in-memory store
    }
  }

  inMemoryStore.set(key, value)
}

export const safeDelete = async (key: string): Promise<void> => {
  if (useIndexedDb) {
    try {
      await idbDel(key)
    } catch {
      // swallow and continue to memory store cleanup
    }
  }

  inMemoryStore.delete(key)
}
