import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { supabase } from '../lib/supabase.js'

export default function Landing() {
  const [stats, setStats] = useState({ chapters: '—', books: '—', partners: '—' })

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase.rpc('get_public_stats')
      if (!error && data) {
        setStats({
          chapters: data.total_chapters?.toLocaleString() ?? '0',
          books:    data.total_books?.toLocaleString()    ?? '0',
          partners: data.total_partners?.toLocaleString() ?? '0',
        })
      }
    }
    loadStats()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)' }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* background image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/hero-bg.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(26,54,93,0.55) 0%, rgba(26,54,93,0.85) 100%)',
          }} />
        </div>

        {/* content */}
        <div
          className="fade-up"
          style={{
            position: 'relative', zIndex: 10,
            textAlign: 'center',
            padding: '0 8%',
            paddingTop: '10vh',
            maxWidth: '860px',
            width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <div className="hashtag-badge">
            <img src="/logo.png" alt="" style={{ height: '1.35rem', marginRight: '0.6rem', transform: 'skewX(15deg)' }} />
            P O R T A L
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.6rem, 6vw, 4.5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'white',
              marginBottom: '1.5rem',
              letterSpacing: '1px',
              textShadow: '0 4px 10px rgba(0,0,0,0.6)',
            }}
          >
            Start a Chapter.<br />Change a Community.
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              fontWeight: 500,
              lineHeight: 1.6,
              color: 'white',
              maxWidth: '600px',
              marginBottom: '2.5rem',
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }}
          >
            Join the Pages for Change network. Lead your school. Track your impact.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem' }}>
            <Link to="/apply" className="pill-button primary">Apply to Start a Chapter</Link>
            <Link to="/login" className="pill-button secondary">Already have an account? Log in</Link>
          </div>

          {/* Stats row */}
          <div
            className="fade-up-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.2rem',
              width: '100%',
              maxWidth: '700px',
            }}
          >
            <div className="stat-card">
              <div className="stat-num">{stats.books}</div>
              <div className="stat-label">Books Distributed</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.chapters}</div>
              <div className="stat-label">Active Chapters</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.partners}</div>
              <div className="stat-label">Partner Orgs</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapter Map ──────────────────────────────────────── */}
      <section
        style={{
          background: '#122847',
          padding: '6rem 8%',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <div className="hashtag-badge fade-up" style={{ display: 'inline-flex' }}>C H A P T E R S</div>
          <h2 className="section-h2 fade-up" style={{ marginBottom: '1rem' }}>
            Where We Operate
          </h2>
          <p
            className="fade-up-2"
            style={{
              fontFamily: 'var(--font-accent-serif)',
              fontSize: '1.45rem',
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.75)',
              marginBottom: '2.5rem',
            }}
          >
            Active chapters making a difference across the country.
          </p>

          <div className="map-placeholder fade-up-2">
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <i
                className="fa-solid fa-map-location-dot"
                style={{ fontSize: '3rem', color: '#F6AA3C', marginBottom: '1rem', display: 'block' }}
              />
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem' }}>
                Interactive Chapter Map
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)' }}>
                Launching with first active chapters
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--primary-color)',
          padding: '6rem 8%',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="hashtag-badge" style={{ display: 'inline-flex' }}>G E T   S T A R T E D</div>
          <h2
            className="section-h2"
            style={{ marginBottom: '1rem' }}
          >
            Ready to lead your school?
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
            }}
          >
            Applications take less than 5 minutes. We review every submission and reach out within a week.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/apply" className="pill-button orange">Apply Now</Link>
            <Link to="/login" className="pill-button secondary">Log In</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ background: '#122847', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '3rem 8%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.2rem', color: 'white', marginBottom: '0.3rem' }}>PAGES FOR CHANGE</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#94a3b8' }}>Empowering communities through literacy.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
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
        <div style={{ maxWidth: '1000px', margin: '2rem auto 0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#94a3b8' }}>
            © 2026 Pages for Change. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
