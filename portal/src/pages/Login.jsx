import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const ROLE_ROUTES = {
  national_admin: '/admin',
  chapter_lead:   '/chapter',
  volunteer:      '/volunteer',
}

function mapAuthError(msg = '') {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return { field: 'password', message: 'Incorrect email or password.' }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed'))
    return { field: 'email', message: 'Please verify your email before signing in.' }
  if (msg.includes('User not found'))
    return { field: 'email', message: 'No account found with this email.' }
  return { field: 'form', message: 'Something went wrong. Please try again.' }
}

export default function Login() {
  const navigate    = useNavigate()
  const { user, role, loading: authLoading } = useAuth()

  const [email,   setEmail]   = useState('')
  const [password,setPassword]= useState('')
  const [error,   setError]   = useState(null)   // { field, message } | null
  const [loading, setLoading] = useState(false)

  // Already logged in → go to dashboard
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(ROLE_ROUTES[role] ?? '/', { replace: true })
    }
  }, [authLoading, user, role, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr) {
      setError(mapAuthError(authErr.message))
      setLoading(false)
      return
    }

    // Fetch role (AuthContext will also update via onAuthStateChange, but we need it now for redirect)
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profileErr || !profile?.role) {
      setError({ field: 'form', message: 'Account found but no portal role assigned. Contact your administrator.' })
      setLoading(false)
      return
    }

    navigate(ROLE_ROUTES[profile.role] ?? '/', { replace: true })
    // no need to setLoading(false) — component unmounts
  }

  if (authLoading) return null // AuthContext loading — Guard/spinner handles it

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)', display: 'flex', flexDirection: 'column' }}>
      <Navbar darkBg />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8rem 1.5rem 4rem' }}>
        <div className="fade-up" style={{ width: '100%', maxWidth: '460px' }}>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="hashtag-badge" style={{ display: 'inline-flex' }}>P O R T A L   L O G I N</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '2.5rem',
            backdropFilter: 'blur(16px)',
          }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2rem',
              color: 'white', marginBottom: '0.4rem', letterSpacing: '-0.02em',
            }}>
              Welcome back.
            </h1>
            <p style={{
              fontFamily: 'var(--font-accent-serif)', fontStyle: 'italic', fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.6)', marginBottom: '2rem',
            }}>
              Sign in to your chapter portal.
            </p>

            {/* Form-level error */}
            {error?.field === 'form' && (
              <div style={{
                background: 'rgba(157,23,77,0.2)', border: '1px solid rgba(157,23,77,0.4)',
                borderRadius: '10px', padding: '0.8rem 1rem', marginBottom: '1.5rem',
                fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#fca5a5',
                transition: 'all 0.3s ease',
              }}>
                {error.message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Email */}
              <div>
                <label className="p4c-label">Email address</label>
                <input
                  type="email"
                  className={`p4c-input${error?.field === 'email' ? ' input-error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  required
                  autoComplete="email"
                />
                {error?.field === 'email' && (
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#fca5a5',
                    marginTop: '0.4rem', transition: 'all 0.3s ease',
                  }}>
                    {error.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="p4c-label">Password</label>
                <input
                  type="password"
                  className={`p4c-input${error?.field === 'password' ? ' input-error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  required
                  autoComplete="current-password"
                />
                {error?.field === 'password' && (
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#fca5a5',
                    marginTop: '0.4rem', transition: 'all 0.3s ease',
                  }}>
                    {error.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="pill-button primary"
                disabled={loading}
                style={{
                  width: '100%', marginTop: '0.5rem',
                  opacity: loading ? 0.8 : 1,
                  cursor:  loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem',
                  transition: 'all 0.3s ease',
                }}
              >
                {loading
                  ? <><span className="p4c-spinner-sm" />Signing in…</>
                  : 'Sign In →'
                }
              </button>
            </form>

            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '1.5rem',
            }}>
              Don't have an account?{' '}
              <Link to="/apply" style={{ color: '#F6AA3C', fontWeight: 700, textDecoration: 'none' }}>
                Apply to start a chapter →
              </Link>
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link
              to="/"
              style={{
                fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
                transition: 'color 0.3s ease',
              }}
              onMouseOver={e => (e.target.style.color = 'rgba(255,255,255,0.75)')}
              onMouseOut={e  => (e.target.style.color = 'rgba(255,255,255,0.35)')}
            >
              ← Back to Portal Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
