import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

// ── Constants ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  'Not Contacted', 'Contacted', 'Meeting Scheduled', 'Interested',
  'In Progress', 'Follow-Up Needed', 'Partnership Established', 'Not Interested', 'Closed',
]
const ALL_PIPELINE_STATUSES = [
  'Not Contacted', 'Researching', 'Initial Outreach Sent', 'Follow-Up Sent',
  'Awaiting Response', 'Interested', 'Meeting Scheduled',
  'Partnership Established', 'Not Interested', 'Closed',
]
const COLLAPSED_BY_DEFAULT = new Set(['Not Interested', 'Closed'])
const PAGE_SIZE = 50

const ORG_COLS = [
  { key: 'org_name',             label: 'Organization',   w: 200 },
  { key: 'org_type',             label: 'Type',           w: 135 },
  { key: 'contact_name',         label: 'Contact',        w: 145 },
  { key: 'email',                label: 'Email',          w: 190 },
  { key: 'phone',                label: 'Phone',          w: 135 },
  { key: 'township',             label: 'Township',       w: 135 },
  { key: 'date_first_contacted', label: 'First Contacted',w: 145 },
  { key: 'current_status',       label: 'Status',         w: 185 },
  { key: 'follow_up_date',       label: 'Follow-Up',      w: 125 },
  { key: 'partnership_interest', label: 'Interest',       w: 160 },
  { key: 'notes',                label: 'Notes',          w: 200 },
  { key: 'outcome',              label: 'Outcome',        w: 145 },
]
const BOOK_COLS = [
  { key: 'title',         label: 'Title',        w: 220 },
  { key: 'author',        label: 'Author',       w: 165 },
  { key: 'genre',         label: 'Genre',        w: 140 },
  { key: 'age_range',     label: 'Age Range',    w: 110 },
  { key: 'condition',     label: 'Condition',    w: 110 },
  { key: 'quantity',      label: 'Qty',          w: 75  },
  { key: 'date_received', label: 'Date Received',w: 140 },
]

// ── Helpers ───────────────────────────────────────────────────
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

function pillBtn(active, disabled) {
  return {
    padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none',
    background: active ? '#F6AA3C' : 'rgba(255,255,255,0.07)',
    color: active ? '#1a365d' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
    fontFamily: 'var(--font-body)', fontWeight: active ? 800 : 600, fontSize: '0.82rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '1rem 0', justifyContent: 'center' }}>
      <button onClick={() => onPage(0)}              disabled={page === 0}             style={pillBtn(false, page === 0)}>«</button>
      <button onClick={() => onPage(page - 1)}       disabled={page === 0}             style={pillBtn(false, page === 0)}>‹</button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i} onClick={() => onPage(i)}    style={pillBtn(i === page, false)}>{i + 1}</button>
      ))}
      <button onClick={() => onPage(page + 1)}       disabled={page >= totalPages - 1} style={pillBtn(false, page >= totalPages - 1)}>›</button>
      <button onClick={() => onPage(totalPages - 1)} disabled={page >= totalPages - 1} style={pillBtn(false, page >= totalPages - 1)}>»</button>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────
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

// ── Read-only table helpers ───────────────────────────────────
function SortTh({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col.key
  return (
    <th
      onClick={() => onSort(col.key)}
      style={{
        padding: '0.65rem 0.75rem', textAlign: 'left',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem',
        color: active ? '#F6AA3C' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        background: '#0d233e', borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2,
        width: col.w, minWidth: col.w, userSelect: 'none',
      }}
    >
      {col.label}{active && <span style={{ marginLeft: '0.3rem' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

// ── Tracker Tab ───────────────────────────────────────────────
function TrackerTab({ chapterId }) {
  const [orgs,    setOrgs]    = useState([])
  const [count,   setCount]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [sortCol, setSortCol] = useState('row_number')
  const [sortDir, setSortDir] = useState('asc')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .eq('chapter_id', chapterId)
      .order(sortCol, { ascending: sortDir === 'asc', nullsFirst: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) q = q.or(`org_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`)
    if (status) q = q.eq('current_status', status)
    const { data, count: total } = await q
    setOrgs(data ?? [])
    setCount(total ?? 0)
    setLoading(false)
  }, [chapterId, page, search, status, sortCol, sortDir])

  useEffect(() => { load() }, [load])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(0)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          className="p4c-input" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search org, contact, email…"
          style={{ maxWidth: '260px', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
        />
        <select
          value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}
          style={{
            padding: '0.5rem 0.9rem',
            background: status ? 'rgba(246,170,60,0.1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${status ? 'rgba(246,170,60,0.3)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '8px', color: status ? '#F6AA3C' : 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || status) && (
          <button onClick={() => { setSearch(''); setStatus(''); setPage(0) }} style={{
            padding: '0.45rem 0.9rem', background: 'transparent',
            border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px',
            color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
          {count} organizations
        </span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', background: '#122847' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="p4c-spinner" /></div>
        ) : orgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>No organizations found.</p>
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>{ORG_COLS.map(col => <SortTh key={col.key} col={col} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />)}</tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => (
                <tr
                  key={org.id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                >
                  {ORG_COLS.map(col => {
                    const val = org[col.key]
                    const tdStyle = {
                      padding: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
                      width: col.w, minWidth: col.w, maxWidth: col.w, verticalAlign: 'middle',
                    }
                    const cellStyle = {
                      display: 'block', padding: '0.5rem 0.75rem',
                      fontFamily: 'var(--font-body)', fontSize: '0.825rem', color: 'rgba(255,255,255,0.8)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }
                    if (col.key === 'current_status' && val) {
                      const { bg, color } = statusStyle(val)
                      return (
                        <td key={col.key} style={tdStyle}>
                          <div style={{ padding: '0.5rem 0.75rem' }}>
                            <span style={{ background: bg, color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{val}</span>
                          </div>
                        </td>
                      )
                    }
                    return (
                      <td key={col.key} style={tdStyle}>
                        <span style={cellStyle}>{(col.key === 'date_first_contacted' || col.key === 'follow_up_date') ? fmtDate(val) : (val || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>)}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onPage={setPage} />
    </div>
  )
}

// ── Inventory Tab ─────────────────────────────────────────────
function InventoryTab({ chapterId }) {
  const [books,   setBooks]   = useState([])
  const [count,   setCount]   = useState(0)
  const [totals,  setTotals]  = useState({ total: 0, byGenre: {} })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const [search,  setSearch]  = useState('')
  const [sortCol, setSortCol] = useState('row_number')
  const [sortDir, setSortDir] = useState('asc')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('books')
      .select('*', { count: 'exact' })
      .eq('chapter_id', chapterId)
      .order(sortCol, { ascending: sortDir === 'asc', nullsFirst: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
    const { data, count: total } = await q
    setBooks(data ?? [])
    setCount(total ?? 0)

    const { data: all } = await supabase.from('books').select('genre, quantity').eq('chapter_id', chapterId)
    if (all) {
      const grandTotal = all.reduce((s, b) => s + (b.quantity ?? 0), 0)
      const byGenre = {}
      all.forEach(b => { if (b.genre) byGenre[b.genre] = (byGenre[b.genre] ?? 0) + (b.quantity ?? 0) })
      setTotals({ total: grandTotal, byGenre })
    }
    setLoading(false)
  }, [chapterId, page, search, sortCol, sortDir])

  useEffect(() => { load() }, [load])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(0)
  }

  const sorted   = Object.entries(totals.byGenre).sort((a, b) => b[1] - a[1])
  const top3     = sorted.slice(0, 3)
  const otherQty = sorted.slice(3).reduce((s, [, q]) => s + q, 0)

  return (
    <div>
      {/* Totals bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center',
        background: '#122847', borderRadius: '10px', padding: '0.75rem 1.25rem',
        marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.4rem', color: '#F6AA3C', lineHeight: 1 }}>{totals.total.toLocaleString()}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total in Stock</span>
        </div>
        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />
        {top3.map(([genre, qty]) => (
          <div key={genre} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', color: 'white', lineHeight: 1 }}>{qty}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{genre}</span>
          </div>
        ))}
        {otherQty > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', color: 'white', lineHeight: 1 }}>{otherQty}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Other</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          className="p4c-input" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search title or author…"
          style={{ maxWidth: '240px', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(0) }} style={{
            padding: '0.45rem 0.9rem', background: 'transparent',
            border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px',
            color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{count} books</span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', background: '#122847' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="p4c-spinner" /></div>
        ) : books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>No books found.</p>
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>{BOOK_COLS.map(col => <SortTh key={col.key} col={col} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />)}</tr>
            </thead>
            <tbody>
              {books.map((book, i) => (
                <tr
                  key={book.id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                >
                  {BOOK_COLS.map(col => {
                    const val = book[col.key]
                    const tdStyle = {
                      padding: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
                      width: col.w, minWidth: col.w, maxWidth: col.w, verticalAlign: 'middle',
                    }
                    const cellStyle = {
                      display: 'block', padding: '0.5rem 0.75rem',
                      fontFamily: 'var(--font-body)', fontSize: '0.825rem', color: 'rgba(255,255,255,0.8)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }
                    if (col.key === 'condition' && val) {
                      const { bg, color } = conditionStyle(val)
                      return (
                        <td key={col.key} style={tdStyle}>
                          <div style={{ padding: '0.5rem 0.75rem' }}>
                            <span style={{ background: bg, color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{val}</span>
                          </div>
                        </td>
                      )
                    }
                    return (
                      <td key={col.key} style={tdStyle}>
                        <span style={cellStyle}>{col.key === 'date_received' ? fmtDate(val) : (val ?? <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>)}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onPage={setPage} />
    </div>
  )
}

// ── Pipeline Tab (read-only kanban) ───────────────────────────
function PipelineTab({ chapterId }) {
  const [orgs,      setOrgs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState(() => {
    const init = {}
    COLLAPSED_BY_DEFAULT.forEach(s => { init[s] = true })
    return init
  })

  useEffect(() => {
    supabase
      .from('organizations')
      .select('id, org_name, org_type, contact_name, current_status, updated_at')
      .eq('chapter_id', chapterId)
      .order('updated_at', { ascending: false })
      .then(({ data }) => { setOrgs(data ?? []); setLoading(false) })
  }, [chapterId])

  const byStatus = {}
  ALL_PIPELINE_STATUSES.forEach(s => { byStatus[s] = [] })
  orgs.forEach(org => {
    const s = org.current_status ?? 'Not Contacted'
    if (byStatus[s]) byStatus[s].push(org)
    else byStatus['Not Contacted'].push(org)
  })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="p4c-spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
          {orgs.length} organizations
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {Array.from(COLLAPSED_BY_DEFAULT).map(s => (
            <button key={s} onClick={() => setCollapsed(prev => ({ ...prev, [s]: !prev[s] }))} style={{
              padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)',
              fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}>
              {collapsed[s] ? '▸' : '▾'} {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1.5rem', alignItems: 'flex-start' }}>
        {ALL_PIPELINE_STATUSES.map(status => {
          const isEstablished = status === 'Partnership Established'
          const isClosed      = COLLAPSED_BY_DEFAULT.has(status)
          const col           = byStatus[status] ?? []
          const isCollapsed   = collapsed[status]

          return (
            <div key={status} style={{ minWidth: '220px', maxWidth: '220px', flexShrink: 0 }}>
              <div
                onClick={isClosed ? () => setCollapsed(prev => ({ ...prev, [status]: !prev[status] })) : undefined}
                style={{
                  background: isEstablished ? 'linear-gradient(135deg, #14532d, #166534)' : isClosed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
                  borderRadius: isCollapsed ? '10px' : '10px 10px 0 0',
                  padding: '0.6rem 0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: isClosed ? 'pointer' : 'default',
                  border: `1px solid ${isEstablished ? 'rgba(134,239,172,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  borderBottom: isCollapsed ? undefined : 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.75rem', color: isEstablished ? '#86efac' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {status}
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.82rem', color: isEstablished ? '#86efac' : 'rgba(255,255,255,0.5)', flexShrink: 0, marginLeft: '0.4rem' }}>
                  {col.length}{isClosed && <span style={{ marginLeft: '0.35rem', opacity: 0.6 }}>{isCollapsed ? '▸' : '▾'}</span>}
                </span>
              </div>

              {!isCollapsed && (
                <div style={{
                  minHeight: '80px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 0 10px 10px',
                  padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                }}>
                  {col.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', minHeight: '60px',
                      color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
                    }}>Empty</div>
                  ) : col.map(org => (
                    <div key={org.id} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderLeft: isEstablished ? '3px solid #86efac' : '3px solid transparent',
                      borderRadius: '10px', padding: '0.65rem 0.85rem',
                    }}>
                      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem', color: 'white', margin: 0, lineHeight: 1.3 }}>{org.org_name}</p>
                      {org.org_type && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', marginTop: '0.3rem',
                          background: 'rgba(246,170,60,0.15)', color: '#F6AA3C',
                          fontFamily: 'var(--font-heading)', fontWeight: 700,
                          fontSize: '0.58rem', padding: '0.1rem 0.45rem',
                          transform: 'skewX(-15deg)', letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>
                          <span style={{ transform: 'skewX(15deg)' }}>{org.org_type}</span>
                        </span>
                      )}
                      {org.contact_name && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '0.25rem 0 0' }}>{org.contact_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Team Stats Tab ────────────────────────────────────────────
function TeamStatsTab({ chapterId }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('organizations').select('current_status').eq('chapter_id', chapterId),
      supabase.from('books').select('condition, quantity, genre').eq('chapter_id', chapterId),
      supabase
        .from('distributions')
        .select('quantity, distribution_date, organizations(org_name)')
        .eq('chapter_id', chapterId)
        .order('distribution_date', { ascending: false })
        .limit(25),
    ]).then(([orgsRes, booksRes, distsRes]) => {
      setStats({ orgs: orgsRes.data ?? [], books: booksRes.data ?? [], dists: distsRes.data ?? [] })
      setLoading(false)
    })
  }, [chapterId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="p4c-spinner" /></div>

  const statusCounts = {}
  stats.orgs.forEach(o => {
    const s = o.current_status ?? 'Unknown'
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
        {/* Outreach pipeline */}
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

        {/* Books by condition */}
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

      {/* Recent distributions */}
      {stats.dists.length > 0 && (
        <div style={{ background: '#122847', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Recent Distributions</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats.dists.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', width: '90px', flexShrink: 0 }}>{fmtDate(d.distribution_date)}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.organizations?.org_name ?? '—'}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: '#F6AA3C', whiteSpace: 'nowrap' }}>{d.quantity} books</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
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
      {/* Chapter header */}
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

      {tab === 'Tracker'    && <TrackerTab    chapterId={chapterId} />}
      {tab === 'Inventory'  && <InventoryTab  chapterId={chapterId} />}
      {tab === 'Pipeline'   && <PipelineTab   chapterId={chapterId} />}
      {tab === 'Team Stats' && <TeamStatsTab  chapterId={chapterId} />}
    </div>
  )
}
