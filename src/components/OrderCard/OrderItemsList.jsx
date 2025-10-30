import { memo } from 'react'
import OrderItemRow from './OrderItemRow'
import styles from './OrderItemsList.module.css'

const OrderItemsList = ({ items }) => (
  <ul className={styles.list}>
    {items.map((item) => (
      <OrderItemRow
        key={item.id}
        quantity={item.quantity}
        quantityLabel={item.quantityLabel}
        name={item.name}
        hasPrice={item.hasPrice}
        price={item.price}
        hasModifiers={item.hasModifiers}
        modifiers={item.modifiers}
        notes={item.notes}
      />
    ))}
  </ul>
)

export default memo(OrderItemsList)
