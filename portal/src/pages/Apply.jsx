import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { supabase } from '../lib/supabase.js'

const GRADES = ['9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College Freshman', 'College Sophomore', 'College Junior', 'College Senior']
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const EMPTY = {
  applicant_name: '',
  applicant_email: '',
  school_name: '',
  city: '',
  state: '',
  grade: '',
  why_interested: '',
}

export default function Apply() {
  const [form,      setForm]      = useState(EMPTY)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [submitted, setSubmitted] = useState(false)

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: insertErr } = await supabase
      .from('chapter_applications')
      .insert([{ ...form, status: 'pending' }])

    if (insertErr) {
      setError(insertErr.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--collage-bg)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8rem 1.5rem 4rem',
            textAlign: 'center',
          }}
        >
          <div className="fade-up" style={{ maxWidth: '520px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📖</div>
            <div className="hashtag-badge" style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>A P P L I E D</div>
            <h2 className="section-h2 dark" style={{ marginBottom: '1rem' }}>
              Application Received!
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-accent-serif)',
                fontStyle: 'italic',
                fontSize: '1.3rem',
                fontWeight: 600,
                color: '#1a365d',
                opacity: 0.8,
                marginBottom: '1rem',
              }}
            >
              We'll be in touch within a week.
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: '#1a365d', opacity: 0.65, lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Thank you, <strong>{form.applicant_name}</strong>! Your application for{' '}
              <strong>{form.school_name}</strong> has been submitted. Our team reviews
              every application and will reach out to <strong>{form.applicant_email}</strong>.
            </p>
            <Link to="/" className="pill-button primary">← Back to Portal Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--collage-bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ flex: 1, padding: '8rem 1.5rem 5rem' }}>
        <div className="fade-up" style={{ maxWidth: '660px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="hashtag-badge" style={{ display: 'inline-flex' }}>A P P L Y</div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
                color: '#1a365d',
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
                fontSize: '1.3rem',
                fontWeight: 600,
                color: '#1a365d',
                opacity: 0.7,
              }}
            >
              Takes less than 5 minutes. We review every application.
            </p>
          </div>

          {/* Form card */}
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 20px 60px rgba(26,54,93,0.1)',
            }}
          >
            {error && (
              <div
                style={{
                  background: 'rgba(157,23,77,0.08)',
                  border: '1px solid rgba(157,23,77,0.3)',
                  borderRadius: '10px',
                  padding: '0.8rem 1rem',
                  marginBottom: '1.5rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  color: '#9d174d',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
              {/* Row: name + email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="p4c-label dark">Full Name</label>
                  <input
                    type="text"
                    className="p4c-input on-cream"
                    placeholder="Jane Smith"
                    value={form.applicant_name}
                    onChange={set('applicant_name')}
                    required
                  />
                </div>
                <div>
                  <label className="p4c-label dark">Email</label>
                  <input
                    type="email"
                    className="p4c-input on-cream"
                    placeholder="jane@example.com"
                    value={form.applicant_email}
                    onChange={set('applicant_email')}
                    required
                  />
                </div>
              </div>

              {/* School name */}
              <div>
                <label className="p4c-label dark">School Name</label>
                <input
                  type="text"
                  className="p4c-input on-cream"
                  placeholder="Lincoln High School"
                  value={form.school_name}
                  onChange={set('school_name')}
                  required
                />
              </div>

              {/* Row: city + state */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="p4c-label dark">City</label>
                  <input
                    type="text"
                    className="p4c-input on-cream"
                    placeholder="Springfield"
                    value={form.city}
                    onChange={set('city')}
                    required
                  />
                </div>
                <div>
                  <label className="p4c-label dark">State</label>
                  <select
                    className="p4c-input on-cream"
                    value={form.state}
                    onChange={set('state')}
                    required
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="p4c-label dark">Grade</label>
                <select
                  className="p4c-input on-cream"
                  value={form.grade}
                  onChange={set('grade')}
                  required
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select grade…</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Why interested */}
              <div>
                <label className="p4c-label dark">Why do you want to start a chapter?</label>
                <textarea
                  className="p4c-input on-cream"
                  placeholder="Tell us what motivates you and what you hope to achieve…"
                  value={form.why_interested}
                  onChange={set('why_interested')}
                  required
                />
              </div>

              <button
                type="submit"
                className="pill-button primary"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  fontSize: '1.1rem',
                  padding: '1rem 2.5rem',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Submitting…' : 'Submit Application →'}
              </button>
            </form>
          </div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#1a365d', opacity: 0.5, textAlign: 'center', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#1a365d', fontWeight: 700, opacity: 1 }}>Log in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
