import { useCallback, useState, useEffect, useRef, useMemo } from 'react'  // ✅ 加入 useMemo
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')
  const [showStickySearch, setShowStickySearch] = useState(false)
  const heroRef = useRef(null)
  const handlePickTerm = useCallback((t) => {
    setQuery((q) => (q ? `${q} ${t}` : t))
  }, [setQuery])
    // 搜尋歷史紀錄
const [searchHistory, setSearchHistory] = useState([]);
const [showHistory, setShowHistory] = useState(false);
const historyRef = useRef(null);

// 讀取 localStorage 歷史
  // Load search history from localStorage on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem('lotus-search-history')
    if (saved) {
      setSearchHistory(JSON.parse(saved))
    }
  } catch (e) {
    console.error('Failed to load search history:', e)
  }
}, [])
// Save to history when query changes (debounced)
  useEffect(() => {
    if (!query || query.trim().length < 2) return
    
    const timer = setTimeout(() => {
      setSearchHistory(prev => {
        // Remove duplicate and add to front
        const filtered = prev.filter(item => item.query !== query)
        const newHistory = [
          { query, timestamp: Date.now() },
          ...filtered
        ].slice(0, 20) // Keep only 20 most recent
        
        // Save to localStorage
        try {
          localStorage.setItem('lotus-search-history', JSON.stringify(newHistory))
        } catch (e) {
          console.error('Failed to save search history:', e)
        }
        
        return newHistory
      })
    }, 1000) // Wait 1 second after user stops typing
    
    return () => clearTimeout(timer)
  }, [query])
// 點擊外部關閉面板
useEffect(() => {
  const handleClickOutside = (e) => {
    if (historyRef.current && !historyRef.current.contains(e.target)) {
      setShowHistory(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// 儲存新查詢（避免重複）
function addToHistory(newQuery) {
  if (!newQuery.trim()) return;
  setSearchHistory(prev => {
    const filtered = prev.filter(h => h.query !== newQuery);
    const updated = [{ query: newQuery, time: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    return updated;
  });
}

// 刪除單筆
function deleteHistory(q) {
  setSearchHistory(prev => {
    const updated = prev.filter(h => h.query !== q);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    return updated;
  });
}

// 清除全部
function clearHistory() {
  setSearchHistory([]);
  localStorage.removeItem('searchHistory');
}

// 顯示相對時間
function formatTime(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return '剛剛';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分鐘前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小時前';
  return Math.floor(diff / 86400) + ' 天前';
}

  // Panel visibility states
  const [visiblePanels, setVisiblePanels] = useState(['studies', 'viewer'])
  
  // Selected studies for brain viewer filtering
  const [selectedStudies, setSelectedStudies] = useState([])
  // ✅ 新增:計算選取文獻中的高頻 terms
  const highlightedTerms = useMemo(() => {
    if (selectedStudies.length === 0) return []
    
    const termFrequency = {}
    selectedStudies.forEach(study => {
      const text = [
        study.title || '',
        study.abstract || '',
        study.keywords || ''
      ].join(' ').toLowerCase()
      
      // 簡單的關鍵詞提取 (可根據需求優化)
      const words = text.match(/\b\w{4,}\b/g) || []
      words.forEach(word => {
        termFrequency[word] = (termFrequency[word] || 0) + 1
      })
    })
    
    // 取出現頻率 >= 2 次的詞
    return Object.entries(termFrequency)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term, _]) => term)
  }, [selectedStudies])

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
  // Detect when hero section scrolls out of view
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setShowStickySearch(!entry.isIntersecting)
        },
        { threshold: 0.1 }
      )

      if (heroRef.current) {
        observer.observe(heroRef.current)
      }

      return () => {
        if (heroRef.current) {
          observer.unobserve(heroRef.current)
        }
      }
    }, [])
  // 新增這三行
  
  return (
    <div className="lotus-app">
      {/* Hero Section */}
      <section ref={heroRef} className="lotus-hero">  {/* 加入 ref={heroRef} */}
        <div className="lotus-hero__container">
          <div className="lotus-hero__content">
            <h1 className="lotus-hero__title">
              Brain Function
              <br />
              Search Platform
            </h1>
            <p className="lotus-hero__subtitle">
              Explore neural activation patterns through advanced meta-analysis.
              <br />
              Query thousands of neuroimaging studies with intelligent term matching.
            </p>
            <div className="lotus-hero__search">
              <QueryBuilder query={query} setQuery={setQuery} />
            </div>
          </div>
          <div className="lotus-hero__image">
            <img 
              src="/Photof.jpg" 
              alt="Brain Visualization" 
              onError={(e) => {
                // Fallback if image not found
                e.target.style.display = 'none'
              }}
            />
          </div>
        </div>
      </section>

      {/* Panel Toggle Navigation */}
      <nav className="lotus-panel-toggle">
        <div className="lotus-panel-toggle__left">  {/* 新增包裹 div */}
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
        </div>
        <div className={`lotus-panel-toggle__search ${showStickySearch ? 'visible' : ''}`}>
          <QueryBuilder query={query} setQuery={setQuery} compact />
        </div>
        <div className="lotus-panel-toggle__history" ref={historyRef}>
          <button 
            className="panel-toggle-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="btn-icon">🕒</span> History
            {searchHistory.length > 0 && (
              <span style={{
                marginLeft: '8px',
                background: 'var(--neon-cyan)',
                color: '#000',
                borderRadius: '8px',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 0 10px var(--neon-cyan)'
              }}>
                {searchHistory.length}
              </span>
            )}
          </button>

          {showHistory && (
            <div className="lotus-history-dropdown">
              {searchHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>尚無搜尋紀錄</div>
              ) : (
                searchHistory.map(item => (
                  <div key={item.query} className="lotus-history-item" onClick={() => { setQuery(item.query); setShowHistory(false); }}>
                    <div className="lotus-history-item__text">{item.query}</div>
                    <div className="lotus-history-item__time">{formatTime(item.time)}</div>
                    <div className="lotus-history-item__delete" onClick={(e) => { e.stopPropagation(); deleteHistory(item.query); }}>×</div>
                  </div>
                ))
              )}
              {searchHistory.length > 0 && (
                <div className="lotus-history-clear">
                  <button onClick={clearHistory}>Clear All</button>
                </div>
              )}
            </div>
          )}
        </div>

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
              <Terms 
                onPickTerm={handlePickTerm}
                highlightedTerms={highlightedTerms}  // ✅ 傳入高頻詞陣列
              />
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