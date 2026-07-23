import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

import TrackerTable from '../../components/shared/TrackerTable.jsx'
import InventoryTable from '../../components/shared/InventoryTable.jsx'
import PipelineBoard from '../../components/shared/PipelineBoard.jsx'

// ── Helpers for Team Stats ────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return d.slice(0, 10)
}

function statusStyle(status) {
  const s = (status ?? '').toLowerCase()
  if (s === 'partnership established')                      return { bg: '#14532d', color: '#86efac' }
  if (s === 'interested' || s === 'meeting scheduled')      return { bg: '#134e4a', color: '#5eead4' }
  if (s === 'not interested' || s === 'closed')             return { bg: '#450a0a', color: '#fca5a5' }
  return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }
}

function conditionStyle(condition) {
  const map = {
    New:  { bg: '#14532d', color: '#86efac' },
    Good: { bg: '#134e4a', color: '#5eead4' },
    Fair: { bg: '#78350f', color: '#fcd34d' },
    Poor: { bg: '#450a0a', color: '#fca5a5' },
  }
  return map[condition] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }
}

function parseDistNotes(notes) {
  if (!notes) return { text: '', items: [] }
  try {
    const p = JSON.parse(notes)
    if (p._v === 2 && Array.isArray(p.items)) {
      return { text: p.text || '', items: p.items }
    }
  } catch (e) {
    // legacy
  }
  return { text: notes, items: [] }
}

const TABS = ['Tracker', 'Inventory', 'Pipeline', 'Team Stats']

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'transparent', border: 'none',
            borderBottom: active === t ? '2px solid #F6AA3C' : '2px solid transparent',
            color: active === t ? '#F6AA3C' : 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--font-body)', fontWeight: active === t ? 700 : 600,
            fontSize: '0.875rem', cursor: 'pointer', marginBottom: '-1px',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function TeamStatsTab({ chapterId }) {
  const [stats, setStats] = useState({ orgs: [], books: [], dists: [] })
  const [loading, setLoading] = useState(true)
  const [expandedDist, setExpandedDist] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('organizations').select('current_status').eq('chapter_id', chapterId),
      supabase.from('books').select('quantity, condition').eq('chapter_id', chapterId),
      supabase.from('distributions').select('id, quantity, distribution_date, notes, organizations(org_name)').eq('chapter_id', chapterId).order('distribution_date', { ascending: false }).limit(20)
    ]).then(([orgsRes, booksRes, distsRes]) => {
      setStats({
        orgs: orgsRes.data ?? [],
        books: booksRes.data ?? [],
        dists: distsRes.data ?? [],
      })
      setLoading(false)
    })
  }, [chapterId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="p4c-spinner" /></div>

  const statusCounts = {}
  stats.orgs.forEach(o => {
    const s = o.current_status ?? 'Not Contacted'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  })

  const conditionCounts = {}
  let totalBooks = 0
  stats.books.forEach(b => {
    const qty = b.quantity ?? 0
    conditionCounts[b.condition ?? 'Unknown'] = (conditionCounts[b.condition ?? 'Unknown'] ?? 0) + qty
    totalBooks += qty
  })

  const totalDisted = stats.dists.reduce((s, d) => s + (d.quantity ?? 0), 0)

  const summaryCards = [
    { label: 'Organizations Tracked',    value: stats.orgs.length },
    { label: 'Books in Stock',           value: totalBooks.toLocaleString() },
    { label: 'Partnerships Established', value: statusCounts['Partnership Established'] ?? 0 },
    { label: 'Books Distributed',        value: totalDisted },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {summaryCards.map(({ label, value }) => (
          <div key={label} style={{ background: '#122847', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.75rem', color: '#F6AA3C', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#122847', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Outreach Pipeline</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([s, c]) => {
              const { bg, color } = statusStyle(s)
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ background: bg, color, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', flex: 1 }}>{s}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: 'white', flexShrink: 0 }}>{c}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: '#122847', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Books by Condition</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {Object.entries(conditionCounts).sort((a, b) => b[1] - a[1]).map(([cond, qty]) => {
              const { bg, color } = conditionStyle(cond)
              return (
                <div key={cond} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ background: bg, color, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, flex: 1 }}>{cond}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: 'white', flexShrink: 0 }}>{qty} books</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {stats.dists.length > 0 && (
        <div style={{ background: '#122847', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Recent Distributions</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats.dists.map((d, i) => {
              const { text: noteText, items: distItems } = parseDistNotes(d.notes)
              const key        = d.id ?? i
              const isExpanded = expandedDist === key
              const expandable = distItems.length > 0
              return (
                <div key={key}>
                  <div
                    onClick={() => expandable && setExpandedDist(isExpanded ? null : key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '0.6rem 0',
                      borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      cursor: expandable ? 'pointer' : 'default',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', width: '90px', flexShrink: 0 }}>{fmtDate(d.distribution_date)}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.organizations?.org_name ?? '—'}</span>
                    {expandable && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{isExpanded ? '▾' : '▸'}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: '#F6AA3C', whiteSpace: 'nowrap' }}>{d.quantity} books</span>
                  </div>
                  {isExpanded && (
                    <div style={{ paddingLeft: '106px', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {distItems.map((item, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.2rem 0' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                            {item.title}{item.author ? ` — ${item.author}` : ''}
                          </span>
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.82rem', color: '#F6AA3C', flexShrink: 0 }}>×{item.quantity}</span>
                        </div>
                      ))}
                      {noteText && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.4rem', fontStyle: 'italic' }}>{noteText}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChapterDetail() {
  const { chapterId } = useParams()
  const navigate      = useNavigate()
  const [tab,            setTab]            = useState('Tracker')
  const [chapter,        setChapter]        = useState(null)
  const [chapterLoading, setChapterLoading] = useState(true)

  useEffect(() => {
    supabase.from('chapters').select('*').eq('id', chapterId).single()
      .then(({ data }) => { setChapter(data); setChapterLoading(false) })
  }, [chapterId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/admin/chapters')}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-body)',
            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', padding: '0.4rem 0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}
        >
          ← All Chapters
        </button>

        {chapterLoading ? (
          <div className="p4c-spinner-sm" />
        ) : chapter ? (
          <>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.3rem', color: 'white', margin: 0 }}>{chapter.name}</h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                {chapter.school} · {chapter.city}, {chapter.state}
              </p>
            </div>
            <span style={{
              marginLeft: 'auto', flexShrink: 0,
              background: chapter.status === 'active' ? '#14532d' : '#450a0a',
              color:      chapter.status === 'active' ? '#86efac' : '#fca5a5',
              padding: '0.2rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-body)',
            }}>
              {chapter.status === 'active' ? 'Active' : 'Suspended'}
            </span>
          </>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>Chapter not found.</p>
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'Tracker'    && <TrackerTable   chapterId={chapterId} />}
      {tab === 'Inventory'  && <InventoryTable chapterId={chapterId} />}
      {tab === 'Pipeline'   && <PipelineBoard  chapterId={chapterId} />}
      {tab === 'Team Stats' && <TeamStatsTab   chapterId={chapterId} />}
    </div>
  )
}
