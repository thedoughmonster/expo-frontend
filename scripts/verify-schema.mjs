#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAPIResponseValidatorModule from 'openapi-response-validator'
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from 'undici'
import { promisify } from 'node:util'
import rawAppSettings from '../src/config/appSettings.json' with { type: 'json' }

const TIME_UNIT_IN_MS = {
  milliseconds: 1,
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
}

const isRecord = (value) => Boolean(value) && typeof value === 'object'

const ensureSettingRecord = (entry, key) => {
  if (!isRecord(entry)) {
    throw new Error(`App settings field "${key}" must be an object`)
  }

  return entry
}

const ensureDescription = (record, key) => {
  const { description } = record
  if (typeof description !== 'string' || !description.trim()) {
    throw new Error(`App settings field "${key}" must include a non-empty description`)
  }
}

const readNumericValue = (record, key) => {
  const { value } = record
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`App settings field "${key}" must supply a finite numeric value`)
  }

  return value
}

const parseNumericSetting = (entry, key) => {
  const record = ensureSettingRecord(entry, key)
  ensureDescription(record, key)
  return readNumericValue(record, key)
}

const parseStringSetting = (entry, key) => {
  const record = ensureSettingRecord(entry, key)
  ensureDescription(record, key)

  const { value } = record
  if (typeof value !== 'string' || !value) {
    throw new Error(`App settings field "${key}" must supply a non-empty string value`)
  }

  return value
}

const parseTimeSetting = (entry, key, targetUnit) => {
  const record = ensureSettingRecord(entry, key)
  ensureDescription(record, key)

  const { unit } = record
  if (typeof unit !== 'string' || !(unit in TIME_UNIT_IN_MS)) {
    throw new Error(
      `App settings field "${key}" must declare a valid unit (milliseconds, seconds, minutes, hours, days)`,
    )
  }

  const numericValue = readNumericValue(record, key)
  const multiplier = TIME_UNIT_IN_MS[unit]
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

const normalizeAppSettings = (value) => {
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

const appSettings = normalizeAppSettings(rawAppSettings)

setGlobalDispatcher(
  new Agent({
    connect: { ipVersion: 4 },
  }),
)

const OPENAPI_DOC_URL =
  'https://doughmonster-worker.thedoughmonster.workers.dev/api/docs/openapi.json'

const MODES = {
  VERIFY: 'verify',
  RECORD: 'record',
}

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

const mergeSanitizedPayloads = (target, source) => {
  if (target === undefined) {
    return source
  }

  if (source === undefined) {
    return target
  }

  if (target === null) {
    return source
  }

  if (source === null) {
    return target
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    const result = []
    const seen = new Set()

    const append = (entry) => {
      const key = JSON.stringify(entry)
      if (seen.has(key)) {
        return
      }

      seen.add(key)
      result.push(entry)
    }

    target.forEach(append)
    source.forEach(append)

    return result
  }

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    const result = { ...target }
    for (const [key, sourceValue] of Object.entries(source)) {
      result[key] = mergeSanitizedPayloads(result[key], sourceValue)
    }
    return result
  }

  return target
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

const loadJsonFile = async (filePath) => {
  const contents = await readFile(filePath, 'utf8')
  return JSON.parse(contents)
}

const canonicalizeValue = (value) => {
  if (Array.isArray(value)) {
    const variants = []
    const seen = new Set()

    for (const entry of value) {
      const canonicalEntry = canonicalizeValue(entry)
      const signature = JSON.stringify(canonicalEntry)
      if (!seen.has(signature)) {
        seen.add(signature)
        variants.push(canonicalEntry)
      }
    }

    variants.sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    )

    return {
      type: 'array',
      variants,
    }
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalizeValue(entry)])

    return {
      type: 'object',
      entries,
    }
  }

  if (value === null) {
    return { type: 'null' }
  }

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return { type: valueType }
  }

  return { type: 'unknown' }
}

const isStructureSubset = (fixture, payload) => {
  if (fixture.type !== payload.type) {
    if (fixture.type === 'null' || payload.type === 'null') {
      return true
    }

    return false
  }

  if (fixture.type === 'object') {
    const fixtureMap = new Map(fixture.entries)
    return payload.entries.every(([key, payloadEntry]) => {
      const fixtureEntry = fixtureMap.get(key)
      if (!fixtureEntry) {
        return false
      }

      return isStructureSubset(fixtureEntry, payloadEntry)
    })
  }

  if (fixture.type === 'array') {
    if (fixture.variants.length === 0) {
      return payload.variants.length === 0
    }

    return payload.variants.every((payloadVariant) =>
      fixture.variants.some((fixtureVariant) =>
        isStructureSubset(fixtureVariant, payloadVariant),
      ),
    )
  }

  return true
}

const assertStructureMatchesFixture = async (
  relativePath,
  payload,
  openApiDoc,
  pathKey,
) => {
  const fixturePath = path.join(FIXTURE_DIR, relativePath)

  let fixture
  try {
    fixture = await loadJsonFile(fixturePath)
  } catch (error) {
    throw new Error(
      `Unable to load fixture ${relativePath}. Run ` +
        '`pnpm verify:schema -- --mode=record` to capture fresh snapshots.',
      { cause: error },
    )
  }

  validateResponse(openApiDoc, pathKey, 'get', 200, fixture)

  const canonicalFixture = canonicalizeValue(fixture)
  const canonicalPayload = canonicalizeValue(payload)

  if (!isStructureSubset(canonicalFixture, canonicalPayload)) {
    throw new Error(
      `Live response for ${relativePath} does not match the canonical structure ` +
        'of the committed fixture. If the schema legitimately changed, rerun ' +
        '`pnpm verify:schema -- --mode=record` and commit the refreshed fixtures.',
    )
  }
}

const parseMode = (argv) => {
  const modeFlag = argv.find((arg) => arg.startsWith('--mode'))
  if (!modeFlag) {
    return MODES.VERIFY
  }

  if (modeFlag === '--mode') {
    const value = argv[argv.indexOf(modeFlag) + 1]
    if (!value) {
      throw new Error('Expected a mode value after --mode flag')
    }
    return value
  }

  const [, value] = modeFlag.split('=')
  if (!value) {
    throw new Error('Expected a mode value for --mode flag')
  }

  return value
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

const MAX_RECORD_ORDER_SAMPLES = 5

const captureOrdersLatest = async (openApiDoc, mode) => {
  const url = new URL(appSettings.ordersEndpoint)
  url.searchParams.set('limit', String(appSettings.pollLimit))
  url.searchParams.set('detail', 'ids')
  url.searchParams.set('minutes', String(appSettings.orderPollingWindowMinutes))
  url.searchParams.set('timeZone', 'UTC')

  const { status, body } = await fetchJson(url.toString())

  validateResponse(openApiDoc, '/api/orders', 'get', status, body)

  const sanitized = sanitizeJson(body)

  if (mode === MODES.RECORD) {
    await writeJsonFile(path.join(FIXTURE_DIR, 'orders-latest.json'), sanitized)
  } else {
    await assertStructureMatchesFixture(
      'orders-latest.json',
      sanitized,
      openApiDoc,
      '/api/orders',
    )
  }

  if (!body || !Array.isArray(body.orders) || body.orders.length === 0) {
    return []
  }

  return body.orders.filter((entry) => typeof entry === 'string' && entry)
}

const captureOrderByGuid = async (openApiDoc, guids, mode) => {
  const validGuids = Array.isArray(guids)
    ? guids.filter((entry) => typeof entry === 'string' && entry)
    : []

  if (validGuids.length === 0) {
    return
  }

  const sampleCount =
    mode === MODES.RECORD ? Math.min(validGuids.length, MAX_RECORD_ORDER_SAMPLES) : 1
  let mergedPayload

  for (let index = 0; index < sampleCount; index += 1) {
    const guid = validGuids[index]
    console.log(`Capturing order ${guid}…`)

    const url = `${appSettings.ordersEndpoint}/${encodeURIComponent(guid)}`
    const { status, body } = await fetchJson(url)

    validateResponse(openApiDoc, '/api/orders/{guid}', 'get', status, body)

    const sanitized = sanitizeJson(body)

    if (mode === MODES.RECORD) {
      mergedPayload = mergedPayload
        ? mergeSanitizedPayloads(mergedPayload, sanitized)
        : sanitized
      continue
    }

    await assertStructureMatchesFixture(
      'order-by-guid.json',
      sanitized,
      openApiDoc,
      '/api/orders/{guid}',
    )
  }

  if (mode === MODES.RECORD && mergedPayload) {
    await writeJsonFile(path.join(FIXTURE_DIR, 'order-by-guid.json'), mergedPayload)
  }
}

const captureMenus = async (openApiDoc, mode) => {
  const { status, body } = await fetchJson(appSettings.menusEndpoint)

  validateResponse(openApiDoc, '/api/menus', 'get', status, body)

  const sanitized = sanitizeJson(body)

  if (mode === MODES.RECORD) {
    await writeJsonFile(path.join(FIXTURE_DIR, 'menus.json'), sanitized)
  } else {
    await assertStructureMatchesFixture('menus.json', sanitized, openApiDoc, '/api/menus')
  }
}

const captureConfigSnapshot = async (openApiDoc, mode) => {
  const { status, body } = await fetchJson(appSettings.configSnapshotEndpoint)

  validateResponse(openApiDoc, '/api/config/snapshot', 'get', status, body)

  const sanitized = sanitizeJson(body)

  if (mode === MODES.RECORD) {
    await writeJsonFile(path.join(FIXTURE_DIR, 'config-snapshot.json'), sanitized)
  } else {
    await assertStructureMatchesFixture(
      'config-snapshot.json',
      sanitized,
      openApiDoc,
      '/api/config/snapshot',
    )
  }
}

const captureKitchenPrepStations = async (openApiDoc, mode) => {
  const endpoint = 'https://doughmonster-worker.thedoughmonster.workers.dev/api/kitchen/prep-stations'
  const { status, body } = await fetchJson(endpoint)

  validateResponse(openApiDoc, '/api/kitchen/prep-stations', 'get', status, body)

  const sanitized = sanitizeJson(body)

  if (mode === MODES.RECORD) {
    await writeJsonFile(
      path.join(FIXTURE_DIR, 'kitchen-prep-stations.json'),
      sanitized,
    )
  } else {
    await assertStructureMatchesFixture(
      'kitchen-prep-stations.json',
      sanitized,
      openApiDoc,
      '/api/kitchen/prep-stations',
    )
  }
}

const main = async () => {
  const mode = parseMode(process.argv.slice(2))
  if (mode !== MODES.VERIFY && mode !== MODES.RECORD) {
    throw new Error(`Unsupported mode "${mode}". Use "verify" or "record".`)
  }

  console.log(`Running schema verifier in ${mode} mode…`)

  console.log('Downloading OpenAPI document…')
  const openApiDoc = await loadOpenApiDocument()

  console.log('Capturing latest orders (detail=ids)…')
  const latestOrderGuids = await captureOrdersLatest(openApiDoc, mode)

  if (latestOrderGuids.length > 0) {
    await captureOrderByGuid(openApiDoc, latestOrderGuids, mode)
  } else {
    console.warn('No orders were returned; skipping order-by-guid capture.')
  }

  console.log('Capturing menus…')
  await captureMenus(openApiDoc, mode)

  console.log('Capturing config snapshot…')
  await captureConfigSnapshot(openApiDoc, mode)

  console.log('Capturing kitchen prep stations…')
  await captureKitchenPrepStations(openApiDoc, mode)

  if (mode === MODES.RECORD) {
    console.log(`Fixtures written to ${path.relative(ROOT_DIR, FIXTURE_DIR)}`)
  } else {
    console.log('Fixture structures match committed snapshots.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
