import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_LABELS = {
  national_admin: 'National Admin',
  chapter_lead:   'Chapter Lead',
  volunteer:      'Volunteer',
}

const ROLE_COLORS = {
  national_admin: '#F6AA3C',  // orange — matches site's hashtag badge
  chapter_lead:   '#0d9488',  // teal
  volunteer:      '#16a34a',  // green
}

const ROLE_ROUTES = {
  national_admin: '/admin',
  chapter_lead:   '/chapter',
  volunteer:      '/volunteer',
}

export default function Navbar({ darkBg = false }) {
  const { user, role, signOut } = useAuth()
  const navigate                = useNavigate()
  const [open, setOpen]         = useState(false)

  const close = () => setOpen(false)

  async function handleSignOut() {
    close()
    await signOut()
    navigate('/login')
  }

  const isLoggedIn = !!user

  return (
    <>
      <header
        className="navbar"
        style={darkBg ? { background: 'rgba(13,35,62,0.95)', backdropFilter: 'blur(12px)' } : {}}
      >
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>P4C</Link>

        {/* ── Right side — logged in ───────────────────────── */}
        {isLoggedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Role badge — skewX(-15deg) matching site hashtag badge */}
            {role && (
              <div
                style={{
                  background: ROLE_COLORS[role] ?? '#F6AA3C',
                  color: role === 'national_admin' ? '#1a365d' : 'white',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '0.78rem',
                  padding: '0.35rem 1.1rem',
                  transform: 'skewX(-15deg)',
                  boxShadow: '4px 4px 0px rgba(0,0,0,0.2)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                }}
              >
                {ROLE_LABELS[role]}
              </div>
            )}

            {/* Name / email */}
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.8)',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.user_metadata?.full_name || user.email}
            </span>

            {/* Dashboard link */}
            {role && (
              <Link
                to={ROLE_ROUTES[role]}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#F6AA3C',
                  textDecoration: 'none',
                  transition: 'opacity 0.3s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseOut={e  => (e.currentTarget.style.opacity = '1')}
              >
                Dashboard
              </Link>
            )}

            {/* Sign Out button */}
            <button
              onClick={handleSignOut}
              className="pill-button secondary"
              style={{ fontSize: '0.9rem', padding: '0.55rem 1.4rem' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          /* ── Right side — logged out ────────────────────── */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/login" className="pill-button secondary" style={{ fontSize: '0.9rem', padding: '0.55rem 1.4rem' }}>
              Log In
            </Link>
            <Link to="/apply" className="pill-button orange" style={{ fontSize: '0.9rem', padding: '0.55rem 1.4rem' }}>
              Apply
            </Link>

            {/* Hamburger — for fuller nav on public pages */}
            <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open Menu" style={{ width: '46px', height: '46px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6"  x2="20" y2="6"  />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* ── Nav overlay (public pages only) ─────────────── */}
      <div className={`nav-overlay${open ? ' active' : ''}`}>
        <button className="menu-button close-button" onClick={close} aria-label="Close Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6"  x2="6"  y2="18" />
            <line x1="6"  y1="6"  x2="18" y2="18" />
          </svg>
        </button>

        <nav className="overlay-menu">
          <ul>
            <li><Link to="/"       onClick={close}>HOME</Link></li>
            <li><Link to="/apply"  onClick={close}>APPLY</Link></li>
            <li><Link to="/login"  onClick={close}>LOG IN</Link></li>
            <li><a href="https://pagesforchange.org/#about" onClick={close}>ABOUT US</a></li>
            <li><a href="https://pagesforchange.org/#team"  onClick={close}>OUR TEAM</a></li>
          </ul>
        </nav>

        <div className="overlay-socials">
          <a href="https://www.linkedin.com/company/pages-for-change/" target="_blank" rel="noopener noreferrer" className="overlay-social-link" aria-label="LinkedIn">
            <i className="fa-brands fa-linkedin-in" />
          </a>
          <a href="https://www.instagram.com/pagesforchange10/" target="_blank" rel="noopener noreferrer" className="overlay-social-link" aria-label="Instagram">
            <i className="fa-brands fa-instagram" />
          </a>
          <a href="https://www.youtube.com/@PagesforChange" target="_blank" rel="noopener noreferrer" className="overlay-social-link" aria-label="YouTube">
            <i className="fa-brands fa-youtube" />
          </a>
        </div>
      </div>
    </>
  )
}
