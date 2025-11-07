#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAPIResponseValidatorModule from 'openapi-response-validator'
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from 'undici'
import { promisify } from 'node:util'
import appSettings from '../src/config/appSettings.json' with { type: 'json' }

setGlobalDispatcher(
  new Agent({
    connect: { ipVersion: 4 },
  }),
)

const OPENAPI_DOC_URL =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/docs/openapi.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')
const FIXTURE_DIR = path.join(ROOT_DIR, 'fixtures', 'api')
const { default: OpenAPIResponseValidator } = OpenAPIResponseValidatorModule

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isoDateTimePattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:?\d{2})$/
const eightDigitDatePattern = /^\d{8}$/
const execFileAsync = promisify(execFile)

const padHex = (value) => value.toString(16).padStart(12, '0')

const isoPlaceholder = (index, suffix) => {
  const base = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0))
  const iso = new Date(base.getTime() + index * 60_000).toISOString()

  if (!suffix || suffix === 'Z') {
    return iso
  }

  const normalizedSuffix = suffix.includes(':')
    ? suffix
    : `${suffix.slice(0, 3)}:${suffix.slice(3)}`

  return iso.replace('Z', normalizedSuffix)
}

const createSanitizer = () => {
  const uuidMap = new Map()
  let uuidCounter = 0

  const isoMap = new Map()
  let isoCounter = 0

  const dateMap = new Map()
  let dateCounter = 0

  const sanitizeValue = (value) => {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue)
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, sanitizeValue(entry)]),
      )
    }

    if (typeof value !== 'string') {
      return value
    }

    if (uuidPattern.test(value)) {
      if (!uuidMap.has(value)) {
        uuidCounter += 1
        const sanitized = `00000000-0000-0000-0000-${padHex(uuidCounter)}`
        uuidMap.set(value, sanitized)
      }

      return uuidMap.get(value)
    }

    const isoMatch = value.match(isoDateTimePattern)
    if (isoMatch) {
      const suffix = isoMatch[2]
      if (!isoMap.has(value)) {
        isoMap.set(value, isoPlaceholder(isoCounter, suffix))
        isoCounter += 1
      }

      return isoMap.get(value)
    }

    if (eightDigitDatePattern.test(value)) {
      if (!dateMap.has(value)) {
        dateCounter += 1
        const placeholder = `2000${(dateCounter % 10000).toString().padStart(4, '0')}`
        dateMap.set(value, placeholder)
      }

      return dateMap.get(value)
    }

    return value
  }

  return sanitizeValue
}

const sanitizeJson = (payload) => {
  const sanitizeValue = createSanitizer()
  return sanitizeValue(payload)
}

const removeNullishDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => removeNullishDeep(entry))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== null && entry !== undefined)
        .map(([key, entry]) => [key, removeNullishDeep(entry)]),
    )
  }

  return value
}

const prepareForValidation = (pathKey, body) => {
  if (!body || typeof body !== 'object') {
    return body
  }

  if (pathKey === '/api/orders/{guid}' && body.order) {
    return {
      ...body,
      order: removeNullishDeep(body.order),
    }
  }

  if (pathKey === '/api/orders') {
    const prepared = { ...body }

    if (Array.isArray(prepared.orders) && prepared.detail === 'full') {
      prepared.orders = prepared.orders.map((order) => removeNullishDeep(order))
    }

    if (Array.isArray(prepared.data)) {
      prepared.data = prepared.data.map((order) => removeNullishDeep(order))
    }

    return prepared
  }

  if (pathKey === '/api/kitchen/prep-stations' && Array.isArray(body.prepStations)) {
    const prepared = {
      ...body,
      prepStations: body.prepStations.map((station) => removeNullishDeep(station)),
    }

    if ('raw' in prepared) {
      delete prepared.raw
    }

    return prepared
  }

  return body
}

const writeJsonFile = async (filePath, data) => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const fetchWithCurl = async (url) => {
  const args = [
    '-sSL',
    '-w',
    '\n%{http_code}',
    '-H',
    'user-agent: schema-verifier/1.0 (+https://github.com/thedoughmonster)',
    url,
  ]

  const { stdout } = await execFileAsync('curl', args, { maxBuffer: 10 * 1024 * 1024 })
  const trimmed = stdout.trimEnd()
  const lastNewlineIndex = trimmed.lastIndexOf('\n')
  if (lastNewlineIndex === -1) {
    throw new Error(`Curl did not return a status code for ${url}`)
  }

  const bodyText = trimmed.slice(0, lastNewlineIndex)
  const statusText = trimmed.slice(lastNewlineIndex + 1).trim()
  const status = Number.parseInt(statusText, 10)
  if (!Number.isFinite(status)) {
    throw new Error(`Unable to parse curl status code "${statusText}" for ${url}`)
  }

  let body = null
  const normalizedBody = bodyText.trim()
  if (normalizedBody) {
    try {
      body = JSON.parse(normalizedBody)
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${url}: ${(error)?.message ?? error}`)
    }
  }

  return { status, body }
}

const shouldRetryWithCurl = (error) => {
  if (!error) {
    return false
  }

  if (error.code === 'ENETUNREACH') {
    return true
  }

  if (error.cause && error.cause.code === 'ENETUNREACH') {
    return true
  }

  if (error.cause && Array.isArray(error.cause.errors)) {
    return error.cause.errors.some((inner) => inner?.code === 'ENETUNREACH')
  }

  return false
}

const fetchJson = async (url) => {
  try {
    const response = await undiciFetch(url, {
      headers: {
        'user-agent': 'schema-verifier/1.0 (+https://github.com/thedoughmonster)',
      },
    })

    const text = await response.text()
    let body

    try {
      body = text ? JSON.parse(text) : null
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${url}: ${(error)?.message ?? error}`)
    }

    return { status: response.status, body }
  } catch (error) {
    if (!shouldRetryWithCurl(error)) {
      throw error
    }

    console.warn(`Fetch failed for ${url} (${error?.code ?? error?.message}); retrying with curl…`)
    return fetchWithCurl(url)
  }
}

const validateResponse = (openApiDoc, pathKey, method, statusCode, body) => {
  const pathSpec = openApiDoc.paths?.[pathKey]
  if (!pathSpec) {
    throw new Error(`OpenAPI document is missing path definition for ${pathKey}`)
  }

  const methodSpec = pathSpec[method]
  if (!methodSpec) {
    throw new Error(`OpenAPI document is missing ${method.toUpperCase()} definition for ${pathKey}`)
  }

  const validator = new OpenAPIResponseValidator({
    responses: methodSpec.responses,
    components: openApiDoc.components,
  })

  const candidate = prepareForValidation(pathKey, structuredClone(body))
  const result = validator.validateResponse(statusCode, candidate)
  if (result) {
    const details = result.errors.map((error) => `${error.path}: ${error.message}`).join('\n')
    throw new Error(
      `Response from ${pathKey} did not satisfy the OpenAPI schema:\n${details}`,
    )
  }
}

const loadOpenApiDocument = async () => {
  const { status, body } = await fetchJson(OPENAPI_DOC_URL)
  if (status !== 200) {
    throw new Error(`Failed to download OpenAPI schema (status ${status})`)
  }

  return body
}

const captureOrdersLatest = async (openApiDoc) => {
  const url = new URL(appSettings.ordersEndpoint)
  url.searchParams.set('limit', String(appSettings.pollLimit))
  url.searchParams.set('detail', 'ids')
  url.searchParams.set('minutes', String(appSettings.orderPollingWindowMinutes))
  url.searchParams.set('timeZone', 'UTC')

  const { status, body } = await fetchJson(url.toString())

  validateResponse(openApiDoc, '/api/orders', 'get', status, body)

  await writeJsonFile(path.join(FIXTURE_DIR, 'orders-latest.json'), sanitizeJson(body))

  if (!body || !Array.isArray(body.orders) || body.orders.length === 0) {
    return undefined
  }

  const [firstOrder] = body.orders
  if (typeof firstOrder !== 'string' || !firstOrder) {
    return undefined
  }

  return firstOrder
}

const captureOrderByGuid = async (openApiDoc, guid) => {
  const url = `${appSettings.ordersEndpoint}/${encodeURIComponent(guid)}`
  const { status, body } = await fetchJson(url)

  validateResponse(openApiDoc, '/api/orders/{guid}', 'get', status, body)

  await writeJsonFile(path.join(FIXTURE_DIR, 'order-by-guid.json'), sanitizeJson(body))
}

const captureMenus = async (openApiDoc) => {
  const { status, body } = await fetchJson(appSettings.menusEndpoint)

  validateResponse(openApiDoc, '/api/menus', 'get', status, body)

  await writeJsonFile(path.join(FIXTURE_DIR, 'menus.json'), sanitizeJson(body))
}

const captureConfigSnapshot = async (openApiDoc) => {
  const { status, body } = await fetchJson(appSettings.configSnapshotEndpoint)

  validateResponse(openApiDoc, '/api/config/snapshot', 'get', status, body)

  await writeJsonFile(path.join(FIXTURE_DIR, 'config-snapshot.json'), sanitizeJson(body))
}

const captureKitchenPrepStations = async (openApiDoc) => {
  const endpoint = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/kitchen/prep-stations'
  const { status, body } = await fetchJson(endpoint)

  validateResponse(openApiDoc, '/api/kitchen/prep-stations', 'get', status, body)

  await writeJsonFile(
    path.join(FIXTURE_DIR, 'kitchen-prep-stations.json'),
    sanitizeJson(body),
  )
}

const main = async () => {
  console.log('Downloading OpenAPI document…')
  const openApiDoc = await loadOpenApiDocument()

  console.log('Capturing latest orders (detail=ids)…')
  const latestOrderGuid = await captureOrdersLatest(openApiDoc)

  if (latestOrderGuid) {
    console.log(`Capturing order ${latestOrderGuid}…`)
    await captureOrderByGuid(openApiDoc, latestOrderGuid)
  } else {
    console.warn('No orders were returned; skipping order-by-guid capture.')
  }

  console.log('Capturing menus…')
  await captureMenus(openApiDoc)

  console.log('Capturing config snapshot…')
  await captureConfigSnapshot(openApiDoc)

  console.log('Capturing kitchen prep stations…')
  await captureKitchenPrepStations(openApiDoc)

  console.log(`Fixtures written to ${path.relative(ROOT_DIR, FIXTURE_DIR)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
