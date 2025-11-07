import { describe, expect, it } from 'vitest'
import { extractUnfulfilledOrderGuids } from '../menuLookup'

const FIRST_GUID = '123e4567-e89b-12d3-a456-426614174000'
const SECOND_GUID = '123e4567-e89b-12d3-a456-426614174001'
const THIRD_GUID = '123e4567-e89b-12d3-a456-426614174002'

describe('extractUnfulfilledOrderGuids', () => {
  it('captures outstanding orders without regex heuristics', () => {
    const payload = {
      outstandingOrders: [
        { guid: FIRST_GUID, fulfilled: false },
        { guid: SECOND_GUID, fulfilled: true },
        { guid: THIRD_GUID, status: 'IN_PROGRESS' },
      ],
      TicketQueue: [THIRD_GUID, 'not-a-guid'],
    }

    const result = extractUnfulfilledOrderGuids(payload)

    expect(Array.from(result).sort()).toEqual([FIRST_GUID, THIRD_GUID])
  })
})
