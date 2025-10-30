import ModifierListItem from './ModifierListItem'
import styles from './ModifierList.module.css'

const ModifierList = ({ groups }) => {
  if (!groups || groups.length === 0) {
    return null
  }

  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <section key={group.id ?? group.name} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.name}</h3>
          <ul className={styles.groupItems}>
            {group.items.map((item) => (
              <ModifierListItem key={item.id ?? item.name} name={item.name} qty={item.qty} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default ModifierList
