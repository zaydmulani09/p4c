import { useState, useEffect } from 'react'
import { useNetworkStats } from '../../hooks/useNetworkStats.js'

// ── AI Network Summary ─────────────────────────────────────────
async function fetchNetworkSummary(stats) {
  const weekNum  = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const cacheKey = `p4c_network_summary_w${weekNum}`
  const cached   = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const { text, ts } = JSON.parse(cached)
      if (text && !text.toLowerCase().includes('unavailable') && Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return text
    } catch {}
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return null

  try {
    const isEarlyStage = !stats.totalBooksDistributed && !stats.totalOrgsContacted
    const systemContent = isEarlyStage
      ? 'You are a helpful assistant for Pages for Change, a student-led literacy nonprofit network. Write a brief, encouraging message for the national leadership team. Under 4 sentences. No bullet points.'
      : 'You are a helpful assistant for Pages for Change, a student-led literacy nonprofit network. Write a brief encouraging weekly summary for the national leadership team based on network-wide activity. Be specific with numbers. Under 4 sentences. No bullet points.'
    const userContent = isEarlyStage
      ? 'Pages for Change is a new student-led literacy nonprofit just getting started. Write an encouraging message about the exciting opportunity ahead to build a book distribution network and make a lasting impact in communities.'
      : `Network stats: ${stats.totalChapters} active chapters, ${stats.totalBooksDistributed} books in inventory, ${stats.totalOrgsContacted} organizations contacted network-wide, ${stats.totalPartnerships} established partnerships.`
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
    <div style={{
      background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: '4px solid #F6AA3C', borderRadius: '12px', padding: '1.5rem',
    }}>
      {loading ? (
        <div className="p4c-spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
      ) : (
        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2.2rem', color: '#F6AA3C', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
        {label}
      </p>
    </div>
  )
}

// ── Health Dot ─────────────────────────────────────────────────
function HealthDot({ indicator }) {
  const colors = { green: '#4ade80', amber: '#fb923c', red: '#f87171' }
  return (
    <span style={{
      display: 'inline-block', width: '10px', height: '10px',
      borderRadius: '50%', background: colors[indicator] ?? colors.red,
      flexShrink: 0,
    }} />
  )
}

export default function AdminDashboard() {
  const { stats, leaderboard, healthFeed, activity, loading } = useNetworkStats()
  const [aiSummary,     setAiSummary]     = useState(null)
  const [aiLoading,     setAiLoading]     = useState(false)

  useEffect(() => {
    if (!stats) return
    setAiLoading(true)
    fetchNetworkSummary(stats).then(text => {
      setAiSummary(text)
      setAiLoading(false)
    })
  }, [stats])

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function daysSince(d) {
    if (!d) return null
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'white',
          letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.35rem',
        }}>
          Pages for Change Network
        </h1>
        <p style={{ fontFamily: 'var(--font-accent-serif)', fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
          Co-Executive Directors: Zayd Mulani &amp; Affan Shaik
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: '#F6AA3C', color: '#1a365d',
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: '0.72rem', padding: '0.25rem 0.9rem',
          transform: 'skewX(-15deg)', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span style={{ transform: 'skewX(15deg)' }}>⭐ Founding Chapter · South Brunswick, NJ</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard label="Active Chapters"         value={stats?.totalChapters}       loading={loading} />
        <StatCard label="Books in Inventory"      value={stats?.totalBooksDistributed} loading={loading} />
        <StatCard label="Organizations Contacted" value={stats?.totalOrgsContacted}   loading={loading} />
        <StatCard label="Partnerships Established" value={stats?.totalPartnerships}   loading={loading} />
      </div>

      {/* AI Summary */}
      <div style={{
        background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem' }}>✨</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>
            Weekly Network Summary
          </h2>
          <span style={{
            fontSize: '0.65rem', background: 'rgba(246,170,60,0.15)', color: '#F6AA3C',
            padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700,
          }}>AI · Groq</span>
        </div>
        {aiLoading || loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="p4c-spinner" style={{ width: 20, height: 20 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Generating summary…</span>
          </div>
        ) : aiSummary ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
            {aiSummary}
          </p>
        ) : (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
            Set VITE_GROQ_API_KEY to enable AI summaries.
          </p>
        )}
      </div>

      {/* Two-column: Leaderboard + Health Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Chapter Leaderboard */}
        <div style={{ background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>Chapter Leaderboard</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>Ranked by books distributed</p>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="p4c-spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '420px' }}>
                <thead>
                  <tr>
                    {['#', 'Chapter', 'Books Dist.', 'Partnerships', 'Founded'].map(h => (
                      <th key={h} style={{
                        padding: '0.5rem 0.75rem', textAlign: 'left',
                        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.68rem',
                        color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.85rem', color: i === 0 ? '#F6AA3C' : 'rgba(255,255,255,0.5)' }}>
                        {i === 0 ? '🏆' : i + 1}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'white', margin: 0 }}>{c.name}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{c.city}, {c.state}</p>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: '#F6AA3C' }}>{c.booksDistributed}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>{c.partnerships}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{fmtDate(c.founded_date)}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && !loading && (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>No chapters yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chapter Health Feed */}
        <div style={{ background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>Chapter Health</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              {[['green', '≤7 days'], ['amber', '7-14 days'], ['red', '14+ days / no activity']].map(([color, label]) => (
                <span key={color} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                  <HealthDot indicator={color} />{label}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="p4c-spinner" /></div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '340px' }}>
              {healthFeed.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <HealthDot indicator={c.indicator} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      {c.daysSince == null ? 'No activity recorded' : `Last active ${c.daysSince}d ago`}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                    {c.city}, {c.state}
                  </span>
                </div>
              ))}
              {healthFeed.length === 0 && (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>No active chapters.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div style={{ background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>Recent Network Activity</h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="p4c-spinner" /></div>
        ) : (
          <div>
            {activity.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.type === 'org' ? '🤝' : '📚'}</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: 0, flex: 1 }}>
                  {item.type === 'org' ? 'New organization added' : 'Books logged'}
                </p>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                  {fmtDate(item.created_at)}
                </span>
              </div>
            ))}
            {activity.length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>No activity yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
