import ModifierList from './ModifierList'
import styles from './ModifierSidebarView.module.css'

const ModifierSidebarView = ({ modifierGroups, selectionSummaryMessage, status }) => {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Modifiers</h2>
      {selectionSummaryMessage ? (
        <p className={styles.selectionStatus} aria-live="polite">
          {selectionSummaryMessage}
        </p>
      ) : null}
      {status ? (
        <p
          key={status.key}
          className={styles.status}
          aria-live={status.ariaLive}
          role={status.role}
        >
          {status.message}
        </p>
      ) : null}
      {modifierGroups.length > 0 ? <ModifierList groups={modifierGroups} /> : null}
    </aside>
  )
}

export default ModifierSidebarView
