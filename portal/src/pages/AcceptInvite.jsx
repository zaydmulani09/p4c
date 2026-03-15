import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { supabase } from '../lib/supabase.js'

const ROLE_ROUTES = {
  national_admin: '/admin',
  chapter_lead:   '/chapter',
  volunteer:      '/volunteer',
}

export default function AcceptInvite() {
  const navigate = useNavigate()

  const [phase,    setPhase]    = useState('waiting') // 'waiting' | 'set-password' | 'submitting' | 'done' | 'error'
  const [session,  setSession]  = useState(null)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState(null)

  // Supabase processes the #access_token from the URL automatically.
  // onAuthStateChange fires PASSWORD_RECOVERY or SIGNED_IN once it's exchanged.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && sess) {
        setSession(sess)
        setPhase('set-password')
      }
      if (event === 'USER_UPDATED') {
        setPhase('done')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSetPassword(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError({ field: 'password', message: 'Password must be at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      setError({ field: 'confirm', message: 'Passwords do not match.' })
      return
    }

    setPhase('submitting')

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError({ field: 'form', message: updateErr.message })
      setPhase('set-password')
      return
    }

    // Fetch role and redirect
    const userId = session?.user?.id
    if (userId) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      const dest = ROLE_ROUTES[profile?.role] ?? '/login'
      setTimeout(() => navigate(dest), 1200)
    }

    setPhase('done')
  }

  // ── Waiting for token exchange ────────────────────────────
  if (phase === 'waiting') {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div className="p4c-spinner" style={{ margin: '0 auto 1.5rem' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
            Verifying your invite link…
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
            If this takes too long,{' '}
            <Link to="/login" style={{ color: '#F6AA3C', textDecoration: 'none' }}>try logging in</Link>.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Success ───────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }} className="fade-up">
          <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem' }}>🎉</div>
          <div className="hashtag-badge" style={{ display: 'inline-flex', marginBottom: '1.2rem' }}>W E L C O M E</div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem',
            color: 'white', marginBottom: '0.5rem',
          }}>
            Password set!
          </h2>
          <p style={{
            fontFamily: 'var(--font-accent-serif)', fontStyle: 'italic', fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.6)',
          }}>
            Redirecting you to your dashboard…
          </p>
          <div className="p4c-spinner" style={{ margin: '1.5rem auto 0' }} />
        </div>
      </Shell>
    )
  }

  // ── Set password form ─────────────────────────────────────
  return (
    <Shell>
      <div className="fade-up" style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="hashtag-badge" style={{ display: 'inline-flex' }}>A C C E P T   I N V I T E</div>
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
            Set your password.
          </h1>
          <p style={{
            fontFamily: 'var(--font-accent-serif)', fontStyle: 'italic', fontSize: '1.05rem',
            color: 'rgba(255,255,255,0.55)', marginBottom: '2rem',
          }}>
            You'll use this to access the P4C portal.
          </p>

          {error?.field === 'form' && (
            <div style={{
              background: 'rgba(157,23,77,0.2)', border: '1px solid rgba(157,23,77,0.4)',
              borderRadius: '10px', padding: '0.8rem 1rem', marginBottom: '1.5rem',
              fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#fca5a5',
            }}>
              {error.message}
            </div>
          )}

          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label className="p4c-label">New Password</label>
              <input
                type="password"
                className="p4c-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {error?.field === 'password' && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#fca5a5', marginTop: '0.4rem' }}>
                  {error.message}
                </p>
              )}
            </div>

            <div>
              <label className="p4c-label">Confirm Password</label>
              <input
                type="password"
                className="p4c-input"
                placeholder="Same as above"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {error?.field === 'confirm' && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#fca5a5', marginTop: '0.4rem' }}>
                  {error.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="pill-button primary"
              disabled={phase === 'submitting'}
              style={{
                width: '100%', marginTop: '0.5rem',
                opacity: phase === 'submitting' ? 0.7 : 1,
                cursor:  phase === 'submitting' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              }}
            >
              {phase === 'submitting'
                ? <><span className="p4c-spinner-sm" />Setting password…</>
                : 'Set Password & Enter Portal →'
              }
            </button>
          </form>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-color)', display: 'flex', flexDirection: 'column' }}>
      <Navbar darkBg />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8rem 1.5rem 4rem' }}>
        {children}
      </div>
    </div>
  )
}
