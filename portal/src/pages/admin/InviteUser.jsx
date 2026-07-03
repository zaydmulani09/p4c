import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

const ROLES = [
  { value: 'volunteer',      label: 'Volunteer' },
  { value: 'chapter_lead',   label: 'Chapter Lead' },
  { value: 'national_admin', label: 'National Admin' },
]

const EMPTY = { email: '', full_name: '', role: 'volunteer', chapter_id: '' }

export default function InviteUser() {
  const [form,     setForm]     = useState(EMPTY)
  const [chapters, setChapters] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState('')
  const [warning,  setWarning]  = useState('')
  const [error,    setError]    = useState('')
  const [errors,   setErrors]   = useState({})

  // Fetch active chapters for the chapter dropdown
  useEffect(() => {
    supabase
      .from('chapters')
      .select('id, name, school')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setChapters(data ?? []))
  }, [])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
    setSuccess('')
    setWarning('')
    setError('')
  }

  function validate() {
    const e = {}
    if (!form.email.trim())     e.email     = 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (!form.full_name.trim()) e.full_name = 'Full name is required.'
    if (!form.role)             e.role      = 'Role is required.'
    if (form.role !== 'national_admin' && !form.chapter_id) e.chapter_id = 'Chapter is required for this role.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setError('')
    setSuccess('')
    setWarning('')

    const { data, error: fnErr } = await supabase.functions.invoke('invite-user', {
      body: {
        email:      form.email.trim().toLowerCase(),
        full_name:  form.full_name.trim(),
        role:       form.role,
        chapter_id: form.role === 'national_admin' ? null : form.chapter_id,
      },
    })

    setLoading(false)

    if (fnErr) {
      setError(fnErr.message ?? 'Failed to send invite. Check edge function logs.')
      return
    }

    if (data?.error) {
      setError(data.error)
      return
    }

    if (data?.warning) setWarning(data.warning)

    setSuccess(form.email.trim().toLowerCase())
    setForm(EMPTY)
  }

  const needsChapter = form.role !== 'national_admin'

  return (
    <div style={{ maxWidth: '580px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: '#F6AA3C', color: '#1a365d',
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: '0.6rem', padding: '0.2rem 0.65rem',
          transform: 'skewX(-15deg)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>
          <span style={{ transform: 'skewX(15deg)' }}>National Admin</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: '1.75rem', color: 'white', margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Invite User
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.5)', margin: '0.4rem 0 0',
        }}>
          Send a magic-link invite. The user sets their password on first sign-in.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem',
          background: 'rgba(20,83,45,0.4)', border: '1px solid rgba(134,239,172,0.3)',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.1rem' }}>✓</span>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: '#86efac', margin: 0 }}>
              Invite sent to {success}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(134,239,172,0.65)', margin: '0.15rem 0 0' }}>
              They'll receive an email with a magic link to set their password.
            </p>
          </div>
        </div>
      )}

      {/* Warning banner */}
      {warning && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem',
          background: 'rgba(246,170,60,0.08)', border: '1px solid rgba(246,170,60,0.3)',
          borderRadius: '12px',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem', color: '#F6AA3C', margin: 0 }}>
            ⚠ {warning}
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem',
          background: 'rgba(69,10,10,0.5)', border: '1px solid rgba(252,165,165,0.3)',
          borderRadius: '12px',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem', color: '#fca5a5', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Form card */}
      <div style={{
        background: '#122847', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', padding: '1.75rem',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Email */}
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Email Address</label>
            <input
              type="email"
              className={`p4c-input${errors.email ? ' input-error' : ''}`}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="team@example.com"
              autoComplete="off"
            />
            {errors.email && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.35rem' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Full name */}
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Full Name</label>
            <input
              type="text"
              className={`p4c-input${errors.full_name ? ' input-error' : ''}`}
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="First Last"
              autoComplete="off"
            />
            {errors.full_name && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.35rem' }}>
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Role</label>
            <select
              className={`p4c-input${errors.role ? ' input-error' : ''}`}
              value={form.role}
              onChange={e => set('role', e.target.value)}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.35rem' }}>
                {errors.role}
              </p>
            )}
          </div>

          {/* Chapter — hidden for national_admin */}
          {needsChapter && (
            <div>
              <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Chapter</label>
              <select
                className={`p4c-input${errors.chapter_id ? ' input-error' : ''}`}
                value={form.chapter_id}
                onChange={e => set('chapter_id', e.target.value)}
              >
                <option value="">Select chapter…</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.school}</option>
                ))}
              </select>
              {errors.chapter_id && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.35rem' }}>
                  {errors.chapter_id}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.25rem',
              padding: '0.75rem 2rem',
              background: loading ? 'rgba(246,170,60,0.4)' : '#F6AA3C',
              color: '#1a365d',
              border: 'none',
              borderRadius: '50px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            {loading && <span className="p4c-spinner-sm" style={{ borderTopColor: '#1a365d', borderColor: 'rgba(26,54,93,0.3)' }} />}
            {loading ? 'Sending invite…' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Help text */}
      <div style={{
        marginTop: '1.25rem', padding: '1rem 1.25rem',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
      }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
          How it works
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {[
            'An invite email is sent to the address above.',
            'The user clicks the link and sets their password.',
            'They are automatically signed in to their role dashboard.',
            'Their profile row is created instantly — no manual SQL needed.',
          ].map((txt, i) => (
            <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: '#F6AA3C', flexShrink: 0 }}>{i + 1}.</span>
              {txt}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
