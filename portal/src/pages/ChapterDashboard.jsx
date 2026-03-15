import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { supabase } from '../lib/supabase.js'

export default function ChapterDashboard() {
  const navigate = useNavigate()
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) return
      setUser(data.user)
      const { data: p } = await supabase
        .from('users')
        .select('full_name, chapter_id, chapters(name, school, city, state)')
        .eq('id', data.user.id)
        .single()
      setProfile(p)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const cards = [
    { icon: 'fa-book',            label: 'Book Inventory',  desc: 'Log and track received books'     },
    { icon: 'fa-handshake',       label: 'Organizations',   desc: 'Partner orgs and outreach status' },
    { icon: 'fa-truck',           label: 'Distributions',   desc: 'Record book distributions'        },
    { icon: 'fa-comment-dots',    label: 'Contact Log',     desc: 'Track outreach conversations'     },
    { icon: 'fa-folder-open',     label: 'Resources',       desc: 'Chapter guides and materials'     },
    { icon: 'fa-chart-bar',       label: 'Impact Report',   desc: 'Your chapter\'s stats'            },
  ]

  const chapter = profile?.chapters

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)' }}>
      <Navbar darkBg />
      <div style={{ padding: '8rem 8% 5rem', maxWidth: '1100px', margin: '0 auto' }}>

        <div className="fade-up" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="hashtag-badge" style={{ display: 'inline-flex', marginBottom: '1rem' }}>C H A P T E R   L E A D</div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                color: 'white',
                letterSpacing: '-0.02em',
              }}
            >
              {chapter ? chapter.name : 'Chapter Dashboard'}
            </h1>
            {chapter && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem' }}>
                {chapter.school} · {chapter.city}, {chapter.state}
              </p>
            )}
          </div>
          <button onClick={signOut} className="pill-button secondary" style={{ fontSize: '0.95rem', padding: '0.6rem 1.8rem' }}>
            Sign Out
          </button>
        </div>

        <div
          className="fade-up-2"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}
        >
          {cards.map(c => (
            <div key={c.label} className="dash-card" style={{ cursor: 'pointer' }}>
              <i className={`fa-solid ${c.icon}`} style={{ fontSize: '1.8rem', color: '#F6AA3C', marginBottom: '1rem', display: 'block' }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.2rem', color: 'white', marginBottom: '0.3rem' }}>
                {c.label}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="fade-up-3" style={{ fontFamily: 'var(--font-accent-serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '4rem' }}>
          Full chapter modules coming in Phase 2.
        </p>
      </div>
    </div>
  )
}
