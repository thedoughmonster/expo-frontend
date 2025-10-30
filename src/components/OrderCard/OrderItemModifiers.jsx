import { memo } from 'react'
import styles from './OrderItemModifiers.module.css'

const OrderItemModifiers = ({ modifiers }) => (
  <div className={styles.card}>
    <p className={styles.title}>Modifiers</p>
    <ul className={styles.list}>
      {modifiers.map((modifier) => (
        <li key={modifier.id} className={styles.modifier}>
          <span className={styles.modifierQty} aria-label={modifier.quantityLabel}>
            {modifier.quantity}
            <span className={styles.modifierQtyMultiplier} aria-hidden="true">
              ×
            </span>
          </span>
          <span className={styles.modifierName}>{modifier.name}</span>
        </li>
      ))}
    </ul>
  </div>
)

export default memo(OrderItemModifiers)
