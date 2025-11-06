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
    <div className='terms-neon'>
      <style>{`
        .terms-neon { 
          display: flex; 
          flex-direction: column; 
          gap: 16px; 
          max-height: 100%;
        }

        
        .terms-neon__controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .terms-neon__input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(10px);
          color: var(--text-primary);
          transition: all 0.3s;
        }
        
        .terms-neon__input:focus {
          border-color: var(--neon-cyan);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
          background: rgba(0, 240, 255, 0.05);
        }

        .terms-neon__input::placeholder {
          color: var(--text-muted);
        }
        
        .terms-neon__btn {
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s;
        }

        .terms-neon__btn:hover {
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }
        
        .terms-neon__skeleton {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .terms-neon__skeleton-row {
          height: 40px;
          background: linear-gradient(
            90deg,
            rgba(30, 41, 59, 0.4) 0%,
            rgba(0, 240, 255, 0.1) 50%,
            rgba(30, 41, 59, 0.4) 100%
          );
          background-size: 200% 100%;
          border-radius: 8px;
          animation: neonPulse 2s ease-in-out infinite;
          border: 1px solid rgba(0, 240, 255, 0.2);
        }
        
        @keyframes neonPulse {
          0% { background-position: 200% 0; opacity: 0.6; }
          50% { background-position: -200% 0; opacity: 1; }
          100% { background-position: 200% 0; opacity: 0.6; }
        }
        
        .terms-neon__alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          background: rgba(255, 0, 110, 0.1);
          border: 1px solid rgba(255, 0, 110, 0.3);
          color: var(--neon-pink);
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.3);
        }
        
        /* ✅ 限制清單高度與 Studies 對齊，內容可滾動 */
        .terms-neon__list {
          flex: 1;
          overflow-y: auto;
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 12px;
          background: rgba(10, 14, 26, 0.4);
          backdrop-filter: blur(10px);
          max-height: 65vh; /* <<< 關鍵：限制與 Studies 高度一致 */
        }
        
        .terms-neon__empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        
        .terms-neon__ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .terms-neon__li {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .terms-neon__li:last-child {
          border-bottom: none;
        }
        
        .terms-neon__name {
          display: block;
          padding: 12px 16px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: pointer;
        }

        .terms-neon__name::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0;
          background: linear-gradient(90deg, var(--neon-cyan) 0%, transparent 100%);
          transition: width 0.3s;
        }
        
        .terms-neon__name:hover {
          background: rgba(0, 240, 255, 0.1);
          color: var(--neon-cyan);
          padding-left: 20px;
        }

        .terms-neon__name:hover::before {
          width: 4px;
        }
        
        .terms-neon__name.highlighted {
          background: rgba(255, 193, 7, 0.15);
          font-weight: 600;
          border-left: 3px solid #fbbf24;
          padding-left: 16px;
          color: #fbbf24;
          box-shadow: inset 0 0 20px rgba(251, 191, 36, 0.2);
        }
        
        .terms-neon__name.highlighted::after {
          content: "⭐";
          margin-left: 8px;
          font-size: 12px;
          filter: drop-shadow(0 0 8px #fbbf24);
          animation: starGlow 2s ease-in-out infinite;
        }

        @keyframes starGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .terms-neon__name.highlighted:hover {
          background: rgba(255, 193, 7, 0.25);
          box-shadow: 
            inset 0 0 30px rgba(251, 191, 36, 0.3),
            0 0 20px rgba(251, 191, 36, 0.5);
        }
        
        .terms-neon__hint {
          padding: 12px 16px;
          font-size: 12px;
          color: #854d0e;
          background: rgba(255, 193, 7, 0.2);
          border-bottom: 1px solid rgba(251, 191, 36, 0.3);
          display: flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(10px);
        }

        .terms-neon__hint-icon {
          filter: drop-shadow(0 0 8px #fbbf24);
        }
      `}</style>

      <div className='terms-neon__controls'>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search terms…'
          className='terms-neon__input'
        />
        <button
          onClick={() => setSearch('')}
          className='terms-neon__btn'
        >
          Clear
        </button>
      </div>

      {loading && (
        <div className='terms-neon__skeleton'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='terms-neon__skeleton-row' />
          ))}
        </div>
      )}

      {err && (
        <div className='terms-neon__alert'>
          {err}
        </div>
      )}

      {!loading && !err && (
        <div className='terms-neon__list'>
          {highlightedTerms.length > 0 && (
            <div className='terms-neon__hint'>
              <span className='terms-neon__hint-icon'>⭐</span>
              <span>Highlighted terms appear frequently in selected studies</span>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className='terms-neon__empty'>No terms found</div>
          ) : (
            <ul className='terms-neon__ul'>
              {filtered.slice(0, 500).map((t, idx) => {
                const highlighted = isHighlighted(t)
                return (
                  <li key={`${t}-${idx}`} className='terms-neon__li'>
                    <a
                      href="#"
                      className={`terms-neon__name ${highlighted ? 'highlighted' : ''}`}
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