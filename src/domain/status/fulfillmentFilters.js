const FULFILLMENT_STATUSES = Object.freeze({
  NEW: 'NEW',
  HOLD: 'HOLD',
  SENT: 'SENT',
  READY: 'READY',
})

const LEGACY_PREPARATION_STATUSES = new Set(['IN_PROGRESS', 'PREP', 'PREPARING', 'COOK', 'COOKING'])

const createFilter = ({ key, label, statuses }) => {
  const normalizedStatuses = new Set(statuses.map((status) => status.toUpperCase()))

  return {
    key,
    label,
    statuses: normalizedStatuses,
    matches: (value) => normalizedStatuses.has(value),
  }
}

const FULFILLMENT_FILTERS = [
  createFilter({
    key: 'new',
    label: 'New',
    statuses: [FULFILLMENT_STATUSES.NEW],
  }),
  createFilter({
    key: 'hold',
    label: 'Hold',
    statuses: [FULFILLMENT_STATUSES.HOLD],
  }),
  createFilter({
    key: 'sent',
    label: 'Sent',
    statuses: [FULFILLMENT_STATUSES.SENT],
  }),
  createFilter({
    key: 'ready',
    label: 'Ready',
    statuses: [FULFILLMENT_STATUSES.READY],
  }),
]

const FULFILLMENT_STATUS_TO_FILTER_KEY = new Map()
FULFILLMENT_FILTERS.forEach((filter) => {
  filter.statuses.forEach((status) => {
    if (!FULFILLMENT_STATUS_TO_FILTER_KEY.has(status)) {
      FULFILLMENT_STATUS_TO_FILTER_KEY.set(status, filter.key)
    }
  })
})

const normalizeStatusValue = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

const resolveFulfillmentFilterKey = (order) => {
  if (!order || typeof order !== 'object') {
    return null
  }

  const candidateFields = ['fulfillmentStatus', 'status']

  for (const field of candidateFields) {
    const rawValue = order[field]
    const normalized = normalizeStatusValue(rawValue)
    if (!normalized) {
      continue
    }

    const filterKey = FULFILLMENT_STATUS_TO_FILTER_KEY.get(normalized)
    if (filterKey) {
      return filterKey
    }
  }

  return null
}

const FULFILLMENT_STATUS_CLASS_MAP = {
  [FULFILLMENT_STATUSES.SENT]: 'is-sent',
  [FULFILLMENT_STATUSES.READY]: 'is-ready',
  [FULFILLMENT_STATUSES.HOLD]: 'is-hold',
  [FULFILLMENT_STATUSES.NEW]: 'is-new',
}

const fulfillmentStatusToClassName = (status) => {
  const normalized = normalizeStatusValue(status)
  if (!normalized) {
    return ''
  }

  const mappedClass = FULFILLMENT_STATUS_CLASS_MAP[normalized]
  if (mappedClass) {
    return mappedClass
  }

  if (LEGACY_PREPARATION_STATUSES.has(normalized)) {
    return 'is-in-preparation'
  }

  return ''
}

export {
  FULFILLMENT_FILTERS,
  FULFILLMENT_STATUSES,
  normalizeStatusValue,
  resolveFulfillmentFilterKey,
  fulfillmentStatusToClassName,
}
