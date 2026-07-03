import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { supabase } from '../lib/supabase.js'

const GRADES = [
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
  'College Freshman', 'College Sophomore', 'College Junior', 'College Senior',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const EMPTY = {
  applicant_name:  '',
  applicant_email: '',
  school_name:     '',
  city:            '',
  state:           '',
  grade:           '',
  why_interested:  '',
}

function validate(form) {
  const errs = {}
  if (!form.applicant_name.trim())
    errs.applicant_name = 'Full name is required.'
  if (!form.applicant_email.trim())
    errs.applicant_email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.applicant_email))
    errs.applicant_email = 'Enter a valid email address.'
  if (!form.school_name.trim())
    errs.school_name = 'School name is required.'
  if (!form.city.trim())
    errs.city = 'City is required.'
  if (!form.state)
    errs.state = 'State is required.'
  if (!form.grade)
    errs.grade = 'Grade is required.'
  if (!form.why_interested.trim())
    errs.why_interested = 'Please tell us why you want to start a chapter.'
  else if (form.why_interested.trim().length < 100)
    errs.why_interested = `At least 100 characters required (${form.why_interested.trim().length}/100).`
  return errs
}

function FieldError({ msg }) {
  if (!msg) return null
  return (
    <p style={{
      fontFamily: 'var(--font-body)',
      fontSize: '0.78rem',
      color: '#fca5a5',
      marginTop: '0.35rem',
    }}>
      {msg}
    </p>
  )
}

export default function Apply() {
  const [form,        setForm]        = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading,     setLoading]     = useState(false)
  const [serverError, setServerError] = useState(null)
  const [submitted,   setSubmitted]   = useState(false)

  function set(key) {
    return e => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      if (fieldErrors[key]) setFieldErrors(fe => ({ ...fe, [key]: null }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError(null)

    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    const { error: insertErr } = await supabase
      .from('chapter_applications')
      .insert([{ ...form, status: 'pending' }])

    if (insertErr) {
      setServerError(insertErr.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  const whyLen = form.why_interested.trim().length

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--primary-color)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8rem 1.5rem 4rem',
          textAlign: 'center',
        }}>
          <div className="fade-up" style={{ maxWidth: '520px' }}>
            <div
              style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                background: 'rgba(74,222,128,0.12)',
                border: '2px solid rgba(74,222,128,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 1.75rem',
              }}
            >
              ✓
            </div>
            <div className="hashtag-badge" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
              <span style={{ transform: 'skewX(15deg)' }}>A P P L I E D</span>
            </div>
            <h2
              className="section-h2"
              style={{ marginBottom: '1rem', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}
            >
              Application submitted!
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
              }}
            >
              Thank you, <strong style={{ color: 'white' }}>{form.applicant_name}</strong>!
              Your application for <strong style={{ color: 'white' }}>{form.school_name}</strong> has been
              received. We'll be in touch at{' '}
              <strong style={{ color: '#F6AA3C' }}>{form.applicant_email}</strong> within 48 hours.
            </p>
            <Link to="/" className="pill-button orange">← Back to Portal Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ flex: 1, padding: '8rem 1.5rem 5rem' }}>
        <div className="fade-up" style={{ maxWidth: '680px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="hashtag-badge" style={{ display: 'inline-flex' }}>
              <span style={{ transform: 'skewX(15deg)' }}>J O I N T H E N E T W O R K</span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
                color: 'white',
                lineHeight: 1.1,
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Start a Chapter.
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-accent-serif)',
                fontStyle: 'italic',
                fontSize: '1.2rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              Tell us about yourself and your school. We'll review your application within 48 hours.
            </p>
          </div>

          {/* Form card */}
          <div
            style={{
              background: '#0d233e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '2.5rem',
            }}
          >
            {serverError && (
              <div style={{
                background: 'rgba(157,23,77,0.08)',
                border: '1px solid rgba(157,23,77,0.3)',
                borderRadius: '10px',
                padding: '0.8rem 1rem',
                marginBottom: '1.5rem',
                fontFamily: 'var(--font-body)',
                fontSize: '0.88rem',
                color: '#fca5a5',
              }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>

              {/* Name + Email */}
              <div className="apply-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="p4c-label">Full Name</label>
                  <input
                    type="text"
                    className={`p4c-input${fieldErrors.applicant_name ? ' input-error' : ''}`}
                    placeholder="Jane Smith"
                    value={form.applicant_name}
                    onChange={set('applicant_name')}
                  />
                  <FieldError msg={fieldErrors.applicant_name} />
                </div>
                <div>
                  <label className="p4c-label">Email</label>
                  <input
                    type="email"
                    className={`p4c-input${fieldErrors.applicant_email ? ' input-error' : ''}`}
                    placeholder="jane@example.com"
                    value={form.applicant_email}
                    onChange={set('applicant_email')}
                  />
                  <FieldError msg={fieldErrors.applicant_email} />
                </div>
              </div>

              {/* School */}
              <div>
                <label className="p4c-label">School Name</label>
                <input
                  type="text"
                  className={`p4c-input${fieldErrors.school_name ? ' input-error' : ''}`}
                  placeholder="Lincoln High School"
                  value={form.school_name}
                  onChange={set('school_name')}
                />
                <FieldError msg={fieldErrors.school_name} />
              </div>

              {/* City + State */}
              <div className="apply-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="p4c-label">City</label>
                  <input
                    type="text"
                    className={`p4c-input${fieldErrors.city ? ' input-error' : ''}`}
                    placeholder="Springfield"
                    value={form.city}
                    onChange={set('city')}
                  />
                  <FieldError msg={fieldErrors.city} />
                </div>
                <div>
                  <label className="p4c-label">State</label>
                  <select
                    className={`p4c-input${fieldErrors.state ? ' input-error' : ''}`}
                    value={form.state}
                    onChange={set('state')}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <FieldError msg={fieldErrors.state} />
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="p4c-label">Grade</label>
                <select
                  className={`p4c-input${fieldErrors.grade ? ' input-error' : ''}`}
                  value={form.grade}
                  onChange={set('grade')}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select grade…</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <FieldError msg={fieldErrors.grade} />
              </div>

              {/* Why interested */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <label className="p4c-label" style={{ marginBottom: 0 }}>
                    Why do you want to start a chapter?
                  </label>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: whyLen >= 100 ? '#4ade80' : whyLen > 50 ? '#F6AA3C' : 'rgba(255,255,255,0.3)',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {whyLen}/100
                  </span>
                </div>
                <textarea
                  className={`p4c-input${fieldErrors.why_interested ? ' input-error' : ''}`}
                  placeholder="Tell us what motivates you and what you hope to achieve in your community…"
                  value={form.why_interested}
                  onChange={set('why_interested')}
                  style={{ minHeight: '140px' }}
                />
                <FieldError msg={fieldErrors.why_interested} />
              </div>

              <button
                type="submit"
                className="pill-button orange"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  fontSize: '1.05rem',
                  padding: '1rem 2.5rem',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading
                  ? <><span className="p4c-spinner-sm" />&nbsp; Submitting…</>
                  : 'Submit Application →'}
              </button>
            </form>
          </div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Log in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
