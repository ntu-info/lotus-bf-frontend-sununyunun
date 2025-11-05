import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'

function classNames (...xs) { return xs.filter(Boolean).join(' ') }

export function Studies ({ query }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => { setPage(1) }, [query])

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

  // Generate article URL from study_id (PMID)
  const getArticleUrl = (study) => {
    if (study.study_id) return `https://pubmed.ncbi.nlm.nih.gov/${study.study_id}/`
    return null
  }

  // Truncate abstract to 2 lines (~200 chars)
  const truncateAbstract = (text) => {
    if (!text) return ''
    const maxLength = 200
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className='studies-container'>
      <style>{`
        .studies-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .studies-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }
        .studies-sort {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
        }
        .studies-sort select {
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 12px;
        }
        .studies-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .study-item {
          padding: 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .study-item:last-child {
          border-bottom: none;
        }
        .study-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .study-title a {
          color: #2563eb;
          text-decoration: none;
        }
        .study-title a:hover {
          text-decoration: underline;
        }
        .study-meta {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        .study-meta-journal {
          font-style: italic;
        }
        .study-pmid {
          color: #2563eb;
          text-decoration: none;
        }
        .study-pmid:hover {
          text-decoration: underline;
        }
        .study-abstract {
          font-size: 13px;
          color: #374151;
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .study-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .study-tag {
          background: #f3f4f6;
          color: #4b5563;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .study-tag.pmid-tag {
          background: #dbeafe;
          color: #1e40af;
        }
        .studies-loading {
          padding: 40px 16px;
          text-align: center;
        }
        .studies-error {
          margin: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          font-size: 13px;
        }
        .studies-empty {
          padding: 40px 16px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        .studies-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          flex-shrink: 0;
        }
        .studies-footer-pages {
          display: flex;
          gap: 6px;
        }
        .studies-footer button {
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 12px;
        }
        .studies-footer button:hover:not(:disabled) {
          background: #f9fafb;
        }
        .studies-footer button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .skeleton-line {
          height: 16px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: loading 1.5s ease-in-out infinite;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className='studies-header'>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          {query ? `${sorted.length} results` : 'Enter a query to search'}
        </div>
        {sorted.length > 0 && (
          <div className='studies-sort'>
            <span>Sort by:</span>
            <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setSortDir('desc') }}>
              <option value='year'>Year</option>
              <option value='title'>Title</option>
              <option value='authors'>Authors</option>
              <option value='journal'>Journal</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{ padding: '4px 8px', fontSize: '12px' }}>
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {query && loading && (
        <div className='studies-loading'>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ marginBottom: '24px' }}>
                <div className='skeleton-line' style={{ width: '80%' }} />
                <div className='skeleton-line' style={{ width: '60%' }} />
                <div className='skeleton-line' style={{ width: '90%' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {query && err && (
        <div className='studies-error'>{err}</div>
      )}

      {!query && !loading && (
        <div className='studies-empty'>Please enter a search query above</div>
      )}

      {query && !loading && !err && pageRows.length === 0 && (
        <div className='studies-empty'>No studies found</div>
      )}

      {query && !loading && !err && pageRows.length > 0 && (
        <div className='studies-list'>
          {pageRows.map((study, idx) => {
            const url = getArticleUrl(study)
            return (
              <div key={idx} className='study-item'>
                <div className='study-title'>
                  {url ? (
                    <a href={url} target='_blank' rel='noopener noreferrer'>
                      {study.title || 'Untitled'}
                    </a>
                  ) : (
                    <span>{study.title || 'Untitled'}</span>
                  )}
                </div>
                
                <div className='study-meta'>
                  {study.authors && <span>{study.authors} — </span>}
                  {study.journal && <span className='study-meta-journal'>{study.journal}. </span>}
                  {study.year && <span>({study.year})</span>}
                  {study.study_id && (
                    <>
                      <br />
                      <span>PMID: </span>
                      <a href={`https://pubmed.ncbi.nlm.nih.gov/${study.study_id}/`} target='_blank' rel='noopener noreferrer' className='study-pmid'>
                        {study.study_id}
                      </a>
                    </>
                  )}
                </div>

                {study.abstract && (
                  <div className='study-abstract'>
                    {truncateAbstract(study.abstract)}
                  </div>
                )}

                <div className='study-tags'>
                  {study.study_id && <span className='study-tag pmid-tag'>PMID: {study.study_id}</span>}
                  {study.contrast_id && <span className='study-tag'>Contrast: {study.contrast_id}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {query && !loading && !err && sorted.length > 0 && (
        <div className='studies-footer'>
          <div>
            Page <b>{page}</b> of <b>{totalPages}</b> ({sorted.length} total)
          </div>
          <div className='studies-footer-pages'>
            <button disabled={page <= 1} onClick={() => setPage(1)}>⮜</button>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>⮞</button>
          </div>
        </div>
      )}
    </div>
  )
}