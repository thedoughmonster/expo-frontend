const FULFILLMENT_FILTERS = [
  {
    key: 'new',
    label: 'New',
    matches: (value) => /\bNEW\b/.test(value),
  },
  {
    key: 'hold',
    label: 'Hold',
    matches: (value) => /\bHOLD\b/.test(value),
  },
  {
    key: 'sent',
    label: 'Sent',
    matches: (value) => /\bSENT\b/.test(value),
  },
  {
    key: 'ready',
    label: 'Ready',
    matches: (value) => /\bREADY\b/.test(value),
  },
]

const normalizeStatusValue = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

const resolveFulfillmentFilterKey = (order) => {
  if (!order) {
    return null
  }

  const candidates = [order.fulfillmentStatus, order.status]
    .map((value) => normalizeStatusValue(value))
    .filter(Boolean)

  for (const candidate of candidates) {
    for (const filter of FULFILLMENT_FILTERS) {
      if (filter.matches(candidate)) {
        return filter.key
      }
    }
  }

  return null
}

const fulfillmentStatusToClassName = (status) => {
  if (!status) {
    return ''
  }

  const normalized = status.trim().toUpperCase()

  if (/\bSENT\b/.test(normalized)) {
    return 'is-sent'
  }

  if (/\bREADY\b/.test(normalized)) {
    return 'is-ready'
  }

  if (/\bHOLD\b/.test(normalized)) {
    return 'is-hold'
  }

  if (/\bNEW\b/.test(normalized)) {
    return 'is-new'
  }

  if (/\bPREP/.test(normalized) || /\bCOOK/.test(normalized)) {
    return 'is-in-preparation'
  }

  return ''
}

export { FULFILLMENT_FILTERS, normalizeStatusValue, resolveFulfillmentFilterKey, fulfillmentStatusToClassName }
