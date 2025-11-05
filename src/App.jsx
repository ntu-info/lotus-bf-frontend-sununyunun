import { useCallback, useState } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')

  const handlePickTerm = useCallback((t) => {
    setQuery((q) => (q ? `${q} ${t}` : t))
  }, [setQuery])

  // Card collapse states
  const [studiesOpen, setStudiesOpen] = useState(true)
  const [niiOpen, setNiiOpen] = useState(true)

  // Both open = side by side layout
  const bothOpen = studiesOpen && niiOpen

  return (
    <div className="app dashboard-layout">
      {/* Inline style injection */}
      <style>{`
        :root {
          --primary-600: #2563eb;
          --border: #e5e7eb;
        }
        .dashboard-layout {
          padding: 18px !important;
          max-width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .dashboard-header {
          margin-bottom: 18px;
          flex-shrink: 0;
        }
        .dashboard-search-bar {
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 18px;
          flex-shrink: 0;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 18px;
          align-items: start;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .dashboard-left {
          height: 100%;
          overflow: auto;
        }
        .dashboard-right {
          display: flex;
          flex-direction: column;
          gap: 18px;
          height: 100%;
          overflow: hidden;
        }
        .dashboard-right.split-layout {
          flex-direction: row;
          gap: 18px;
        }
        .dashboard-right.split-layout > .collapsible-card {
          flex: 1;
          min-width: 0;
          height: 100%;
        }
        .collapsible-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .collapsible-card.full-height {
          flex: 1;
          min-height: 0;
        }
        .collapsible-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid var(--border);
          background: #fafafa;
          flex-shrink: 0;
        }
        .collapsible-card__header:hover {
          background: #f3f4f6;
        }
        .collapsible-card__title {
          font-weight: 600;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .collapsible-card__toggle {
          font-size: 18px;
          color: #6b7280;
          transition: transform 0.3s ease;
        }
        .collapsible-card__toggle.open {
          transform: rotate(180deg);
        }
        .collapsible-card__content {
          display: none;
          overflow: auto;
          flex: 1;
          min-height: 0;
        }
        .collapsible-card__content.open {
          display: block;
        }
        .collapsible-card__body {
          padding: 0;
          height: 100%;
        }
        .card-icon {
          font-size: 16px;
        }
        
        /* Responsive */
        @media (max-width: 1023px) {
          .dashboard-layout {
            height: auto;
            overflow: auto;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            height: auto;
            overflow: visible;
          }
          .dashboard-left {
            height: auto;
          }
          .dashboard-right {
            height: auto;
            overflow: visible;
          }
          .dashboard-right.split-layout {
            flex-direction: column;
          }
          .collapsible-card.full-height {
            flex: none;
            min-height: 400px;
          }
          .dashboard-layout {
            padding: 12px !important;
          }
        }
        
        /* Override button styles */
        .card button,
        .card [role="button"],
        .card .btn,
        .card .button {
          font-size: 12px !important;
          padding: 4px 8px !important;
          border-radius: 8px !important;
          line-height: 1.2 !important;
          background: var(--primary-600) !important;
          color: #fff !important;
          border: none !important;
        }
        .card button:hover,
        .card button:active,
        .card [role="button"]:hover,
        .card [role="button"]:active {
          background: var(--primary-600) !important;
          color: #fff !important;
        }
        .card button:disabled,
        .card [aria-disabled="true"] {
          background: var(--primary-600) !important;
          color: #fff !important;
          opacity: .55 !important;
        }
      `}</style>

      {/* Header */}
      <header className="dashboard-header">
        <h1 className="app__title">LoTUS-BF</h1>
        <div className="app__subtitle">Location-or-Term Unified Search for Brain Functions</div>
      </header>

      {/* Search Bar */}
      <div className="dashboard-search-bar">
        <QueryBuilder query={query} setQuery={setQuery} />
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left: Terms Card (Fixed) */}
        <aside className="dashboard-left">
          <div className="card" style={{ padding: '12px' }}>
            <div className="card__title" style={{ marginBottom: '10px' }}>Terms</div>
            <Terms onPickTerm={handlePickTerm} />
          </div>
        </aside>

        {/* Right: Collapsible Cards */}
        <main className={`dashboard-right ${bothOpen ? 'split-layout' : ''}`}>
          {/* Studies Card */}
          <div className={`collapsible-card ${studiesOpen ? 'full-height' : ''}`}>
            <div 
              className="collapsible-card__header"
              onClick={() => setStudiesOpen(!studiesOpen)}
            >
              <div className="collapsible-card__title">
                <span className="card-icon">📊</span>
                Studies
              </div>
              <span className={`collapsible-card__toggle ${studiesOpen ? 'open' : ''}`}>
                ▼
              </span>
            </div>
            <div className={`collapsible-card__content ${studiesOpen ? 'open' : ''}`}>
              <div className="collapsible-card__body">
                <Studies query={query} />
              </div>
            </div>
          </div>

          {/* Brain Visualization Card */}
          <div className={`collapsible-card ${niiOpen ? 'full-height' : ''}`}>
            <div 
              className="collapsible-card__header"
              onClick={() => setNiiOpen(!niiOpen)}
            >
              <div className="collapsible-card__title">
                <span className="card-icon">🧠</span>
                Brain Visualization
              </div>
              <span className={`collapsible-card__toggle ${niiOpen ? 'open' : ''}`}>
                ▼
              </span>
            </div>
            <div className={`collapsible-card__content ${niiOpen ? 'open' : ''}`}>
              <div className="collapsible-card__body" style={{ padding: '12px' }}>
                <NiiViewer query={query} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}