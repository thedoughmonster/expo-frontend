import { memo, useEffect, useMemo } from 'react'
import styles from './OrdersDebugPanel.module.css'

const formatTimestamp = (value) => {
  if (!value) {
    return 'Not provided'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  try {
    return `${date.toLocaleString()} (${value})`
  } catch {
    return value
  }
}

const stringify = (value) => {
  try {
    return JSON.stringify(value ?? null, null, 2)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown serialization error'
    return `Unable to serialize value: ${message}`
  }
}

const OrdersDebugPanel = ({
  isOpen,
  onClose,
  orders,
  menuSnapshot,
  configSnapshot,
  lookupsVersion,
}) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const ordersJson = useMemo(() => {
    void lookupsVersion
    return stringify(Array.isArray(orders) ? orders : [])
  }, [orders, lookupsVersion])
  const menuJson = useMemo(() => stringify(menuSnapshot?.payload), [menuSnapshot])
  const configJson = useMemo(() => stringify(configSnapshot?.payload), [configSnapshot])

  const orderCount = Array.isArray(orders) ? orders.length : 0
  const panelTitleId = 'orders-debug-panel-title'
  const panelSubtitleId = 'orders-debug-panel-subtitle'

  const menuMeta = useMemo(
    () => ({
      fetchedAt: formatTimestamp(menuSnapshot?.fetchedAt),
      expiresAt: formatTimestamp(menuSnapshot?.expiresAt),
      signature: menuSnapshot?.signature ?? 'Unavailable',
    }),
    [menuSnapshot],
  )

  const configMeta = useMemo(
    () => ({
      fetchedAt: formatTimestamp(configSnapshot?.fetchedAt),
      expiresAt: formatTimestamp(configSnapshot?.expiresAt),
      signature: configSnapshot?.signature ?? 'Unavailable',
    }),
    [configSnapshot],
  )

  const backdropClassName = isOpen
    ? `${styles.backdrop} ${styles.backdropVisible}`
    : styles.backdrop
  const panelClassName = isOpen ? `${styles.panel} ${styles.panelOpen}` : styles.panel

  const handleBackdropClick = () => {
    onClose?.()
  }

  return (
    <>
      <div className={backdropClassName} role="presentation" onClick={handleBackdropClick} />
      <aside
        className={panelClassName}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-labelledby={panelTitleId}
        aria-describedby={panelSubtitleId}
      >
        <div className={styles.header}>
          <div>
            <h2 id={panelTitleId} className={styles.title}>
              Orders debug drawer
            </h2>
            <p id={panelSubtitleId} className={styles.subtitle}>
              Inspect normalized orders, menu payloads, and configuration snapshots.
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
        <div className={styles.content}>
          <section className={styles.section} aria-live="polite">
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Normalized orders</h3>
              <p className={styles.sectionMeta}>
                {orderCount} order{orderCount === 1 ? '' : 's'} • lookup version {lookupsVersion ?? 0}
              </p>
            </div>
            {orderCount === 0 ? (
              <p className={styles.emptyState}>No normalized orders are currently loaded.</p>
            ) : null}
            <pre className={styles.codeBlock}>{ordersJson}</pre>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Menu snapshot</h3>
              <p className={styles.sectionMeta}>Toast menus payload and cache metadata.</p>
            </div>
            <dl className={styles.metaList}>
              <div>
                <dt>Fetched at</dt>
                <dd>{menuMeta.fetchedAt}</dd>
              </div>
              <div>
                <dt>Expires at</dt>
                <dd>{menuMeta.expiresAt}</dd>
              </div>
              <div>
                <dt>Signature</dt>
                <dd>{menuMeta.signature}</dd>
              </div>
            </dl>
            <pre className={styles.codeBlock}>{menuJson}</pre>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Config snapshot</h3>
              <p className={styles.sectionMeta}>Location and dining option configuration payload.</p>
            </div>
            <dl className={styles.metaList}>
              <div>
                <dt>Fetched at</dt>
                <dd>{configMeta.fetchedAt}</dd>
              </div>
              <div>
                <dt>Expires at</dt>
                <dd>{configMeta.expiresAt}</dd>
              </div>
              <div>
                <dt>Signature</dt>
                <dd>{configMeta.signature}</dd>
              </div>
            </dl>
            <pre className={styles.codeBlock}>{configJson}</pre>
          </section>
        </div>
      </aside>
    </>
  )
}

export default memo(OrdersDebugPanel)
