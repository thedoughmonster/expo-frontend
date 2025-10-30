import { memo } from 'react'
import styles from './OrderCardMeta.module.css'

const OrderCardMeta = ({ status, statusClassName, timeLabel, timeDateTime }) => (
  <div className={styles.meta}>
    {status ? (
      <span className={`${styles.statusBadge} ${statusClassName}`.trim()}>{status}</span>
    ) : null}
    {timeLabel ? (
      <time className={styles.time} dateTime={timeDateTime}>
        {timeLabel}
      </time>
    ) : null}
  </div>
)

export default memo(OrderCardMeta)
