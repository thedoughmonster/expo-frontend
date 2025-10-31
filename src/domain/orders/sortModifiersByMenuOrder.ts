export const toMenuOrderValue = (value?: number | null): number =>
  Number.isFinite(value) && typeof value === 'number' && value >= 0
    ? value
    : Number.POSITIVE_INFINITY

const normalizeString = (value?: string | null): string => value?.trim() ?? ''

type MenuOrderedModifier = {
  name?: string | null
  groupName?: string | null
  groupOrder?: number | null
  optionOrder?: number | null
  order?: number | null
}

export const sortModifiersByMenuOrder = <T extends MenuOrderedModifier>(a: T, b: T): number => {
  const groupOrderA = toMenuOrderValue(a.groupOrder)
  const groupOrderB = toMenuOrderValue(b.groupOrder)
  if (groupOrderA !== groupOrderB) {
    return groupOrderA - groupOrderB
  }

  const groupNameA = normalizeString(a.groupName)
  const groupNameB = normalizeString(b.groupName)
  if (groupNameA || groupNameB) {
    if (!groupNameA) {
      return 1
    }
    if (!groupNameB) {
      return -1
    }

    const groupNameComparison = groupNameA.localeCompare(groupNameB)
    if (groupNameComparison !== 0) {
      return groupNameComparison
    }
  }

  const optionOrderA = toMenuOrderValue(a.optionOrder ?? a.order)
  const optionOrderB = toMenuOrderValue(b.optionOrder ?? b.order)
  if (optionOrderA !== optionOrderB) {
    return optionOrderA - optionOrderB
  }

  const nameA = normalizeString(a.name)
  const nameB = normalizeString(b.name)
  if (!nameA || !nameB) {
    if (!nameA && !nameB) {
      return 0
    }
    return nameA ? -1 : 1
  }

  return nameA.localeCompare(nameB)
}
