const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString())
  }

  if (Array.isArray(value)) {
    const entries = value.map((entry) => stableStringify(entry))
    return `[${entries.join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .sort()

    return `{${entries.join(',')}}`
  }

  return JSON.stringify(String(value))
}

export default stableStringify
