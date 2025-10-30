import { memo } from 'react'
import styles from './ModifierListItem.module.css'

const ModifierListItem = ({ name, qty }) => {
  return (
    <li className={styles.item}>
      <div className={styles.quantity} aria-label={`Quantity ${qty}`}>
        <span className={styles.quantityValue}>{qty}</span>
        <span aria-hidden="true" className={styles.quantityMultiplier}>
          ×
        </span>
      </div>
      <div className={styles.content}>
        <span className={styles.name}>{name}</span>
      </div>
    </li>
  )
}

export default memo(ModifierListItem)
