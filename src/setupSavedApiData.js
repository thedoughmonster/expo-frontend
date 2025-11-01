import { getSavedResponseForUrl, hasSavedResponseForUrl } from './testData/index.js'

const shouldUseSavedData = import.meta.env.VITE_USE_SAVED_API_DATA === 'true'

const buildJsonResponse = (payload) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })

if (shouldUseSavedData && typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init = {}) => {
    const request =
      typeof Request !== 'undefined' && input instanceof Request ? input : null
    const url =
      request?.url ??
      (typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : null)
    const signal = request?.signal ?? init.signal

    if (signal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError')
    }

    if (hasSavedResponseForUrl(url)) {
      const savedPayload = getSavedResponseForUrl(url)
      return buildJsonResponse(savedPayload)
    }

    return originalFetch(input, init)
  }
}
