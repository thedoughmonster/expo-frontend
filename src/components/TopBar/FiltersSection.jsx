import React, { useMemo } from 'react'
import FilterToggle from './FilterToggle'
import styles from './FiltersSection.module.css'

const FiltersSection = React.memo(({ filters, activeFilters, onToggleFilter }) => {
  const filtersWithState = useMemo(
    () =>
      filters.map((filter) => ({
        ...filter,
        isActive: activeFilters.has(filter.key),
      })),
    [filters, activeFilters],
  )

  return (
    <div className={styles.section}>
      <p className={styles.label}>Fulfillment filters</p>
      <div
        className={`${styles.controls} ${styles.filters}`}
        role="group"
        aria-label="Filter orders by fulfillment status"
      >
        {filtersWithState.map(({ key, label, isActive }) => {
          const title = isActive
            ? `Showing ${label.toLowerCase()} orders. Click to hide these orders.`
            : `Show orders marked as ${label.toLowerCase()}.`

          return (
            <FilterToggle
              key={key}
              filterKey={key}
              label={label}
              isActive={isActive}
              title={title}
              onToggleFilter={onToggleFilter}
            />
          )
        })}
      </div>
    </div>
  )
})

export default FiltersSection
