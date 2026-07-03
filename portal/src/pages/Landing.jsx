import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import ChapterMap from '../components/ChapterMap.jsx'
import { supabase } from '../lib/supabase.js'
import { FOUNDING_CHAPTER_ID } from '../lib/config.js'

// ── Counter animation hook ────────────────────────────────────
function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!target) return
    const start = performance.now()

    function tick(now) {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return count
}

// ── Data ──────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    title: 'Apply',
    desc: 'Submit a quick application. We review and approve within 48 hours.',
  },
  {
    num: '02',
    title: 'Get Set Up',
    desc: 'Instantly access your chapter dashboard, outreach tracker, inventory system, and resource library.',
  },
  {
    num: '03',
    title: 'Make Impact',
    desc: 'Start contacting local organizations, collecting books, and distributing to kids who need them.',
  },
]

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Turnkey System',
    desc: 'Full dashboard, tracker, inventory, pipeline. No spreadsheets, no setup.',
  },
  {
    icon: '🏆',
    title: 'Founding Recognition',
    desc: '"Chapter Lead" title, verified impact certificate at year end, LinkedIn-worthy role.',
  },
  {
    icon: '📊',
    title: 'Real Impact',
    desc: 'Every book distributed is tracked and verified. Your numbers are real.',
  },
  {
    icon: '🤝',
    title: 'HQ Support',
    desc: 'Templates, playbooks, brand assets, and direct support from the founding team.',
  },
]

// ── Section badge ─────────────────────────────────────────────
function Badge({ text }) {
  return (
    <div
      className="hashtag-badge"
      style={{ display: 'inline-flex', marginBottom: '1.25rem', cursor: 'default' }}
    >
      <span style={{ transform: 'skewX(15deg)' }}>{text}</span>
    </div>
  )
}

export default function Landing() {
  const [rawStats,  setRawStats]  = useState({ chapters: 0, books: 0, partners: 0, states: 0 })
  const [chapters,  setChapters]  = useState([])
  const [statsReady, setStatsReady] = useState(false)

  // Counter targets (only set after data loads to trigger animation once)
  const chaptersCount = useCountUp(statsReady ? rawStats.chapters : 0)
  const booksCount    = useCountUp(statsReady ? rawStats.books    : 0)
  const partnersCount = useCountUp(statsReady ? rawStats.partners : 0)
  const statesCount   = useCountUp(statsReady ? rawStats.states   : 0)

  useEffect(() => {
    async function load() {
      const [{ data: rpcData }, { data: chaptersData }, { data: distsData }] = await Promise.all([
        supabase.rpc('get_public_stats'),
        supabase.from('chapters').select('id, name, school, city, state, status, founded_date').eq('status', 'active').order('name'),
        supabase.from('distributions').select('chapter_id, quantity'),
      ])

      const distByChapter = {}
      ;(distsData ?? []).forEach(d => {
        distByChapter[d.chapter_id] = (distByChapter[d.chapter_id] ?? 0) + (d.quantity ?? 0)
      })

      const enriched = (chaptersData ?? []).map(c => ({
        ...c,
        booksDistributed: distByChapter[c.id] ?? 0,
        is_founding: c.id === FOUNDING_CHAPTER_ID,
      }))

      const states = new Set(enriched.map(c => c.state).filter(Boolean)).size

      setChapters(enriched)
      setRawStats({
        chapters: rpcData?.total_chapters ?? enriched.length,
        books:    rpcData?.total_books    ?? 0,
        partners: rpcData?.total_partners ?? 0,
        states:   states || 1,
      })
      setStatsReady(true)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)', overflowX: 'hidden' }}>
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
        {/* Background image + overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/hero-bg.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(26,54,93,0.6) 0%, rgba(26,54,93,0.92) 100%)',
          }} />
        </div>

        <div
          className="fade-up"
          style={{
            position: 'relative', zIndex: 10,
            textAlign: 'center',
            padding: '0 8%',
            paddingTop: '12vh',
            maxWidth: '900px',
            width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <Badge text="P A G E S F O R C H A N G E N E T W O R K" />

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
              fontWeight: 900,
              lineHeight: 1.08,
              color: 'white',
              marginBottom: '1.4rem',
              letterSpacing: '-0.02em',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            Start a Chapter.<br />Change a Community.
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              fontWeight: 500,
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.88)',
              maxWidth: '580px',
              marginBottom: '2.4rem',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            Join the Pages for Change Network — bring books to underserved youth in your city.
          </p>

          <div
            style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4.5rem' }}
          >
            <Link to="/apply" className="pill-button orange">Apply to Start a Chapter</Link>
            <Link to="/login" className="pill-button secondary">Log In</Link>
          </div>

          {/* Live stats counter */}
          <div
            className="fade-up-2 counter-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: '760px',
            }}
          >
            {[
              { val: chaptersCount, label: 'Active Chapters' },
              { val: booksCount,    label: 'Books Distributed' },
              { val: partnersCount, label: 'Organizations Partnered' },
              { val: statesCount,   label: 'States Represented' },
            ].map(({ val, label }) => (
              <div key={label} className="stat-card">
                <div className="stat-num">{val.toLocaleString()}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section style={{ background: '#0d233e', padding: '6rem 8%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <Badge text="H O W I T W O R K S" />
          <h2 className="section-h2" style={{ marginBottom: '0.75rem' }}>Your chapter. Our playbook.</h2>
          <p
            style={{
              fontFamily: 'var(--font-accent-serif)',
              fontStyle: 'italic',
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '3rem',
            }}
          >
            Three steps from today to impact.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {STEPS.map(step => (
              <div
                key={step.num}
                style={{
                  background: '#122847',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '2rem 1.75rem',
                  textAlign: 'left',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F6AA3C',
                    color: '#1a365d',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    padding: '0.3rem 0.75rem',
                    transform: 'skewX(-10deg)',
                    marginBottom: '1.25rem',
                    borderRadius: '4px',
                  }}
                >
                  <span style={{ transform: 'skewX(10deg)' }}>{step.num}</span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    color: 'white',
                    marginBottom: '0.6rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chapter Map ──────────────────────────────────────── */}
      <section style={{ background: 'var(--primary-color)', padding: '6rem 8%' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <Badge text="O U R N E T W O R K" />
            <h2 className="section-h2" style={{ marginBottom: '0.5rem' }}>Chapters Across the Country</h2>
            <p
              style={{
                fontFamily: 'var(--font-accent-serif)',
                fontStyle: 'italic',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {chapters.length > 0 ? `${chapters.length} active chapter${chapters.length !== 1 ? 's' : ''} and growing.` : 'Building the network, one chapter at a time.'}
            </p>
          </div>

          <ChapterMap chapters={chapters} />

          {/* Chapter cards */}
          {chapters.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
                marginTop: '2.5rem',
              }}
            >
              {chapters.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: '#0d233e',
                    border: c.is_founding
                      ? '1.5px solid rgba(246,170,60,0.4)'
                      : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                    padding: '1.35rem 1.5rem',
                    transition: 'transform 0.25s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', color: 'white', lineHeight: 1.25 }}>
                      {c.name}
                    </p>
                    {c.is_founding && (
                      <span
                        style={{
                          background: 'rgba(246,170,60,0.15)',
                          border: '1px solid rgba(246,170,60,0.3)',
                          color: '#F6AA3C',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '20px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          letterSpacing: '0.04em',
                        }}
                      >
                        ⭐ Founding
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.7rem' }}>
                    {c.school}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.85rem' }}>
                    {c.city}, {c.state}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.15rem', color: '#F6AA3C', lineHeight: 1 }}>
                        {c.booksDistributed}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>
                        Books Dist.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Why Join ─────────────────────────────────────────── */}
      <section style={{ background: '#0d233e', padding: '6rem 8%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <Badge text="W H Y J O I N" />
          <h2 className="section-h2" style={{ marginBottom: '0.75rem' }}>What chapter leads get</h2>
          <p
            style={{
              fontFamily: 'var(--font-accent-serif)',
              fontStyle: 'italic',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              marginBottom: '3rem',
            }}
          >
            Everything you need. Nothing you don't.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {BENEFITS.map(b => (
              <div
                key={b.title}
                style={{
                  background: '#122847',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'left',
                  transition: 'transform 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{b.icon}</div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    color: 'white',
                    marginBottom: '0.6rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {b.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Apply CTA ────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--primary-color)',
          padding: '7rem 8%',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <Badge text="G E T S T A R T E D" />
          <h2 className="section-h2" style={{ marginBottom: '1.1rem' }}>
            Ready to bring books to your community?
          </h2>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <Link to="/apply" className="pill-button orange">Apply Now</Link>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.88rem',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.02em',
            }}
          >
            Applications reviewed within 48 hours. Free to start. Free forever.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ background: '#0d233e', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '3.5rem 8% 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2.5rem', marginBottom: '2.5rem' }}>
            {/* Brand */}
            <div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.3rem', color: 'white', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                PAGES FOR CHANGE
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                Empowering communities through literacy.
              </p>
              <p style={{ fontFamily: 'var(--font-accent-serif)', fontStyle: 'italic', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
                Co-Executive Directors: Zayd Mulani &amp; Affan Shaik
              </p>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Navigation
                </p>
                {[
                  { label: 'Home', href: 'https://pagesforchange.org', external: true },
                  { label: 'Apply', to: '/apply' },
                  { label: 'Log In', to: '/login' },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: '0.5rem' }}>
                    {item.external
                      ? <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}>
                          {item.label}
                        </a>
                      : <Link to={item.to} style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}>
                          {item.label}
                        </Link>
                    }
                  </div>
                ))}
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Follow Us
                </p>
                {[
                  { label: 'Instagram', href: 'https://www.instagram.com/pagesforchange10/' },
                  { label: 'LinkedIn',  href: 'https://www.linkedin.com/company/pages-for-change/' },
                  { label: 'YouTube',   href: 'https://www.youtube.com/@PagesforChange' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: '0.5rem' }}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                    >
                      {s.label}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              {[
                { href: 'https://www.linkedin.com/company/pages-for-change/',  icon: 'fa-brands fa-linkedin-in',  label: 'LinkedIn' },
                { href: 'https://www.instagram.com/pagesforchange10/',          icon: 'fa-brands fa-instagram',    label: 'Instagram' },
                { href: 'https://www.youtube.com/@PagesforChange',              icon: 'fa-brands fa-youtube',      label: 'YouTube' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="overlay-social-link"
                >
                  <i className={s.icon} />
                </a>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>
              © 2026 Pages for Change. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
