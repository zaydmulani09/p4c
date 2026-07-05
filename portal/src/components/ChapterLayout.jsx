import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ChapterSidebar from './ChapterSidebar.jsx'

const PAGE_TITLES = {
  '/chapter':           'Dashboard',
  '/chapter/tracker':   'Outreach Tracker',
  '/chapter/pipeline':  'Partnership Pipeline',
  '/chapter/inventory': 'Book Inventory',
  '/chapter/team':      'Team',
  '/chapter/stats':     'Stats',
  '/chapter/impact':    'Impact Reports',
  '/chapter/resources': 'Resources',
}

const SIDEBAR_W = 240

export default function ChapterLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Portal'

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#1a365d',
      }}
    >
      <ChapterSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main — offset by sidebar width (240px = ml-60) on lg+ */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
        className="lg:ml-60"
      >
        {/* Top bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: 'rgba(13,35,62,0.97)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
            }}
            aria-label="Open sidebar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'white',
              letterSpacing: '-0.01em',
            }}
          >
            {pageTitle}
          </h1>

          {/* Notification bell — UI only */}
          <button
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            title="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: '2rem 1.5rem',
            width: '100%',
            maxWidth: '1400px',
            alignSelf: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div key={location.pathname} className="p4c-page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
