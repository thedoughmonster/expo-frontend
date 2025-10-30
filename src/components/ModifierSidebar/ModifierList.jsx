import ModifierListItem from './ModifierListItem'
import styles from './ModifierList.module.css'

const ModifierList = ({ items }) => {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <ModifierListItem key={item.name} name={item.name} qty={item.qty} />
      ))}
    </ul>
  )
}

export default ModifierList
