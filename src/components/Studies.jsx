import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'

function classNames (...xs) { return xs.filter(Boolean).join(' ') }

export function Studies ({ query, onSelectionChange, onStudyClick }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const pageSize = 10
  // ✅ 新增收藏功能
  const [favoritedIds, setFavoritedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('lotus-favorited-studies')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // ✅ 儲存收藏到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lotus-favorited-studies', JSON.stringify([...favoritedIds]))
    } catch (e) {
      console.error('Failed to save favorites:', e)
    }
  }, [favoritedIds])

  // ✅ 切換收藏狀態
  const toggleFavorite = (studyId) => {
    setFavoritedIds(prev => {
      const next = new Set(prev)
      if (next.has(studyId)) {
        next.delete(studyId)
      } else {
        next.add(studyId)
      }
      return next
    })
  }
  useEffect(() => { setPage(1); setSelectedIds(new Set()) }, [query])

  useEffect(() => {
    if (!query) return
    let alive = true
    const ac = new AbortController()
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const url = `${API_BASE}/query/${encodeURIComponent(query)}/studies`
        const res = await fetch(url, { signal: ac.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!alive) return
        const list = Array.isArray(data?.results) ? data.results : []
        setRows(list)
      } catch (e) {
        if (!alive) return
        setErr(`Unable to fetch studies: ${e?.message || e}`)
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [query])

  useEffect(() => {
    const selected = rows.filter((r, i) => selectedIds.has(i))
    onSelectionChange?.(selected)
  }, [selectedIds, rows, onSelectionChange])

  const changeSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const A = a?.[sortKey]
      const B = b?.[sortKey]
      if (sortKey === 'year') return (Number(A || 0) - Number(B || 0)) * dir
      return String(A || '').localeCompare(String(B || ''), 'en') * dir
    })
    return arr
  }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelection = (idx) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(sorted.map((_, i) => i)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const getArticleUrl = (study) => {
    if (study.study_id) return `https://pubmed.ncbi.nlm.nih.gov/${study.study_id}/`
    return null
  }

  const truncateAbstract = (text) => {
    if (!text) return ''
    const maxLength = 200
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className='studies-neon-container'>
      <style>{`
        .studies-neon-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .studies-neon-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
          background: rgba(0, 0, 0, 0.2);
        }
        .studies-neon-info {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .studies-neon-info .highlight {
          color: var(--neon-cyan);
          font-weight: 700;
        }
        .studies-neon-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .studies-neon-actions button {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s;
        }
        .studies-neon-actions button:hover {
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
        }
        .studies-neon-sort {
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .studies-neon-sort select {
          padding: 6px 12px;
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.05);
          color: #70b4c4ff;                      /* ✅ 改成亮青白，字清晰 */
          cursor: pointer;
          transition: all 0.3s;
          appearance: none;                    /* ✅ 移除原生樣式 */
          -webkit-appearance: none;
          -moz-appearance: none;
        }
        .studies-neon-sort select option {
          background: rgba(15, 25, 35, 0.95);  /* ✅ option 列表深底 */
          color: #e0faff;                      /* ✅ 亮青白字 */
        }
        .studies-neon-sort select:focus {
          outline: none;
          border-color: var(--neon-cyan);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
        }
        .studies-neon-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          min-height: 0;
        }
        .study-neon-item {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        /* ✅ 新增:收藏按鈕 */
        /* ✅ 修改後的星星按鈕樣式 */
        .study-neon-favorite {
          position: absolute;
          top: 10px;
          left: 0px;
          width: auto;                     /* ✅ 改為自動寬度 */
          height: auto;                    /* ✅ 改為自動高度 */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;                /* ✅ 完全移除背景 */
          border: none;                    /* ✅ 完全移除邊框 */
          padding: 0;                      /* ✅ 移除內距 */
          cursor: pointer;
          transition: all 0.3s;
          z-index: 10;
          font-size: 20px;                 /* ✅ 調整大小 */
          color: rgba(255, 193, 7, 0.4);   /* ✅ 未收藏時淡色 */
          line-height: 1;
        }

        .study-neon-favorite:hover {
          transform: scale(1.15);
          color: #fbbf24;
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.8));
        }

        .study-neon-favorite.favorited {
          color: #fbbf24;
          filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.9));
        }

        /* ✅ 移除或簡化動畫 */
        @keyframes starPulse {
          0%, 100% { 
            opacity: 1;
          }
          50% { 
            opacity: 0.8;
          }
        }

        .study-neon-favorite.favorited {
          animation: starPulse 2s ease-in-out infinite;
        }
        .study-neon-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(180, 124, 255, 0.05) 100%);
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: 12px;
        }
        .study-neon-item:hover::before {
          opacity: 1;
        }
        .study-neon-item:hover {
          background: rgba(0, 240, 255, 0.05);
          border: 1px solid rgba(0, 240, 255, 0.3);
          box-shadow: 0 4px 20px rgba(0, 240, 255, 0.2);
          transform: translateX(4px);
        }
        .study-neon-checkbox {
          flex-shrink: 0;
          margin-top: 2px;
          z-index: 1;
        }
        .study-neon-checkbox input {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: var(--neon-cyan);
          border-radius: 6px;
          transition: all 0.3s;
        }
        .study-neon-checkbox input:checked {
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.8);
        }
        .study-neon-content {
          flex: 1;
          min-width: 0;
          z-index: 1;
        }
        .study-neon-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 10px;
          cursor: pointer;
          line-height: 1.4;
        }
        .study-neon-title a {
          color: var(--neon-cyan);
          text-decoration: none;
          transition: all 0.3s;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
        }
        .study-neon-title a:hover {
          text-shadow: 0 0 20px rgba(0, 240, 255, 0.8);
          filter: brightness(1.2);
        }
        .study-neon-title span {
          color: var(--neon-cyan);
          cursor: pointer;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
        }
        .study-neon-meta {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 10px;
          line-height: 1.6;
        }
        .study-neon-meta-journal {
          font-style: italic;
          color: var(--text-muted);
        }
        .study-neon-pmid {
          color: var(--neon-purple);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }
        .study-neon-pmid:hover {
          text-shadow: 0 0 15px rgba(180, 124, 255, 0.8);
        }
        .study-neon-abstract {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 12px;
        }
        .study-neon-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .study-neon-tag {
          background: rgba(75, 85, 99, 0.3);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s;
        }
        .study-neon-tag.pmid-tag {
          background: rgba(180, 124, 255, 0.2);
          color: var(--neon-purple);
          border-color: rgba(180, 124, 255, 0.4);
          box-shadow: 0 0 10px rgba(180, 124, 255, 0.3);
        }
        .study-neon-tag.selected-tag {
          background: rgba(0, 255, 136, 0.2);
          color: var(--neon-green);
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
          animation: selectedPulse 2s ease-in-out infinite;
        }
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 136, 0.3); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.6); }
        }
        .studies-neon-loading {
          padding: 60px 20px;
          text-align: center;
        }
        .studies-neon-error {
          margin: 20px;
          padding: 16px 20px;
          background: rgba(255, 0, 110, 0.1);
          border: 1px solid rgba(255, 0, 110, 0.3);
          border-radius: 12px;
          color: var(--neon-pink);
          font-size: 14px;
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.3);
        }
        .studies-neon-empty {
          padding: 80px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 15px;
        }
        .studies-neon-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid var(--glass-border);
          font-size: 14px;
          flex-shrink: 0;
          background: rgba(0, 0, 0, 0.2);
        }
        .studies-neon-footer-info {
          color: var(--text-secondary);
        }
        .studies-neon-footer-info b {
          color: var(--neon-cyan);
          font-weight: 700;
        }
        .studies-neon-footer-pages {
          display: flex;
          gap: 8px;
        }
        .studies-neon-footer button {
          padding: 8px 14px;
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s;
        }
        .studies-neon-footer button:hover:not(:disabled) {
          background: rgba(0, 240, 255, 0.1);
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
        }
        .studies-neon-footer button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .skeleton-neon-line {
          height: 60px;
          background: linear-gradient(
            90deg,
            rgba(30, 41, 59, 0.4) 0%,
            rgba(0, 240, 255, 0.15) 50%,
            rgba(30, 41, 59, 0.4) 100%
          );
          background-size: 200% 100%;
          animation: skeletonShimmer 2s ease-in-out infinite;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid rgba(0, 240, 255, 0.2);
        }
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className='studies-neon-header'>
        <div className='studies-neon-info'>
          {query ? (
            <>
              <span className='highlight'>{sorted.length}</span> results
              {selectedIds.size > 0 && <> • <span className='highlight'>{selectedIds.size}</span> selected</>}
            </>
          ) : (
            'Enter a query to search'
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {sorted.length > 0 && (
            <div className='studies-neon-actions'>
              <button onClick={selectAll}>Select All</button>
              <button onClick={deselectAll}>Clear</button>
            </div>
          )}
          {sorted.length > 0 && (
            <div className='studies-neon-sort'>
              <span>Sort:</span>
              <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setSortDir('desc') }}>
                <option value='year'>Year</option>
                <option value='title'>Title</option>
                <option value='authors'>Authors</option>
                <option value='journal'>Journal</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{ padding: '6px 10px', fontSize: '13px' }}>
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          )}
        </div>
      </div>

      {query && loading && (
        <div className='studies-neon-loading'>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='skeleton-neon-line' />
            ))}
          </div>
        </div>
      )}

      {query && err && (
        <div className='studies-neon-error'>{err}</div>
      )}

      {!query && !loading && (
        <div className='studies-neon-empty'>Please enter a search query above</div>
      )}

      {query && !loading && !err && pageRows.length === 0 && (
        <div className='studies-neon-empty'>No studies found</div>
      )}

      {query && !loading && !err && pageRows.length > 0 && (
        <div className='studies-neon-list'>
          {pageRows.map((study, pageIdx) => {
            const globalIdx = (page - 1) * pageSize + pageIdx
            const url = getArticleUrl(study)
            const isSelected = selectedIds.has(globalIdx)
            
            return (
              <div key={pageIdx} className='study-neon-item'>
                <button
                  className={`study-neon-favorite ${favoritedIds.has(study.study_id) ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(study.study_id)
                  }}
                  title={favoritedIds.has(study.study_id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favoritedIds.has(study.study_id) ? '★' : '☆'}
                </button>

                <div className='study-neon-checkbox'>
                  <input
                    type='checkbox'
                    checked={isSelected}
                    onChange={() => toggleSelection(globalIdx)}
                    aria-label={`Select ${study.title}`}
                  />
                </div>
                
                <div className='study-neon-content'>
                  <div className='study-neon-title' onClick={() => onStudyClick?.(study)}>
                    {url ? (
                      <a href={url} target='_blank' rel='noopener noreferrer' onClick={(e) => e.stopPropagation()}>
                        {study.title || 'Untitled'}
                      </a>
                    ) : (
                      <span>
                        {study.title || 'Untitled'}
                      </span>
                    )}
                  </div>
                  
                  <div className='study-neon-meta'>
                    {study.authors && <span>{study.authors} – </span>}
                    {study.journal && <span className='study-neon-meta-journal'>{study.journal}. </span>}
                    {study.year && <span>({study.year})</span>}
                    {study.study_id && (
                      <>
                        <br />
                        <span>PMID: </span>
                        <a href={`https://pubmed.ncbi.nlm.nih.gov/${study.study_id}/`} target='_blank' rel='noopener noreferrer' className='study-neon-pmid' onClick={(e) => e.stopPropagation()}>
                          {study.study_id}
                        </a>
                      </>
                    )}
                  </div>

                  {study.abstract && (
                    <div className='study-neon-abstract'>
                      {truncateAbstract(study.abstract)}
                    </div>
                  )}

                  <div className='study-neon-tags'>
                    {isSelected && <span className='study-neon-tag selected-tag'>✓ Selected</span>}
                    {study.study_id && <span className='study-neon-tag pmid-tag'>PMID: {study.study_id}</span>}
                    {study.contrast_id && <span className='study-neon-tag'>Contrast: {study.contrast_id}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {query && !loading && !err && sorted.length > 0 && (
        <div className='studies-neon-footer'>
          <div className='studies-neon-footer-info'>
            Page <b>{page}</b> of <b>{totalPages}</b> ({sorted.length} total)
          </div>
          <div className='studies-neon-footer-pages'>
            <button disabled={page <= 1} onClick={() => setPage(1)}>⏮</button>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>⏭</button>
          </div>
        </div>
      )}
    </div>
  )
}