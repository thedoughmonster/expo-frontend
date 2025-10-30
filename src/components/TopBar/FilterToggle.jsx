import React, { useCallback } from 'react'
import styles from './FilterToggle.module.css'

const FilterToggle = React.memo(({ filterKey, label, isActive, title, onToggleFilter }) => {
  const handleClick = useCallback(() => {
    onToggleFilter(filterKey)
  }, [filterKey, onToggleFilter])

  return (
    <button
      type="button"
      className={styles.filterToggle}
      aria-pressed={isActive}
      onClick={handleClick}
      title={title}
    >
      <span className={styles.label}>{label}</span>
    </button>
  )
})

export default FilterToggle
