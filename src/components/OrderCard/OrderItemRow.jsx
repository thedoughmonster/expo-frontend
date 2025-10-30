import { memo } from 'react'
import OrderItemModifiers from './OrderItemModifiers'
import styles from './OrderItemRow.module.css'

const OrderItemRow = ({
  quantity,
  quantityLabel,
  name,
  hasPrice,
  price,
  hasModifiers,
  modifiers,
  notes,
}) => (
  <li className={styles.item}>
    <div className={styles.itemHeader}>
      <div className={styles.itemTitle}>
        <span className={styles.itemQty} aria-label={quantityLabel}>
          {quantity}
          <span className={styles.itemQtyMultiplier} aria-hidden="true">
            ×
          </span>
        </span>
        <span className={styles.itemName}>{name}</span>
      </div>
      {hasPrice ? <span className={styles.itemPrice}>{price}</span> : null}
    </div>
    {hasModifiers ? <OrderItemModifiers modifiers={modifiers} /> : null}
    {notes ? <p className={styles.notes}>{notes}</p> : null}
  </li>
)

export default memo(OrderItemRow)
