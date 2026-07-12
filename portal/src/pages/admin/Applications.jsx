import { useState } from 'react'
import { useApplications } from '../../hooks/useApplications.js'

const TABS = ['pending', 'approved', 'rejected']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Detail field helper ────────────────────────────────────────
function DetailField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.68rem',
        color: '#F6AA3C', textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: '0.3rem', margin: '0 0 0.3rem',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.9rem',
        color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, margin: 0,
      }}>
        {value}
      </p>
    </div>
  )
}

// ── Application Card ───────────────────────────────────────────
function AppCard({ app, onApprove, onReject }) {
  const [expanded,  setExpanded]  = useState(false)
  const [working,   setWorking]   = useState(null)   // 'approve' | 'reject'
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [notice,    setNotice]    = useState('')

  async function handleApprove() {
    setWorking('approve')
    const { error, inviteNote } = await onApprove(app)
    setWorking(null)
    if (error) { setNotice(`Error: ${error.message}`); return }
    if (inviteNote) setNotice(inviteNote)
  }

  async function handleReject() {
    setWorking('reject')
    const { error } = await onReject(app.id, rejectReason)
    setWorking(null)
    setRejectModal(false)
    if (error) setNotice(`Error: ${error.message}`)
  }

  return (
    <>
      <div style={{
        background: '#122847', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {/* Header row */}
        <div
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1rem 1.25rem', cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'white', margin: 0 }}>
              {app.applicant_name}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: '0.15rem' }}>
              {app.school_name} · {app.city}, {app.state} · Grade {app.grade}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
              Submitted {fmtDate(app.submitted_at)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>{expanded ? '▾' : '▸'}</span>
          </div>
        </div>

        {/* Expanded details */}
        <div className={`p4c-expand ${expanded ? 'p4c-expand-open' : 'p4c-expand-closed'}`}>
          <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Full-width text fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', paddingTop: '1.25rem' }}>
              <DetailField label="Why they're interested" value={app.why_interested} />
              <DetailField label="Why passionate about literacy" value={app.why_literacy} />
              <DetailField label="Chapter plan" value={app.chapter_plan} />
            </div>

            {/* 2-column short fields */}
            {(app.hours_per_week || app.has_teammates || app.leadership_roles) && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                marginTop: '1.1rem',
              }}>
                <DetailField label="Hours per week" value={app.hours_per_week} />
                <DetailField label="Team status" value={app.has_teammates} />
                {app.leadership_roles && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <DetailField label="Leadership roles" value={app.leadership_roles} />
                  </div>
                )}
              </div>
            )}

            {/* Community connections */}
            {app.community_connections && (
              <div style={{ marginTop: '1.1rem' }}>
                <DetailField label="Community connections" value={app.community_connections} />
              </div>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '1.25rem 0 1rem' }} />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                {app.applicant_email}
              </span>
            </div>

            {notice && (
              <div style={{
                marginTop: '0.75rem', padding: '0.75rem 1rem',
                background: 'rgba(246,170,60,0.08)', border: '1px solid rgba(246,170,60,0.2)',
                borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#F6AA3C',
              }}>
                ⚠ {notice}
              </div>
            )}

            {app.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                <button
                  onClick={handleApprove}
                  disabled={!!working}
                  style={{
                    padding: '0.5rem 1.25rem', background: '#14532d',
                    border: '1px solid rgba(134,239,172,0.3)', borderRadius: '8px',
                    color: '#86efac', fontFamily: 'var(--font-body)', fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  {working === 'approve' ? <span className="p4c-spinner-sm" /> : '✓ Approve'}
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={!!working}
                  style={{
                    padding: '0.5rem 1.25rem', background: '#450a0a',
                    border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px',
                    color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="p4c-modal-in" style={{
            background: '#0d233e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
            width: 'min(480px,100%)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'white', margin: 0 }}>
              Reject Application
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
              Rejecting <strong style={{ color: 'white' }}>{app.applicant_name}</strong> from {app.school_name}.
            </p>
            <div>
              <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Reason (optional)</label>
              <textarea
                className="p4c-input"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                style={{ minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => setRejectModal(false)}
                style={{
                  flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                  color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', fontWeight: 600,
                  fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={working === 'reject'}
                style={{
                  flex: 2, padding: '0.5rem', background: '#450a0a',
                  border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px',
                  color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 700,
                  fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {working === 'reject' ? <span className="p4c-spinner-sm" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Applications ──────────────────────────────────────────
export default function Applications() {
  const [activeTab, setActiveTab] = useState('pending')
  const { applications, loading, approveApplication, rejectApplication } = useApplications(activeTab)

  const emptyMessages = {
    pending:  { icon: '📥', text: 'No pending applications.' },
    approved: { icon: '✅', text: 'No approved applications yet.' },
    rejected: { icon: '🗄️', text: 'No rejected applications.' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.3rem', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.45rem 1.25rem', borderRadius: '7px', border: 'none',
              background: activeTab === tab ? '#F6AA3C' : 'transparent',
              color: activeTab === tab ? '#1a365d' : 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="p4c-spinner" />
        </div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{emptyMessages[activeTab].icon}</div>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
            {emptyMessages[activeTab].text}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {applications.map((app, i) => (
            <div key={app.id} className="p4c-item-in" style={{ animationDelay: `${Math.min(i, 10) * 0.05}s` }}>
              <AppCard
                app={app}
                onApprove={approveApplication}
                onReject={rejectApplication}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
