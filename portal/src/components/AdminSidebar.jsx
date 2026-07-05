import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const NAV_ITEMS = [
  { to: '/admin',                 label: 'National Dashboard', end: true,  stub: false },
  { to: '/admin/chapters',        label: 'Chapter Management', end: false, stub: false },
  { to: '/admin/applications',    label: 'Applications',       end: false, stub: false },
  { to: '/admin/resources',       label: 'Resource Library',   end: false, stub: false },
  { to: '/admin/impact',          label: 'Impact Reports',     end: false, stub: false },
  { to: '/admin/certificates',    label: 'Certificates',       end: false, stub: false },
  { to: '/admin/invite',          label: 'Invite User',        end: false, stub: false },
]

function ChapterJumper({ currentChapterId, onClose }) {
  const navigate  = useNavigate()
  const [chapters, setChapters] = useState([])

  useEffect(() => {
    supabase.from('chapters').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => setChapters(data ?? []))
  }, [])

  if (chapters.length === 0) return null

  return (
    <div style={{ padding: '0.35rem 0.75rem 0.5rem', margin: '0 0.5rem' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Jump to chapter</p>
      <select
        value={currentChapterId ?? ''}
        onChange={e => { if (e.target.value) { navigate(`/admin/chapters/${e.target.value}`); onClose?.() } }}
        style={{
          width: '100%', padding: '0.4rem 0.6rem',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '7px', color: 'rgba(255,255,255,0.75)',
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
        }}
      >
        <option value="">Select chapter…</option>
        {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  )
}

export default function AdminSidebar({ open, onClose }) {
  const { user, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const chapterDetailMatch = location.pathname.match(/^\/admin\/chapters\/([^/]+)$/)
  const currentChapterId   = chapterDetailMatch?.[1] ?? null

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div
          className="lg:hidden"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
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
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <a
            href="https://pagesforchange.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
          >
            <img src="/logo.png" alt="P4C" style={{ height: '1.75rem' }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.95rem', color: 'white', letterSpacing: '-0.03em' }}>
              P4C Portal
            </span>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {NAV_ITEMS.map(item => (
            <div key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
              >
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.stub && (
                  <span style={{
                    fontSize: '0.6rem',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  }}>
                    Soon
                  </span>
                )}
              </NavLink>
              {item.to === '/admin/chapters' && currentChapterId && (
                <ChapterJumper currentChapterId={currentChapterId} onClose={onClose} />
              )}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: '#F6AA3C', color: '#1a365d',
            fontFamily: 'var(--font-heading)', fontWeight: 900,
            fontSize: '0.6rem', padding: '0.2rem 0.65rem',
            transform: 'skewX(-15deg)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '0.6rem',
          }}>
            <span style={{ transform: 'skewX(15deg)' }}>Co-Executive Directors</span>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            {['Zayd Mulani', 'Affan Shaik'].map(name => (
              <p key={name} style={{
                fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)',
                lineHeight: '1.6',
              }}>
                {name}
              </p>
            ))}
          </div>

          <button
            onClick={handleSignOut}
            style={{
              width: '100%', padding: '0.5rem 0',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', color: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-body)', fontWeight: 600,
              fontSize: '0.825rem', cursor: 'pointer', transition: 'all 0.2s ease',
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
