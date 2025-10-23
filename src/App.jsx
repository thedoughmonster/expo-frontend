import { useMemo, useState } from 'react'
import './App.css'

function App() {
  const modifierPlaceholders = [
    { name: 'Extra Sauce', qty: 2 },
    { name: 'No Onions', qty: 1 },
    { name: 'Gluten Free', qty: 1 },
  ]

  const settingsTabs = useMemo(
    () => [
      {
        id: 'general',
        label: 'General',
        description:
          'Adjust overall dashboard behavior, appearance, and defaults once settings become available.',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description:
          'Configure notification channels and delivery preferences here when the feature is ready.',
      },
    ],
    [],
  )

  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [activeTabId, setActiveTabId] = useState(settingsTabs[0].id)

  const activeTab = settingsTabs.find((tab) => tab.id === activeTabId) ?? settingsTabs[0]

  const openSettings = () => {
    setActiveTabId(settingsTabs[0].id)
    setSettingsOpen(true)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
  }

  return (
    <div className="dashboard">
      <header className="top-bar">
        <h1>Order Dashboard</h1>
        <button
          type="button"
          className="settings-button"
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          onClick={openSettings}
        >
          <span className="sr-only">Open settings</span>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="settings-icon"
          >
            <path
              d="M12 15.25C13.7949 15.25 15.25 13.7949 15.25 12C15.25 10.2051 13.7949 8.75 12 8.75C10.2051 8.75 8.75 10.2051 8.75 12C8.75 13.7949 10.2051 15.25 12 15.25Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.5 12.0001C19.5001 12.5003 19.4412 12.9991 19.3245 13.4846L21.1815 15.0631L19.0631 18.1815L17.2055 16.9091C16.6021 17.3539 15.9295 17.7011 15.2155 17.9346L14.8725 20.25H9.1275L8.7845 17.9346C8.0705 17.7011 7.39792 17.3539 6.7945 16.9091L4.93688 18.1815L2.81848 15.0631L4.67548 13.4846C4.55879 12.9991 4.4999 12.5003 4.5 12.0001C4.4999 11.4999 4.55879 11.0011 4.67548 10.5156L2.81848 8.93705L4.93688 5.81865L6.7945 7.09105C7.39792 6.64625 8.0705 6.29903 8.7845 6.06555L9.1275 3.75H14.8725L15.2155 6.06555C15.9295 6.29903 16.6021 6.64625 17.2055 7.09105L19.0631 5.81865L21.1815 8.93705L19.3245 10.5156C19.4412 11.0011 19.5001 11.4999 19.5 12.0001Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>
      <div className="dashboard-body">
        <aside className="sidebar">
          <h2>Modifiers</h2>
          <ul className="modifier-list">
            {modifierPlaceholders.map(({ name, qty }) => (
              <li className="modifier-item" key={name}>
                <div className="modifier-qty" aria-label={`Quantity ${qty}`}>
                  <span className="modifier-qty-value">{qty}</span>
                  <span aria-hidden="true" className="qty-multiplier">
                    ×
                  </span>
                </div>
                <div className="modifier-content">
                  <span className="modifier-name">{name}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <main className="orders-area">
          <section className="orders-placeholder">
            Order data will appear here.
          </section>
        </main>
      </div>
      {isSettingsOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeSettings}>
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-modal-header">
              <h2 id="settings-modal-title">Dashboard Settings</h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={closeSettings}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-body">
              <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTab.id}
                    aria-controls={`settings-tabpanel-${tab.id}`}
                    id={`settings-tab-${tab.id}`}
                    className={`settings-tab${tab.id === activeTab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                className="settings-tabpanel"
                role="tabpanel"
                id={`settings-tabpanel-${activeTab.id}`}
                aria-labelledby={`settings-tab-${activeTab.id}`}
              >
                <p>{activeTab.description}</p>
                <ul className="settings-placeholder-list">
                  <li>Placeholder option A</li>
                  <li>Placeholder option B</li>
                  <li>Placeholder option C</li>
                </ul>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button type="button" className="modal-primary-button" disabled>
                Save Changes
              </button>
              <button type="button" className="modal-secondary-button" onClick={closeSettings}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
