import { describe, expect, it } from 'vitest'

import { MIN_COLUMN_WIDTH, determineColumnCount } from '../OrderCardContainer'

describe('determineColumnCount', () => {
  it('returns a single column when the card is narrower than two columns', () => {
    const nextColumns = determineColumnCount({
      availableHeight: 1000,
      width: MIN_COLUMN_WIDTH * 1.5,
      scrollHeight: 400,
      currentColumns: 3,
    })

    expect(nextColumns).toBe(1)
  })

  it('clamps the column count by the available width', () => {
    const nextColumns = determineColumnCount({
      availableHeight: 250,
      width: MIN_COLUMN_WIDTH * 3.4,
      scrollHeight: 500,
      currentColumns: 3,
    })

    expect(nextColumns).toBe(3)
  })

  it('adds hysteresis to avoid toggling columns for sub-pixel height changes', () => {
    const width = MIN_COLUMN_WIDTH * 3

    const stayAtTwoColumns = determineColumnCount({
      availableHeight: 150,
      width,
      scrollHeight: 150.2,
      currentColumns: 2,
    })

    expect(stayAtTwoColumns).toBe(2)

    const increaseToThreeColumns = determineColumnCount({
      availableHeight: 150,
      width,
      scrollHeight: 151,
      currentColumns: 2,
    })

    expect(increaseToThreeColumns).toBe(3)
  })
})
