import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { supabase } from '../lib/supabase.js'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const cards = [
    { icon: 'fa-building-columns', label: 'Chapters',     desc: 'Manage all active chapters'    },
    { icon: 'fa-users',            label: 'Users',         desc: 'Review members and roles'       },
    { icon: 'fa-file-lines',       label: 'Applications',  desc: 'Review chapter applications'    },
    { icon: 'fa-book',             label: 'Books',         desc: 'Network-wide inventory'         },
    { icon: 'fa-handshake',        label: 'Partners',      desc: 'All partner organizations'      },
    { icon: 'fa-folder-open',      label: 'Resources',     desc: 'Upload & manage resources'      },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)' }}>
      <Navbar darkBg />
      <div style={{ padding: '8rem 8% 5rem', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="hashtag-badge" style={{ display: 'inline-flex', marginBottom: '1rem' }}>N A T I O N A L   A D M I N</div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                color: 'white',
                letterSpacing: '-0.02em',
              }}
            >
              Admin Dashboard
            </h1>
            {user && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem' }}>
                Signed in as <strong style={{ color: '#F6AA3C' }}>{user.email}</strong>
              </p>
            )}
          </div>
          <button
            onClick={signOut}
            className="pill-button secondary"
            style={{ fontSize: '0.95rem', padding: '0.6rem 1.8rem' }}
          >
            Sign Out
          </button>
        </div>

        {/* Grid */}
        <div
          className="fade-up-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.2rem',
          }}
        >
          {cards.map(c => (
            <div
              key={c.label}
              className="dash-card"
              style={{ cursor: 'pointer' }}
            >
              <i
                className={`fa-solid ${c.icon}`}
                style={{ fontSize: '1.8rem', color: '#F6AA3C', marginBottom: '1rem', display: 'block' }}
              />
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  color: 'white',
                  marginBottom: '0.3rem',
                }}
              >
                {c.label}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        <p
          className="fade-up-3"
          style={{
            fontFamily: 'var(--font-accent-serif)',
            fontStyle: 'italic',
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            marginTop: '4rem',
          }}
        >
          Full admin modules coming in Phase 2.
        </p>
      </div>
    </div>
  )
}
