import { Link } from 'react-router-dom'

export default function ComingSoon({ title }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <div
        className="hashtag-badge"
        style={{ display: 'inline-flex', marginBottom: '2rem', cursor: 'default' }}
      >
        Coming Soon
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: 'white',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: 'rgba(255,255,255,0.45)',
          marginTop: '1rem',
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
        }}
      >
        This section is being built. Check back soon.
      </p>
      <Link
        to="/chapter"
        className="pill-button orange"
        style={{ marginTop: '2.5rem', display: 'inline-flex' }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
