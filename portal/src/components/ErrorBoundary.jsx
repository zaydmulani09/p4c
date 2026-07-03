import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#1a365d',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '1.5rem', opacity: 0.4 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: '1.75rem',
            color: 'white',
            marginBottom: '0.75rem',
            letterSpacing: '-0.03em',
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '2rem',
          }}
        >
          Try refreshing the page. If the problem persists, contact the P4C team.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.65rem 2rem',
            background: '#F6AA3C',
            color: '#1a365d',
            border: 'none',
            borderRadius: '9999px',
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          Refresh Page
        </button>
      </div>
    )
  }
}
