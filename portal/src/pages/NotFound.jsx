import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)', display: 'flex', flexDirection: 'column' }}>
      <Navbar darkBg />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8rem 1.5rem 4rem',
          textAlign: 'center',
        }}
      >
        <div className="fade-up" style={{ maxWidth: '520px' }}>
          {/* Giant 404 */}
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(7rem, 20vw, 12rem)',
              lineHeight: 1,
              color: 'rgba(255,255,255,0.06)',
              letterSpacing: '-0.05em',
              userSelect: 'none',
              marginBottom: '-1rem',
            }}
          >
            404
          </div>

          <div className="hashtag-badge" style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
            N O T   F O U N D
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: 'white',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            }}
          >
            This page doesn't exist.
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-accent-serif)',
              fontStyle: 'italic',
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '2.5rem',
              lineHeight: 1.5,
            }}
          >
            The link may be broken, or the page may have moved.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="pill-button primary">← Portal Home</Link>
            <Link to="/login" className="pill-button secondary">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
