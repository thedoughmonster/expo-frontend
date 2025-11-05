import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './OrdersDebugPanel.module.css'
import { computeOrdersDebugDiff } from '../../domain/orders/computeOrdersDebugDiff'

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

const CopyButton = ({ label, getText, className }) => {
  const [status, setStatus] = useState('idle')
  const timeoutRef = useRef()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = undefined
      }
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const text = getText?.()
    if (typeof text !== 'string' || text.length === 0) {
      setStatus('error')
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setStatus('idle')
        timeoutRef.current = undefined
      }, 2000)
      return
    }

    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        if (typeof document === 'undefined') {
          throw new Error('Clipboard API is unavailable in this environment')
        }
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      setStatus('success')
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setStatus('idle')
        timeoutRef.current = undefined
      }, 1500)
    } catch (error) {
      console.error('Failed to copy debug payload', error)
      setStatus('error')
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setStatus('idle')
        timeoutRef.current = undefined
      }, 2000)
    }
  }, [getText])

  const statusLabel = status === 'success' ? 'Copied!' : status === 'error' ? 'Copy failed' : label

  const buttonClassName = [styles.copyButton, className].filter(Boolean).join(' ')

  return (
    <button type="button" className={buttonClassName} onClick={handleCopy}>
      {statusLabel}
    </button>
  )
}

const OrdersDebugPanel = ({
  isOpen,
  onClose,
  orders,
  rawOrders,
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
  const rawOrdersJson = useMemo(() => stringify(rawOrders), [rawOrders])
  const menuJson = useMemo(() => stringify(menuSnapshot?.payload), [menuSnapshot])
  const configJson = useMemo(() => stringify(configSnapshot?.payload), [configSnapshot])

  const diffResult = useMemo(() => computeOrdersDebugDiff(orders, rawOrders), [orders, rawOrders])
  const diffJson = useMemo(() => stringify(diffResult), [diffResult])

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
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Normalized orders</h3>
                <p className={styles.sectionMeta}>
                  {orderCount} order{orderCount === 1 ? '' : 's'} • lookup version {lookupsVersion ?? 0}
                </p>
              </div>
              <CopyButton label="Copy JSON" getText={() => ordersJson} />
            </div>
            {orderCount === 0 ? (
              <p className={styles.emptyState}>No normalized orders are currently loaded.</p>
            ) : null}
            <pre className={styles.codeBlock}>{ordersJson}</pre>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Raw orders payload</h3>
                <p className={styles.sectionMeta}>Latest raw orders retained in memory.</p>
              </div>
              <CopyButton label="Copy JSON" getText={() => rawOrdersJson} />
            </div>
            {Array.isArray(rawOrders) && rawOrders.length === 0 ? (
              <p className={styles.emptyState}>No raw orders are currently retained.</p>
            ) : null}
            <pre className={styles.codeBlock}>{rawOrdersJson}</pre>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Normalized vs. raw diff</h3>
                <p className={styles.sectionMeta}>
                  {diffResult.entries.length === 0 && diffResult.issues.length === 0
                    ? 'No differences detected between normalized and raw orders.'
                    : `${diffResult.entries.length} diff entr${diffResult.entries.length === 1 ? 'y' : 'ies'} • ${diffResult.issues.length} issue${diffResult.issues.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <CopyButton label="Copy diff" getText={() => diffJson} />
            </div>
            {diffResult.issues.length > 0 ? (
              <div className={styles.notice} role="status">
                <p className={styles.noticeTitle}>Warnings</p>
                <ul className={styles.noticeList}>
                  {diffResult.issues.map((issue, index) => (
                    <li key={issue ?? index}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {diffResult.entries.length === 0 && diffResult.issues.length === 0 ? (
              <p className={styles.emptyState}>No differences to display.</p>
            ) : null}
            <pre className={styles.codeBlock}>{diffJson}</pre>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Menu snapshot</h3>
                <p className={styles.sectionMeta}>Toast menus payload and cache metadata.</p>
              </div>
              <CopyButton label="Copy JSON" getText={() => menuJson} />
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
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Config snapshot</h3>
                <p className={styles.sectionMeta}>Location and dining option configuration payload.</p>
              </div>
              <CopyButton label="Copy JSON" getText={() => configJson} />
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
