import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_ITEMS = [
  { to: '/chapter',           label: 'Dashboard',            end: true,  stub: false },
  { to: '/chapter/tracker',   label: 'Outreach Tracker',     end: false, stub: false },
  { to: '/chapter/pipeline',  label: 'Partnership Pipeline', end: false, stub: false },
  { to: '/chapter/inventory', label: 'Book Inventory',       end: false, stub: false },
  { to: '/chapter/team',      label: 'Team',                 end: false, stub: true  },
  { to: '/chapter/stats',     label: 'Stats',                end: false, stub: true  },
  { to: '/chapter/impact',    label: 'Impact Reports',       end: false, stub: false },
  { to: '/chapter/resources', label: 'Resources',            end: false, stub: false },
]

export default function ChapterSidebar({ open, onClose }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? ''

  return (
    <>
      {open && (
        <div
          className="lg:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
          onClick={onClose}
        />
      )}

      <aside
        style={{
          width: '240px',
          background: '#0d233e',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          transition: 'transform 0.35s cubic-bezier(0.77,0,0.175,1)',
        }}
        className={open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      >
        {/* Logo */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        >
          <a
            href="https://pagesforchange.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
            }}
          >
            <img src="/logo.png" alt="P4C" style={{ height: '1.75rem' }} />
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '0.95rem',
                color: 'white',
                letterSpacing: '-0.03em',
              }}
            >
              P4C Portal
            </span>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                margin: '0.1rem 0.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid #F6AA3C' : '3px solid transparent',
                transition: 'all 0.15s ease',
              })}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.stub && (
                <span
                  style={{
                    fontSize: '0.6rem',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  }}
                >
                  Soon
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F6AA3C',
              color: '#1a365d',
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '0.6rem',
              padding: '0.2rem 0.65rem',
              transform: 'skewX(-15deg)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            <span style={{ transform: 'skewX(15deg)' }}>Chapter Lead</span>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.825rem',
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '0.75rem',
            }}
          >
            {displayName}
          </p>

          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '0.5rem 0',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
