import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChapter } from '../../hooks/useChapter.js'
import { useWeeklyStats } from '../../hooks/useWeeklyStats.js'
import { supabase } from '../../lib/supabase.js'
import { FOUNDING_CHAPTER_ID } from '../../lib/config.js'
import Modal from '../../components/Modal.jsx'

const CLOSED_STATUSES = ['Partnership Established', 'Not Interested', 'Closed']
const ORG_TYPE_OPTIONS = ['Library', 'School', 'Community Center', 'Church/Religious', 'Hospital', 'Non-Profit', 'Business', 'Government', 'Other']
const STATUS_OPTIONS   = ['Not Contacted', 'Contacted', 'Meeting Scheduled', 'Interested', 'In Progress', 'Follow-Up Needed', 'Partnership Established', 'Not Interested', 'Closed']
const CONTACT_METHODS  = ['Email', 'Phone', 'In Person', 'Social Media', 'Mail', 'Other']
const GENRES           = ['Picture Book', 'Middle Grade', 'Young Adult', 'Non-Fiction', 'Educational', 'Other']
const CONDITIONS       = ['New', 'Like New', 'Good', 'Acceptable', 'Poor']

// ── AI Summary ────────────────────────────────────────────────
async function fetchAISummary(stats, chapterId) {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const cacheKey = `p4c_summary_${chapterId}_w${weekNum}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { text, ts } = JSON.parse(cached)
    if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return text
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return null

  try {
    const isEarlyStage = !stats.orgs && !stats.books && !stats.distributions
    const systemContent = isEarlyStage
      ? 'You are a helpful assistant for Pages for Change, a student-led literacy nonprofit. Write a brief, encouraging message for a chapter lead just getting started. Keep it under 4 sentences. Do not use bullet points.'
      : 'You are a helpful assistant for Pages for Change, a student-led literacy nonprofit. Write a brief, encouraging weekly summary for a chapter lead based on their activity data. Be specific with the numbers. Keep it under 4 sentences. Do not use bullet points.'
    const userContent = isEarlyStage
      ? 'This chapter is just getting started with Pages for Change. Write an encouraging message about the exciting opportunity ahead to connect with organizations, collect books, and make a difference in the community.'
      : `This week: ${stats.orgs} new organizations logged, ${stats.books} books received, ${stats.distributions} distributions made, ${stats.activeConversations} active conversations ongoing.`
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        max_tokens: 200,
      }),
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? null
    if (text) localStorage.setItem(cacheKey, JSON.stringify({ text, ts: Date.now() }))
    return text
  } catch {
    return null
  }
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, loading }) {
  return (
    <div
      style={{
        background: '#0d233e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: '4px solid #F6AA3C',
        borderRadius: '12px',
        padding: '1.5rem',
      }}
    >
      {loading ? (
        <div className="p4c-spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
      ) : (
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: '2.2rem',
            color: '#F6AA3C',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          {value}
        </p>
      )}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: '0.5rem',
        }}
      >
        {label}
      </p>
    </div>
  )
}

// ── Form field helpers ────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="p4c-label">{label}</label>
      {children}
    </div>
  )
}

// ── Add Org Modal ─────────────────────────────────────────────
function AddOrgModal({ onClose, chapterId, userId, onSaved }) {
  const [form, setForm] = useState({
    org_name: '', org_type: '', contact_name: '', contact_title: '',
    email: '', phone: '', website: '', township: '', state: '',
    current_status: 'Not Contacted', contact_method: '', date_researched: '',
    date_first_contacted: '', follow_up_date: '', partnership_interest: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.org_name.trim()) { setErr('Organization name is required.'); return }
    setSaving(true)
    const payload = { ...form, chapter_id: chapterId, logged_by: userId }
    // strip empty strings → null so date fields don't fail
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null
    })
    payload.org_name = form.org_name.trim()
    const { error } = await supabase.from('organizations').insert(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <Modal title="Add Organization" onClose={onClose} maxWidth="600px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Organization Name *">
            <input className="p4c-input" value={form.org_name} onChange={e => set('org_name', e.target.value)} placeholder="Org name" />
          </Field>
          <Field label="Organization Type">
            <select className="p4c-input" value={form.org_type} onChange={e => set('org_type', e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select…</option>
              {ORG_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Contact Name">
            <input className="p4c-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Position / Title">
            <input className="p4c-input" value={form.contact_title} onChange={e => set('contact_title', e.target.value)} placeholder="Title" />
          </Field>
          <Field label="Email">
            <input className="p4c-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email" />
          </Field>
          <Field label="Phone">
            <input className="p4c-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" />
          </Field>
          <Field label="Website">
            <input className="p4c-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Township">
            <input className="p4c-input" value={form.township} onChange={e => set('township', e.target.value)} placeholder="Township" />
          </Field>
          <Field label="State">
            <input className="p4c-input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="NJ" />
          </Field>
          <Field label="Current Status">
            <select className="p4c-input" value={form.current_status} onChange={e => set('current_status', e.target.value)} style={{ cursor: 'pointer' }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Contact Method">
            <select className="p4c-input" value={form.contact_method} onChange={e => set('contact_method', e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select…</option>
              {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Date Researched">
            <input className="p4c-input" type="date" value={form.date_researched} onChange={e => set('date_researched', e.target.value)} />
          </Field>
          <Field label="Date First Contacted">
            <input className="p4c-input" type="date" value={form.date_first_contacted} onChange={e => set('date_first_contacted', e.target.value)} />
          </Field>
          <Field label="Follow-Up Date">
            <input className="p4c-input" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
          </Field>
        </div>
        <Field label="Partnership Interest">
          <input className="p4c-input" value={form.partnership_interest} onChange={e => set('partnership_interest', e.target.value)} placeholder="Books, mentorship, …" />
        </Field>
        <Field label="Notes">
          <textarea className="p4c-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" style={{ minHeight: '80px' }} />
        </Field>
        {err && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{err}</p>}
        <button type="submit" className="pill-button orange" disabled={saving} style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
          {saving ? <span className="p4c-spinner-sm" /> : 'Save Organization'}
        </button>
      </form>
    </Modal>
  )
}

// ── Log Books Modal ───────────────────────────────────────────
function LogBooksModal({ onClose, chapterId, userId, onSaved }) {
  const [form, setForm] = useState({ title: '', author: '', genre: '', age_range: '', condition: '', quantity: 1, date_received: '' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setErr('Title is required.'); return }
    if (!form.quantity || form.quantity < 1) { setErr('Quantity must be at least 1.'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      author:        form.author        || null,
      genre:         form.genre         || null,
      age_range:     form.age_range     || null,
      condition:     form.condition     || null,
      quantity:      Number(form.quantity),
      date_received: form.date_received || null,
      chapter_id: chapterId,
      logged_by:  userId,
    }
    const { error } = await supabase.from('books').insert(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <Modal title="Log Books" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Title *">
            <input className="p4c-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Book title" />
          </Field>
          <Field label="Author">
            <input className="p4c-input" value={form.author} onChange={e => set('author', e.target.value)} placeholder="Author name" />
          </Field>
          <Field label="Genre">
            <select className="p4c-input" value={form.genre} onChange={e => set('genre', e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select…</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Age Range">
            <input className="p4c-input" value={form.age_range} onChange={e => set('age_range', e.target.value)} placeholder="e.g. 5–8" />
          </Field>
          <Field label="Condition">
            <select className="p4c-input" value={form.condition} onChange={e => set('condition', e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select…</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Quantity *">
            <input className="p4c-input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </Field>
          <Field label="Date Received">
            <input className="p4c-input" type="date" value={form.date_received} onChange={e => set('date_received', e.target.value)} />
          </Field>
        </div>
        {err && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{err}</p>}
        <button type="submit" className="pill-button orange" disabled={saving} style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
          {saving ? <span className="p4c-spinner-sm" /> : 'Log Books'}
        </button>
      </form>
    </Modal>
  )
}

// ── Log Distribution Modal ────────────────────────────────────
function LogDistributionModal({ onClose, chapterId, userId, onSaved }) {
  const [orgs,   setOrgs]   = useState([])
  const [form,   setForm]   = useState({ org_id: '', quantity: 1, distribution_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  useEffect(() => {
    supabase.from('organizations').select('id, org_name').eq('chapter_id', chapterId).order('org_name')
      .then(({ data }) => setOrgs(data ?? []))
  }, [chapterId])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.quantity || form.quantity < 1) { setErr('Quantity must be at least 1.'); return }
    setSaving(true)
    const payload = {
      chapter_id:        chapterId,
      org_id:            form.org_id            || null,
      quantity:          Number(form.quantity),
      distribution_date: form.distribution_date || null,
      notes:             form.notes             || null,
      logged_by:         userId,
    }
    const { error } = await supabase.from('distributions').insert(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <Modal title="Log Distribution" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Organization">
          <select className="p4c-input" value={form.org_id} onChange={e => set('org_id', e.target.value)} style={{ cursor: 'pointer' }}>
            <option value="">Select org (optional)</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Quantity *">
            <input className="p4c-input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </Field>
          <Field label="Distribution Date">
            <input className="p4c-input" type="date" value={form.distribution_date} onChange={e => set('distribution_date', e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="p4c-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…" style={{ minHeight: '80px' }} />
        </Field>
        {err && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{err}</p>}
        <button type="submit" className="pill-button orange" disabled={saving} style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
          {saving ? <span className="p4c-spinner-sm" /> : 'Log Distribution'}
        </button>
      </form>
    </Modal>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { user, chapterId } = useAuth()
  const { chapter }         = useChapter()
  const { stats, loading: statsLoading } = useWeeklyStats()
  const navigate = useNavigate()

  const [profileName,   setProfileName]   = useState('')
  const [overdue,       setOverdue]       = useState([])
  const [overdueLoad,   setOverdueLoad]   = useState(true)
  const [aiSummary,     setAiSummary]     = useState(null)
  const [aiLoading,     setAiLoading]     = useState(false)
  const [modal,         setModal]         = useState(null) // 'addOrg' | 'logBooks' | 'logDist'
  const [saveToast,     setSaveToast]     = useState('')

  // Fetch user full_name
  useEffect(() => {
    if (!user) return
    supabase.from('users').select('full_name').eq('id', user.id).single()
      .then(({ data }) => setProfileName(data?.full_name ?? user.email ?? ''))
  }, [user])

  // Fetch overdue orgs
  useEffect(() => {
    if (!chapterId) { setOverdueLoad(false); return }
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    let q = supabase
      .from('organizations')
      .select('id, org_name, current_status, updated_at')
      .eq('chapter_id', chapterId)
      .lt('updated_at', cutoff)
      .order('updated_at', { ascending: true })
    CLOSED_STATUSES.forEach(s => { q = q.neq('current_status', s) })
    q.then(({ data }) => {
      setOverdue(data ?? [])
      setOverdueLoad(false)
    })
  }, [chapterId])

  // Load AI summary once stats are ready
  useEffect(() => {
    if (statsLoading || !chapterId) return
    setAiLoading(true)
    fetchAISummary(stats, chapterId).then(text => {
      setAiSummary(text)
      setAiLoading(false)
    })
  }, [statsLoading, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg) {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(''), 3000)
  }

  const isFoundingChapter = chapterId === FOUNDING_CHAPTER_ID
  const firstName = profileName.split(' ')[0] || profileName

  function daysSince(dateStr) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Toast ── */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: '#166534',
          color: '#bbf7d0',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.9rem',
          zIndex: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {saveToast}
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: 'white',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </h1>
          {isFoundingChapter && (
            <span
              style={{
                background: 'rgba(246,170,60,0.15)',
                border: '1px solid rgba(246,170,60,0.3)',
                color: '#F6AA3C',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                letterSpacing: '0.05em',
              }}
            >
              Founding Chapter ⭐
            </span>
          )}
        </div>
        {chapter && (
          <p
            style={{
              fontFamily: 'var(--font-accent-serif)',
              fontSize: '1.15rem',
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.02em',
            }}
          >
            {chapter.name} — {chapter.school}
          </p>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        <StatCard label="Orgs logged this week"       value={stats.orgs}                loading={statsLoading} />
        <StatCard label="Books received this week"    value={stats.books}               loading={statsLoading} />
        <StatCard label="Distributions this week"     value={stats.distributions}       loading={statsLoading} />
        <StatCard label="Active conversations"        value={stats.activeConversations} loading={statsLoading} />
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="pill-button orange" style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }} onClick={() => setModal('addOrg')}>
          + Add Organization
        </button>
        <button className="pill-button primary" style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }} onClick={() => setModal('logBooks')}>
          + Log Books
        </button>
        <button className="pill-button secondary" style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }} onClick={() => setModal('logDist')}>
          + Log Distribution
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* ── Overdue Follow-Ups ── */}
        <section>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1rem',
              color: 'white',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Overdue Follow-Ups
          </h2>

          {overdueLoad ? (
            <div className="p4c-spinner" style={{ width: 28, height: 28 }} />
          ) : overdue.length === 0 ? (
            <div
              className="dash-card"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#86efac' }}
            >
              <span style={{ fontSize: '1.3rem' }}>✓</span>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem' }}>
                All follow-ups are on track
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {overdue.map(org => (
                <div
                  key={org.id}
                  className="dash-card"
                  style={{
                    borderLeft: '3px solid #F6AA3C',
                    background: 'rgba(246,170,60,0.06)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/chapter/tracker')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                        {org.org_name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                        {org.current_status}
                      </p>
                    </div>
                    <span
                      style={{
                        background: 'rgba(246,170,60,0.2)',
                        color: '#F6AA3C',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {daysSince(org.updated_at)}d ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── AI Weekly Summary ── */}
        <section>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1rem',
              color: 'white',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Weekly Summary
          </h2>
          <div
            className="dash-card"
            style={{ borderLeft: '3px solid rgba(96,165,250,0.5)', minHeight: '100px' }}
          >
            {aiLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="p4c-spinner" style={{ width: 22, height: 22, borderWidth: 3 }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
                  Generating summary…
                </span>
              </div>
            ) : aiSummary ? (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.65,
                }}
              >
                {aiSummary}
              </p>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
                {import.meta.env.VITE_GROQ_API_KEY
                  ? 'No activity data yet this week.'
                  : 'AI summaries require VITE_GROQ_API_KEY to be configured.'}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Modals ── */}
      {modal === 'addOrg' && (
        <AddOrgModal
          onClose={() => setModal(null)}
          chapterId={chapterId}
          userId={user?.id}
          onSaved={() => showToast('Organization saved!')}
        />
      )}
      {modal === 'logBooks' && (
        <LogBooksModal
          onClose={() => setModal(null)}
          chapterId={chapterId}
          userId={user?.id}
          onSaved={() => showToast('Books logged!')}
        />
      )}
      {modal === 'logDist' && (
        <LogDistributionModal
          onClose={() => setModal(null)}
          chapterId={chapterId}
          userId={user?.id}
          onSaved={() => showToast('Distribution logged!')}
        />
      )}
    </div>
  )
}
