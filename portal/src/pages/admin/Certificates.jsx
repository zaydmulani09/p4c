import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { generateImpactCertificate } from '../../lib/groq.js'
import '../../print.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

async function fetchLeads() {
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, chapter_id')
    .eq('role', 'chapter_lead')
    .order('full_name')

  if (!users?.length) return []

  const chapterIds = [...new Set(users.map(u => u.chapter_id).filter(Boolean))]
  if (!chapterIds.length) return users.map(u => ({ ...u, chapterName: 'Unknown Chapter' }))

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name')
    .in('id', chapterIds)

  const chapMap = {}
  chapters?.forEach(c => { chapMap[c.id] = c.name })

  return users.map(u => ({
    ...u,
    chapterName: chapMap[u.chapter_id] ?? 'Unknown Chapter',
  }))
}

async function fetchLeadYearStats(chapterId, year) {
  const start = `${year}-01-01T00:00:00.000Z`
  const end   = `${year}-12-31T23:59:59.999Z`

  const [orgsRes, distsRes, chaptersRes] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, current_status')
      .eq('chapter_id', chapterId)
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('distributions')
      .select('quantity, org_id')
      .eq('chapter_id', chapterId)
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('chapters')
      .select('id, state')
      .eq('status', 'active'),
  ])

  const orgs     = orgsRes.data     ?? []
  const dists    = distsRes.data    ?? []
  const chapters = chaptersRes.data ?? []

  const partnerships     = orgs.filter(o => o.current_status === 'Partnership Established').length
  const booksDistributed = dists.reduce((s, d) => s + (d.quantity ?? 0), 0)
  const partnerOrgs      = new Set(dists.map(d => d.org_id).filter(Boolean)).size
  const networkChapters  = chapters.length
  const networkStates    = new Set(chapters.map(c => c.state).filter(Boolean)).size

  return {
    orgsContacted: orgs.length,
    partnerships,
    booksDistributed,
    partnerOrgs,
    networkChapters,
    networkStates,
  }
}

export default function Certificates() {
  const [leads,        setLeads]        = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [year,         setYear]         = useState(CURRENT_YEAR)
  const [certText,     setCertText]     = useState('')
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [generating,   setGenerating]   = useState(false)
  const [err,          setErr]          = useState('')

  useEffect(() => {
    fetchLeads()
      .then(data => { setLeads(data); setLeadsLoading(false) })
      .catch(() => setLeadsLoading(false))
  }, [])

  async function handleGenerate() {
    if (!selectedLead) return
    setGenerating(true)
    setCertText('')
    setErr('')
    try {
      const stats = await fetchLeadYearStats(selectedLead.chapter_id, year)
      const text = await generateImpactCertificate({
        leadId:          selectedLead.id,
        leadName:        selectedLead.full_name,
        chapterName:     selectedLead.chapterName,
        year,
        ...stats,
      })
      setCertText(text)
    } catch (e) {
      console.error(e)
      setErr('Failed to generate certificate. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const displayName  = selectedLead?.full_name    ?? ''
  const displayChap  = selectedLead?.chapterName  ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Header ── */}
      <div className="no-print">
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 900,
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'white',
          letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.35rem',
        }}>
          Certificate Generator
        </h1>
        <p style={{ fontFamily: 'var(--font-accent-serif)', fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>
          Year-end certificates for chapter leads
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="no-print" style={{
        background: '#0d233e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '1.5rem',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
      }}>
        {/* Lead selector */}
        <div>
          <label style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em',
            display: 'block', marginBottom: '0.6rem',
          }}>
            Chapter Lead
          </label>
          {leadsLoading ? (
            <div className="p4c-spinner" style={{ width: 22, height: 22 }} />
          ) : (
            <select
              className="p4c-input"
              value={selectedLead?.id ?? ''}
              onChange={e => {
                const lead = leads.find(l => l.id === e.target.value) ?? null
                setSelectedLead(lead)
                setCertText('')
              }}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select a chapter lead…</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.full_name} — {l.chapterName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Year selector */}
        <div>
          <label style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em',
            display: 'block', marginBottom: '0.6rem',
          }}>
            Year
          </label>
          <select
            className="p4c-input"
            value={year}
            onChange={e => { setYear(Number(e.target.value)); setCertText('') }}
            style={{ cursor: 'pointer' }}
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <button
            className="pill-button orange"
            style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }}
            onClick={handleGenerate}
            disabled={generating || !selectedLead}
          >
            {generating
              ? <><span className="p4c-spinner-sm" />&nbsp; Generating…</>
              : '✨ Generate Certificate'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {err && (
        <p style={{ color: '#fca5a5', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>{err}</p>
      )}

      {/* ── Empty state if no leads ── */}
      {!leadsLoading && leads.length === 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', padding: '2.5rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>
            No chapter leads found. Approve chapter applications to add leads.
          </p>
        </div>
      )}

      {/* ── Certificate Output ── */}
      {certText && (
        <div>
          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              className="pill-button orange"
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }}
              onClick={() => window.print()}
            >
              ⬇ Download PDF
            </button>
          </div>

          {/* Screen preview */}
          <div className="no-print" style={{
            background: '#0d233e', border: '2px solid rgba(26,54,93,0.7)',
            borderRadius: '12px', padding: '2.5rem',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem',
              color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase',
              marginBottom: '0.2rem',
            }}>
              Pages for Change Network
            </p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: '1.5rem',
            }}>
              pagesforchange.org
            </p>

            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              padding: '0.75rem 0', marginBottom: '1.75rem',
            }}>
              <p style={{
                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem',
                color: '#F6AA3C', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Chapter Leadership Certificate
              </p>
            </div>

            <pre style={{
              fontFamily: 'var(--font-body)', fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.8)', lineHeight: 1.9,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              textAlign: 'left', maxWidth: '480px', margin: '0 auto 2.5rem',
            }}>
              {certText}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1rem', gap: '2rem' }}>
              {[['Zayd Mulani', 'Co-Executive Director'], ['Affan Shaik', 'Co-Executive Director']].map(([name, title]) => (
                <div key={name} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: '0.5rem' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>{name}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{title}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Pages for Change</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Print-only certificate ── */}
      <div className="print-area">
        <div className="certificate-border">
          <p className="certificate-logo-area">Pages for Change Network</p>
          <p className="certificate-org">pagesforchange.org</p>
          <p className="certificate-heading">Chapter Leadership Certificate</p>
          <div className="certificate-body">{certText}</div>
          <div className="certificate-sigs">
            <div className="certificate-sig">
              <p style={{ fontWeight: 'bold' }}>Zayd Mulani</p>
              <p>Co-Executive Director</p>
              <p>Pages for Change</p>
            </div>
            <div className="certificate-sig">
              <p style={{ fontWeight: 'bold' }}>Affan Shaik</p>
              <p>Co-Executive Director</p>
              <p>Pages for Change</p>
            </div>
          </div>
        </div>
      </div>
      <div className="print-footer">Pages for Change — pagesforchange.org</div>
    </div>
  )
}
