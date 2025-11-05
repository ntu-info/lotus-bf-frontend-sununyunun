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

  // Panel visibility states
  const [visiblePanels, setVisiblePanels] = useState(['studies', 'viewer'])
  
  // Selected studies for brain viewer filtering
  const [selectedStudies, setSelectedStudies] = useState([])
  
  // Study detail panel
  const [detailStudy, setDetailStudy] = useState(null)

  const handleStudySelection = useCallback((studies) => {
    setSelectedStudies(studies)
  }, [])

  const togglePanel = (panel) => {
    setVisiblePanels(prev => {
      if (prev.includes(panel)) {
        return prev.filter(p => p !== panel)
      } else {
        return [...prev, panel]
      }
    })
  }

  const isPanelVisible = (panel) => visiblePanels.includes(panel)

  return (
    <div className="lotus-app">
      {/* Header with Logo + Search */}
      <header className="lotus-header">
        <div className="lotus-header__brand">
          <h1 className="lotus-logo">LoTUS-BF</h1>
          <span className="lotus-tagline">Brain Function Search Platform</span>
        </div>
        <div className="lotus-header__search">
          <QueryBuilder query={query} setQuery={setQuery} />
        </div>
      </header>

      {/* Panel Toggle Bar */}
      <nav className="lotus-panel-toggle">
        <button 
          className={`panel-toggle-btn ${isPanelVisible('terms') ? 'active' : ''}`}
          onClick={() => togglePanel('terms')}
        >
          <span className="btn-icon">📚</span>
          <span>Terms</span>
        </button>
        <button 
          className={`panel-toggle-btn ${isPanelVisible('studies') ? 'active' : ''}`}
          onClick={() => togglePanel('studies')}
        >
          <span className="btn-icon">📊</span>
          <span>Studies</span>
        </button>
        <button 
          className={`panel-toggle-btn ${isPanelVisible('viewer') ? 'active' : ''}`}
          onClick={() => togglePanel('viewer')}
        >
          <span className="btn-icon">🧠</span>
          <span>Brain Viewer</span>
        </button>
      </nav>

      {/* Main Content Grid */}
      <main className="lotus-content">
        {/* Empty State when no panels visible */}
        {visiblePanels.length === 0 && (
          <div className="lotus-empty-state">
            <div className="empty-state-icon">🧠</div>
            <h2 className="empty-state-title">No panels selected</h2>
            <p className="empty-state-desc">
              Select at least one panel from the toolbar above to begin exploring brain function data
            </p>
          </div>
        )}

        {/* Terms Panel */}
        {isPanelVisible('terms') && (
          <aside className="lotus-panel lotus-panel--terms">
            <div className="lotus-panel__header">
              <h2 className="lotus-panel__title">Available Terms</h2>
            </div>
            <div className="lotus-panel__body">
              <Terms onPickTerm={handlePickTerm} />
            </div>
          </aside>
        )}

        {/* Studies Panel */}
        {isPanelVisible('studies') && (
          <section className="lotus-panel lotus-panel--studies">
            <div className="lotus-panel__body">
              <Studies 
                query={query}
                onSelectionChange={handleStudySelection}
                onStudyClick={setDetailStudy}
              />
            </div>
          </section>
        )}

        {/* Brain Viewer Panel */}
        {isPanelVisible('viewer') && (
          <section className="lotus-panel lotus-panel--viewer">
            <div className="lotus-panel__body">
              <NiiViewer 
                query={query}
                selectedStudies={selectedStudies}
              />
            </div>
          </section>
        )}
      </main>

      {/* Detail Panel Overlay */}
      {detailStudy && (
        <>
          <div className="lotus-overlay" onClick={() => setDetailStudy(null)} />
          <aside className="lotus-detail-panel">
            <header className="lotus-detail-panel__header">
              <h3>Study Details</h3>
              <button 
                className="lotus-close-btn"
                onClick={() => setDetailStudy(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <div className="lotus-detail-panel__body">
              <h2 className="detail-title">{detailStudy.title}</h2>
              
              <dl className="detail-meta">
                {detailStudy.authors && (
                  <>
                    <dt>Authors</dt>
                    <dd>{detailStudy.authors}</dd>
                  </>
                )}
                {detailStudy.journal && (
                  <>
                    <dt>Journal</dt>
                    <dd>{detailStudy.journal}</dd>
                  </>
                )}
                {detailStudy.year && (
                  <>
                    <dt>Year</dt>
                    <dd>{detailStudy.year}</dd>
                  </>
                )}
                {detailStudy.study_id && (
                  <>
                    <dt>PMID</dt>
                    <dd>
                      <a 
                        href={`https://pubmed.ncbi.nlm.nih.gov/${detailStudy.study_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        {detailStudy.study_id}
                      </a>
                    </dd>
                  </>
                )}
              </dl>

              {detailStudy.abstract && (
                <div className="detail-abstract">
                  <h4>Abstract</h4>
                  <p>{detailStudy.abstract}</p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}