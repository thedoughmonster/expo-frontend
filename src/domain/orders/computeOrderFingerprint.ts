import stableStringify from '../../utils/stableStringify'
import type { ToastOrder } from './normalizeOrders'

export const computeOrderFingerprint = (order: ToastOrder): string =>
  stableStringify(order)

export default computeOrderFingerprint
