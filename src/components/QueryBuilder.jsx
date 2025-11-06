import { useState, useRef, useEffect } from 'react'

export function QueryBuilder({ query, setQuery, compact = false }) {
  const [showOperators, setShowOperators] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const operators = [
    { label: 'AND', desc: 'Both terms must appear' },
    { label: 'OR', desc: 'Either term can appear' },
    { label: 'NOT', desc: 'Exclude term' },
    { label: '( )', desc: 'Group expressions' },
  ]

  const insertOperator = (op) => {
    const input = inputRef.current
    if (!input) return

    const start = input.selectionStart
    const end = input.selectionEnd
    const text = input.value

    let insertion
    if (op === '( )') {
      insertion = '()'
      const newText = text.substring(0, start) + insertion + text.substring(end)
      setQuery(newText)
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + 1, start + 1)
      }, 0)
    } else {
      insertion = ` ${op} `
      const newText = text.substring(0, start) + insertion + text.substring(end)
      setQuery(newText)
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + insertion.length, start + insertion.length)
      }, 0)
    }

    setShowOperators(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setShowOperators(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowOperators(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="qb-neon-wrapper">
      <style>{`
        .qb-neon-wrapper {
          position: relative;
          width: 100%;
        }

        .qb-neon-container {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 16px;
          padding: 6px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.15);
        }

        .qb-neon-container:focus-within {
          border-color: var(--neon-cyan);
          box-shadow: 
            0 8px 32px 0 rgba(0, 240, 255, 0.3),
            0 0 20px rgba(0, 240, 255, 0.5);
        }

        .qb-neon-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 14px 18px;
          font-size: 15px;
          color: var(--text-primary);
          background: transparent;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 400;
        }

        .qb-neon-input::placeholder {
          color: var(--text-muted);
        }

        .qb-neon-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qb-neon-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .qb-neon-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.5s, height 0.5s;
        }

        .qb-neon-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .qb-neon-btn:hover {
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
          transform: translateY(-2px);
        }

        .qb-neon-btn .btn-icon {
          font-size: 16px;
          filter: drop-shadow(0 0 8px currentColor);
          z-index: 1;
        }

        .qb-neon-btn span {
          z-index: 1;
          position: relative;
        }

        .qb-neon-btn--clear {
          padding: 10px 12px;
          color: var(--text-muted);
        }

        .qb-neon-btn--clear:hover {
          color: var(--neon-pink);
          border-color: var(--neon-pink);
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
        }

        .qb-neon-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          min-width: 320px;
          background: var(--bg-glass);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: var(--glass-shadow-strong);
          z-index: 2000;
          overflow: hidden;
          animation: dropdownNeonSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes dropdownNeonSlide {
          from {
            opacity: 0;
            transform: translateY(-16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .qb-neon-dropdown__header {
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid var(--glass-border);
          font-size: 13px;
          font-weight: 700;
          color: var(--neon-cyan);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .qb-neon-dropdown__list {
          padding: 8px;
        }

        .qb-neon-dropdown__item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .qb-neon-dropdown__item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(180, 124, 255, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .qb-neon-dropdown__item:hover::before {
          opacity: 1;
        }

        .qb-neon-dropdown__item:hover {
          border: 1px solid rgba(0, 240, 255, 0.3);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
        }

        .qb-neon-dropdown__item-label {
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          z-index: 1;
          position: relative;
        }

        .qb-neon-dropdown__item-desc {
          font-size: 13px;
          color: var(--text-secondary);
          z-index: 1;
          position: relative;
        }

        .qb-neon-hint {
          margin-top: 16px;
          font-size: 13px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0.8;
        }

        .qb-neon-hint__icon {
          color: var(--neon-cyan);
          filter: drop-shadow(0 0 10px var(--neon-cyan));
        }

        .qb-neon-hint__shortcut {
          padding: 4px 8px;
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          color: var(--neon-cyan);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
        }
        .qb-neon-container.compact {
          padding: 4px;
          border-radius: 12px;
        }

        .qb-neon-container.compact .qb-neon-input {
          padding: 10px 14px;
          font-size: 14px;
        }

        .qb-neon-container.compact .qb-neon-btn {
          padding: 8px 14px;
          font-size: 13px;
        }

        .qb-neon-container.compact .qb-neon-btn .btn-icon {
          font-size: 14px;
        }

        .qb-neon-container.compact .qb-neon-btn--clear {
          padding: 8px 10px;
        }

        .qb-neon-container.compact ~ .qb-neon-hint {
          display: none;
        }
      `}</style>

      <div className={`qb-neon-container ${compact ? 'compact' : ''}`}>
        <input
          ref={inputRef}
          type="search"
          className="qb-neon-input"
          placeholder="Search brain regions, terms, or coordinates... e.g., emotion OR [-22,-4,18]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        
        <div className="qb-neon-actions">
          <button
            type="button"
            className="qb-neon-btn"
            onClick={() => setShowOperators(!showOperators)}
            title="Insert logical operators"
          >
            <span className="btn-icon">⊕</span>
            <span>Operators</span>
          </button>
          
          {query && (
            <button
              type="button"
              className="qb-neon-btn qb-neon-btn--clear"
              onClick={() => setQuery('')}
              title="Clear query"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showOperators && (
        <div ref={dropdownRef} className="qb-neon-dropdown">
          <div className="qb-neon-dropdown__header">
            Logical Operators
          </div>
          <div className="qb-neon-dropdown__list">
            {operators.map((op) => (
              <div
                key={op.label}
                className="qb-neon-dropdown__item"
                onClick={() => insertOperator(op.label)}
              >
                <div className="qb-neon-dropdown__item-label">{op.label}</div>
                <div className="qb-neon-dropdown__item-desc">{op.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="qb-neon-hint">
        <span className="qb-neon-hint__icon">💡</span>
        <span>
          Press <kbd className="qb-neon-hint__shortcut">Enter</kbd> to search, or use{' '}
          <kbd className="qb-neon-hint__shortcut">Operators</kbd> for advanced queries
        </span>
      </div>
    </div>
  )
}