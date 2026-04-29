import { useState } from 'react'
import { useChapters } from '../../hooks/useChapters.js'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(d) {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

// ── Status Badge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span style={{
      background: active ? '#14532d' : '#450a0a',
      color: active ? '#86efac' : '#fca5a5',
      padding: '0.2rem 0.6rem', borderRadius: '4px',
      fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-body)',
    }}>
      {active ? 'Active' : 'Suspended'}
    </span>
  )
}

// ── Expanded Chapter Row ───────────────────────────────────────
function ChapterDetail({ chapter, onSuspend, onReactivate }) {
  const [confirming, setConfirming] = useState(false)
  const [working,    setWorking]    = useState(false)

  async function doSuspend() {
    setWorking(true)
    await onSuspend(chapter.id)
    setWorking(false)
    setConfirming(false)
  }

  async function doReactivate() {
    setWorking(true)
    await onReactivate(chapter.id)
    setWorking(false)
  }

  return (
    <div style={{
      background: '#0a1c33', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px', padding: '1.25rem', margin: '0.5rem 0 0.75rem',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem',
    }}>
      {[
        ['Organizations Contacted', chapter.orgCount],
        ['Books in Inventory',       chapter.bookCount],
        ['Distributions Made',       chapter.distCount],
        ['Partnerships Established', chapter.partnerships],
        ['Chapter Lead',             chapter.leadName],
        ['Last Activity',            chapter.lastActivity ? `${daysSince(chapter.lastActivity)}d ago` : 'No activity'],
      ].map(([label, val]) => (
        <div key={label}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', color: 'white' }}>{val}</p>
        </div>
      ))}

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
        {chapter.status === 'active' ? (
          confirming ? (
            <>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#fca5a5', alignSelf: 'center' }}>Suspend this chapter?</span>
              <button
                onClick={doSuspend}
                disabled={working}
                style={{ padding: '0.4rem 0.9rem', background: '#450a0a', border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px', color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {working ? <span className="p4c-spinner-sm" /> : 'Confirm Suspend'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{ padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{ padding: '0.4rem 0.9rem', background: 'rgba(252,165,165,0.08)', border: '1px solid rgba(252,165,165,0.2)', borderRadius: '8px', color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Suspend Chapter
            </button>
          )
        ) : (
          <button
            onClick={doReactivate}
            disabled={working}
            style={{ padding: '0.4rem 0.9rem', background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '8px', color: '#86efac', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {working ? <span className="p4c-spinner-sm" /> : 'Reactivate Chapter'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Chapters ──────────────────────────────────────────────
export default function Chapters() {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded,     setExpanded]     = useState(null)

  const { chapters, loading, suspendChapter, reactivateChapter } = useChapters({ search, statusFilter })

  function toggleExpand(id) {
    setExpanded(prev => prev === id ? null : id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="p4c-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search chapter or school…"
          style={{ maxWidth: '260px', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
        />
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '0.5rem 0.9rem',
            background: statusFilter ? 'rgba(246,170,60,0.1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${statusFilter ? 'rgba(246,170,60,0.3)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '8px', color: statusFilter ? '#F6AA3C' : 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('') }} style={{
            padding: '0.45rem 0.9rem', background: 'transparent',
            border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px',
            color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#122847', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="p4c-spinner" /></div>
        ) : chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏫</div>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>No chapters found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '720px' }}>
              <thead>
                <tr>
                  {['Chapter Name', 'School', 'Location', 'Status', 'Lead', 'Books Dist.', 'Partners', 'Last Activity', 'Founded'].map(h => (
                    <th key={h} style={{
                      padding: '0.65rem 0.9rem', textAlign: 'left',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.68rem',
                      color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: '#0d233e', borderBottom: '1px solid rgba(255,255,255,0.08)',
                      position: 'sticky', top: 0, zIndex: 2, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter, i) => (
                  <>
                    <tr
                      key={chapter.id}
                      onClick={() => toggleExpand(chapter.id)}
                      style={{
                        cursor: 'pointer',
                        background: expanded === chapter.id
                          ? 'rgba(246,170,60,0.06)'
                          : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        borderLeft: expanded === chapter.id ? '3px solid #F6AA3C' : '3px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => { if (expanded !== chapter.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = expanded === chapter.id ? 'rgba(246,170,60,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                    >
                      {[
                        <td key="name" style={{ padding: '0.7rem 0.9rem' }}>
                          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'white', margin: 0 }}>{chapter.name}</p>
                        </td>,
                        <td key="school" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapter.school}</td>,
                        <td key="loc" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{chapter.city}, {chapter.state}</td>,
                        <td key="status" style={{ padding: '0.7rem 0.9rem' }}><StatusBadge status={chapter.status} /></td>,
                        <td key="lead" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{chapter.leadName}</td>,
                        <td key="books" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: '#F6AA3C' }}>{chapter.booksDistributed}</td>,
                        <td key="partners" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>{chapter.partnerships}</td>,
                        <td key="act" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: chapter.lastActivity ? (daysSince(chapter.lastActivity) > 14 ? '#fb923c' : 'rgba(255,255,255,0.55)') : '#f87171', whiteSpace: 'nowrap' }}>
                          {chapter.lastActivity ? `${daysSince(chapter.lastActivity)}d ago` : 'No activity'}
                        </td>,
                        <td key="founded" style={{ padding: '0.7rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{fmtDate(chapter.founded_date)}</td>,
                      ]}
                    </tr>
                    {expanded === chapter.id && (
                      <tr key={`${chapter.id}-detail`}>
                        <td colSpan={9} style={{ padding: '0 0.9rem', background: 'rgba(0,0,0,0.2)' }}>
                          <ChapterDetail
                            chapter={chapter}
                            onSuspend={suspendChapter}
                            onReactivate={reactivateChapter}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
