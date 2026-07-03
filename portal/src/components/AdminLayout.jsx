import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './AdminSidebar.jsx'

const PAGE_TITLES = {
  '/admin':              'National Dashboard',
  '/admin/chapters':     'Chapter Management',
  '/admin/applications': 'Applications',
  '/admin/resources':    'Resource Library',
  '/admin/impact':       'Impact Reports',
}

function resolveTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/admin/chapters/')) return 'Chapter Detail'
  return 'Admin'
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = resolveTitle(location.pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1a365d' }}>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="lg:ml-60">
        {/* Top bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(13,35,62,0.97)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          height: '56px', display: 'flex', alignItems: 'center',
          padding: '0 1.5rem', gap: '1rem', flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
            aria-label="Open sidebar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: 'white', letterSpacing: '-0.01em' }}>
            {pageTitle}
          </h1>

          {/* HQ badge */}
          <div style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(246,170,60,0.15)', border: '1px solid rgba(246,170,60,0.3)',
            borderRadius: '20px', padding: '0.2rem 0.75rem',
          }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', color: '#F6AA3C', letterSpacing: '0.05em' }}>
              HQ · National Admin
            </span>
          </div>
        </header>

        <main style={{
          flex: 1, padding: '2rem 1.5rem', width: '100%',
          maxWidth: '1400px', alignSelf: 'center', boxSizing: 'border-box',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
