import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'

export function Terms ({ onPickTerm, highlightedTerms = [] }) {
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    const ac = new AbortController()
    const load = async () => {
      setLoading(true)
      setErr('')
      try {
        const res = await fetch(`${API_BASE}/terms`, { signal: ac.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return
        setTerms(Array.isArray(data?.terms) ? data.terms : [])
      } catch (e) {
        if (!alive) return
        setErr(`Failed to fetch terms: ${e?.message || e}`)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false; ac.abort() }
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return terms
    return terms.filter(t => t.toLowerCase().includes(s))
  }, [terms, search])

  const isHighlighted = (term) => {
    const lower = term.toLowerCase()
    return highlightedTerms.some(h => lower.includes(h) || h.includes(lower))
  }

  return (
    <div className='terms'>
      <style>{`
        .terms { display: flex; flex-direction: column; gap: 12px; height: 100%; }
        
        .terms__controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .terms__controls .input {
          flex: 1;
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        
        .terms__controls .input:focus {
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        
        .terms__skeleton {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .terms__skeleton-row {
          height: 32px;
          background: #f3f4f6;
          border-radius: 6px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .alert {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
        }
        
        .alert--error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        
        .terms__list {
          flex: 1;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fafafa;
        }
        
        .terms__empty {
          padding: 20px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }
        
        .terms__ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .terms__li {
          border-bottom: 1px solid #e5e7eb;
        }
        
        .terms__li:last-child {
          border-bottom: none;
        }
        
        .terms__name {
          display: block;
          padding: 8px 12px;
          color: #2563eb;
          text-decoration: none;
          font-size: 13px;
          transition: background-color 0.15s ease;
          position: relative;
        }
        
        .terms__name:hover {
          background: white;
          text-decoration: underline;
        }
        
        .terms__name.highlighted {
          background: #fef3c7;
          font-weight: 600;
          border-left: 3px solid #f59e0b;
          padding-left: 9px;
        }
        
        .terms__name.highlighted::before {
          content: "⭐";
          margin-right: 6px;
          font-size: 12px;
        }
        
        .terms__hint {
          padding: 8px 12px;
          font-size: 12px;
          color: #6b7280;
          background: #fef3c7;
          border-bottom: 1px solid #fde68a;
        }
      `}</style>

      <div className='terms__controls'>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search terms…'
          className='input'
        />
        <button
          onClick={() => setSearch('')}
          className='btn btn--primary'
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>

      {loading && (
        <div className='terms__skeleton'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='terms__skeleton-row' />
          ))}
        </div>
      )}

      {err && (
        <div className='alert alert--error'>
          {err}
        </div>
      )}

      {!loading && !err && (
        <div className='terms__list'>
          {highlightedTerms.length > 0 && (
            <div className='terms__hint'>
              ⭐ Highlighted terms appear frequently in selected studies
            </div>
          )}
          {filtered.length === 0 ? (
            <div className='terms__empty'>No terms found</div>
          ) : (
            <ul className='terms__ul'>
              {filtered.slice(0, 500).map((t, idx) => {
                const highlighted = isHighlighted(t)
                return (
                  <li key={`${t}-${idx}`} className='terms__li'>
                    <a
                      href="#"
                      className={`terms__name ${highlighted ? 'highlighted' : ''}`}
                      title={t}
                      aria-label={`Add term ${t}`}
                      onClick={(e) => { e.preventDefault(); onPickTerm?.(t); }}
                    >
                      {t}
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}