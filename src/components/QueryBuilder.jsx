import { useState, useRef, useEffect } from 'react'

export function QueryBuilder({ query, setQuery }) {
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
      // Set cursor between parentheses
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
      // Trigger search (query already updated via onChange)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setShowOperators(false)
    }
  }

  // Close dropdown when clicking outside
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
    <div className="qb-wrapper">
      <style>{`
        .qb-wrapper {
          position: relative;
          width: 100%;
        }

        .qb-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 2px solid var(--gray-300);
          border-radius: 8px;
          padding: 4px 4px 4px 12px;
          transition: all 0.2s;
        }

        .qb-container:focus-within {
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px var(--primary-100);
        }

        .qb-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 8px 0;
          font-size: 14px;
          color: var(--gray-900);
          background: transparent;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .qb-input::placeholder {
          color: var(--gray-400);
        }

        .qb-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .qb-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          border: 1px solid var(--gray-300);
          background: white;
          color: var(--gray-700);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .qb-btn:hover {
          background: var(--gray-50);
          border-color: var(--gray-400);
        }

        .qb-btn:active {
          transform: scale(0.98);
        }

        .qb-btn--primary {
          background: var(--primary-600);
          border-color: var(--primary-600);
          color: white;
        }

        .qb-btn--primary:hover {
          background: var(--primary-700);
          border-color: var(--primary-700);
        }

        .qb-btn--clear {
          padding: 6px 10px;
          color: var(--gray-500);
        }

        .qb-btn--clear:hover {
          color: var(--gray-700);
        }

        .qb-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 280px;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 50;
          overflow: hidden;
          animation: dropdownSlide 0.15s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .qb-dropdown__header {
          padding: 12px 16px;
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-200);
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-700);
        }

        .qb-dropdown__list {
          padding: 4px;
        }

        .qb-dropdown__item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .qb-dropdown__item:hover {
          background: var(--primary-50);
        }

        .qb-dropdown__item-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-600);
        }

        .qb-dropdown__item-desc {
          font-size: 12px;
          color: var(--gray-500);
        }

        .qb-hint {
          margin-top: 8px;
          font-size: 12px;
          color: var(--gray-500);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qb-hint__icon {
          color: var(--gray-400);
        }

        .qb-hint__shortcut {
          padding: 2px 6px;
          background: var(--gray-100);
          border-radius: 4px;
          font-family: monospace;
          font-size: 11px;
          color: var(--gray-600);
        }
      `}</style>

      <div className="qb-container">
        <input
          ref={inputRef}
          type="search"
          className="qb-input"
          placeholder="Search for brain regions, terms, or coordinates... e.g., emotion OR [-22,-4,18]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        
        <div className="qb-actions">
          <button
            type="button"
            className="qb-btn"
            onClick={() => setShowOperators(!showOperators)}
            title="Insert logical operators"
          >
            <span>⊕</span>
            <span>Operators</span>
          </button>
          
          {query && (
            <button
              type="button"
              className="qb-btn qb-btn--clear"
              onClick={() => setQuery('')}
              title="Clear query"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showOperators && (
        <div ref={dropdownRef} className="qb-dropdown">
          <div className="qb-dropdown__header">
            Logical Operators
          </div>
          <div className="qb-dropdown__list">
            {operators.map((op) => (
              <div
                key={op.label}
                className="qb-dropdown__item"
                onClick={() => insertOperator(op.label)}
              >
                <div className="qb-dropdown__item-label">{op.label}</div>
                <div className="qb-dropdown__item-desc">{op.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="qb-hint">
        <span className="qb-hint__icon">💡</span>
        <span>
          Press <kbd className="qb-hint__shortcut">Enter</kbd> to search, or use{' '}
          <kbd className="qb-hint__shortcut">Operators</kbd> for advanced queries
        </span>
      </div>
    </div>
  )
}