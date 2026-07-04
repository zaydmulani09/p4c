import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { generateImpactReport } from '../../lib/groq.js'
import '../../print.css'

const PERIODS = [
  { value: 'thisMonth',    label: 'This Month' },
  { value: 'lastMonth',    label: 'Last Month' },
  { value: 'thisSemester', label: 'This Semester' },
  { value: 'thisYear',     label: 'This Year' },
  { value: 'custom',       label: 'Custom Range' },
]

function getPeriodRange(period, customStart, customEnd) {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth()

  switch (period) {
    case 'thisMonth':
      return {
        start: new Date(y, m, 1).toISOString(),
        end:   now.toISOString(),
        label: `${now.toLocaleString('en-US', { month: 'long' })} ${y}`,
      }
    case 'lastMonth': {
      const d = new Date(y, m - 1, 1)
      return {
        start: d.toISOString(),
        end:   new Date(y, m, 0, 23, 59, 59, 999).toISOString(),
        label: `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`,
      }
    }
    case 'thisSemester': {
      const semStart = new Date(m < 6 ? `${y}-01-01` : `${y}-07-01`)
      return {
        start: semStart.toISOString(),
        end:   now.toISOString(),
        label: m < 6 ? `January–June ${y}` : `July–December ${y}`,
      }
    }
    case 'thisYear':
      return {
        start: new Date(`${y}-01-01`).toISOString(),
        end:   now.toISOString(),
        label: `${y}`,
      }
    case 'custom':
      if (!customStart || !customEnd) return null
      return {
        start: new Date(customStart).toISOString(),
        end:   new Date(customEnd + 'T23:59:59').toISOString(),
        label: `${customStart} to ${customEnd}`,
      }
    default:
      return null
  }
}

async function fetchNetworkImpactData(start, end) {
  const [orgsRes, distsRes, chaptersRes] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, current_status, chapter_id')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('distributions')
      .select('quantity, chapter_id')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('chapters')
      .select('id, name, state')
      .eq('status', 'active'),
  ])

  const orgs     = orgsRes.data     ?? []
  const dists    = distsRes.data    ?? []
  const chapters = chaptersRes.data ?? []

  const statusCounts = {}
  orgs.forEach(o => {
    statusCounts[o.current_status] = (statusCounts[o.current_status] ?? 0) + 1
  })

  const totalBooksDistributed = dists.reduce((s, d) => s + (d.quantity ?? 0), 0)
  const totalPartnerships     = statusCounts['Partnership Established'] ?? 0

  const distByChapter = {}
  dists.forEach(d => {
    distByChapter[d.chapter_id] = (distByChapter[d.chapter_id] ?? 0) + (d.quantity ?? 0)
  })

  const topChapter = [...chapters].sort(
    (a, b) => (distByChapter[b.id] ?? 0) - (distByChapter[a.id] ?? 0)
  )[0] ?? null

  const states = [...new Set(chapters.map(c => c.state).filter(Boolean))].sort()

  return {
    totalChapters:       chapters.length,
    totalOrgs:           orgs.length,
    statusBreakdown:     Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None',
    totalBooksDistributed,
    totalDistributions:  dists.length,
    totalPartnerships,
    topChapter:          topChapter?.name ?? 'N/A',
    topChapterBooks:     topChapter ? (distByChapter[topChapter.id] ?? 0) : 0,
    states:              states.join(', ') || 'N/A',
  }
}

function StatBadge({ label, value }) {
  return (
    <div style={{
      background: '#0d233e',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: '3px solid #F6AA3C',
      borderRadius: '10px',
      padding: '0.9rem 1.1rem',
    }}>
      <p style={{
        fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.6rem',
        color: '#F6AA3C', lineHeight: 1,
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 600,
        color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
        letterSpacing: '0.07em', marginTop: '0.35rem',
      }}>
        {label}
      </p>
    </div>
  )
}

export default function AdminImpact() {
  const [period,      setPeriod]      = useState('thisMonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [impactData,  setImpactData]  = useState(null)
  const [reportText,  setReportText]  = useState('')
  const [fetching,    setFetching]    = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [err,         setErr]         = useState('')

  const range = getPeriodRange(period, customStart, customEnd)

  async function handleFetch() {
    if (!range) return
    setFetching(true)
    setImpactData(null)
    setReportText('')
    setErr('')
    try {
      const data = await fetchNetworkImpactData(range.start, range.end)
      setImpactData(data)
    } catch (e) {
      console.error(e)
      setErr('Failed to load data. Please try again.')
    } finally {
      setFetching(false)
    }
  }

  function buildFallbackReport(data, periodLabel) {
    return [
      'OUTREACH SUMMARY',
      `During ${periodLabel}, the Pages for Change network engaged ${data.totalOrgs} organization${data.totalOrgs !== 1 ? 's' : ''} across ${data.totalChapters} active chapter${data.totalChapters !== 1 ? 's' : ''}. The network's outreach reflects an ongoing effort to expand literacy access in communities nationwide.`,
      '',
      'PARTNERSHIP HIGHLIGHTS',
      `A total of ${data.totalPartnerships} partnership${data.totalPartnerships !== 1 ? 's' : ''} were established during this period. ${data.statusBreakdown !== 'None' ? `Organization status breakdown: ${data.statusBreakdown}.` : 'Outreach efforts continue to build the foundation for future partnerships.'}`,
      '',
      'BOOK DISTRIBUTION',
      `${data.totalBooksDistributed} book${data.totalBooksDistributed !== 1 ? 's' : ''} were distributed across ${data.totalDistributions} distribution${data.totalDistributions !== 1 ? 's' : ''} during this period.${data.topChapter !== 'N/A' ? ` The top performing chapter was ${data.topChapter} with ${data.topChapterBooks} books distributed.` : ''}`,
      '',
      'LOOKING AHEAD',
      `The Pages for Change network remains committed to expanding access to books and literacy resources across ${data.states !== 'N/A' ? data.states : 'all active states'}.`,
    ].join('\n')
  }

  async function handleGenerate() {
    if (!impactData || !range) return
    setGenerating(true)
    setErr('')
    try {
      const text = await generateImpactReport(impactData, range.label, 'national')
      console.log('GROQ RAW:', JSON.stringify(text))
      if (!text || text === 'Summary unavailable — check back later') {
        setReportText(buildFallbackReport(impactData, range.label))
      } else {
        setReportText(text)
      }
    } catch (e) {
      console.error('[Impact] generateImpactReport failed:', e)
      setReportText(buildFallbackReport(impactData, range.label))
    } finally {
      setGenerating(false)
    }
  }

  function buildFullReport() {
    return [
      'PAGES FOR CHANGE NETWORK',
      `${range?.label ?? ''} NATIONAL IMPACT REPORT`,
      'Co-Executive Directors: Zayd Mulani & Affan Shaik',
      'Founding Chapter: South Brunswick, NJ',
      '',
      reportText,
    ].join('\n')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildFullReport())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Header ── */}
      <div className="no-print">
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'white',
          letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.35rem',
        }}>
          National Impact Reports
        </h1>
        <p style={{ fontFamily: 'var(--font-accent-serif)', fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>
          Pages for Change Network
        </p>
      </div>

      {/* ── Period Selector ── */}
      <div className="no-print" style={{
        background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '1.5rem',
      }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: '0.85rem',
        }}>
          Select Period
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: period === 'custom' ? '0.75rem' : 0 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setImpactData(null); setReportText('') }}
              style={{
                padding: '0.45rem 1rem', borderRadius: '20px',
                border: period === p.value ? '1.5px solid #F6AA3C' : '1.5px solid rgba(255,255,255,0.12)',
                background: period === p.value ? 'rgba(246,170,60,0.12)' : 'transparent',
                color: period === p.value ? '#F6AA3C' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.82rem',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <input
              type="date"
              className="p4c-input"
              style={{ width: 'auto' }}
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>to</span>
            <input
              type="date"
              className="p4c-input"
              style={{ width: 'auto' }}
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
        )}

        <button
          className="pill-button orange"
          style={{ marginTop: '1.25rem', fontSize: '0.9rem', padding: '0.6rem 1.4rem' }}
          onClick={handleFetch}
          disabled={fetching || !range}
        >
          {fetching ? <span className="p4c-spinner-sm" /> : 'Load Data'}
        </button>
      </div>

      {/* ── Error ── */}
      {err && (
        <p style={{ color: '#fca5a5', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>{err}</p>
      )}

      {/* ── Data Preview ── */}
      {impactData && (
        <div className="no-print">
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem',
            color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem',
          }}>
            {range?.label} — Network Summary
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <StatBadge label="Active Chapters"      value={impactData.totalChapters} />
            <StatBadge label="Orgs Contacted"       value={impactData.totalOrgs} />
            <StatBadge label="Books Distributed"    value={impactData.totalBooksDistributed} />
            <StatBadge label="Distributions"        value={impactData.totalDistributions} />
            <StatBadge label="Partnerships"         value={impactData.totalPartnerships} />
          </div>

          <div style={{
            background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              Status Breakdown (Network-wide)
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: 'rgba(255,255,255,0.75)' }}>
              {impactData.statusBreakdown}
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem',
          }}>
            <div style={{ background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Top Chapter
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: 'rgba(255,255,255,0.75)' }}>
                {impactData.topChapter} ({impactData.topChapterBooks} books)
              </p>
            </div>
            <div style={{ background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Geographic Spread
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: 'rgba(255,255,255,0.75)' }}>
                {impactData.states}
              </p>
            </div>
          </div>

          {impactData.totalOrgs === 0 && impactData.totalChapters === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px', padding: '2rem', textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                No network activity for this period.
              </p>
            </div>
          ) : (
            <button
              className="pill-button orange"
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><span className="p4c-spinner-sm" />&nbsp; Generating…</>
                : '✨ Generate Report'}
            </button>
          )}
        </div>
      )}

      {/* ── Report Output ── */}
      {reportText && (
        <div>
          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              className="pill-button orange"
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }}
              onClick={() => window.print()}
            >
              ⬇ Download PDF
            </button>
            <button
              className="pill-button secondary"
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy Text'}
            </button>
          </div>

          {/* Screen preview */}
          <div className="no-print" style={{
            background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '2rem',
          }}>
            <div style={{ borderBottom: '2px solid rgba(246,170,60,0.35)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <p style={{
                fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.92rem',
                color: '#F6AA3C', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                PAGES FOR CHANGE NETWORK
              </p>
              <p style={{
                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.65)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '0.2rem',
              }}>
                {range?.label} NATIONAL IMPACT REPORT
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                Co-Executive Directors: Zayd Mulani &amp; Affan Shaik &nbsp;·&nbsp; Founding Chapter: South Brunswick, NJ
              </p>
            </div>
            <pre style={{
              fontFamily: 'var(--font-body)', fontSize: '0.88rem',
              color: 'rgba(255,255,255,0.8)', lineHeight: 1.85,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            }}>
              {reportText}
            </pre>
          </div>
        </div>
      )}

      {/* ── Print-only area ── */}
      <div className="print-area">
        <div className="report-header">
          <p className="report-title">PAGES FOR CHANGE NETWORK</p>
          <p className="report-title" style={{ fontSize: '13pt', marginTop: '0.2rem' }}>
            {range?.label ?? ''} NATIONAL IMPACT REPORT
          </p>
          <p className="report-subtitle">
            Co-Executive Directors: Zayd Mulani &amp; Affan Shaik
          </p>
          <p className="report-subtitle">Founding Chapter: South Brunswick, NJ</p>
        </div>
        <div className="report-body">{reportText}</div>
      </div>
      <div className="print-footer">Pages for Change — pagesforchange.org</div>
    </div>
  )
}
