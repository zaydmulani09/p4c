import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'

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

const ORG_TYPE_OPTIONS = ['Library', 'School', 'Community Center', 'Church/Religious', 'Hospital', 'Non-Profit', 'Business', 'Government', 'Other']
const CONTACT_METHODS  = ['Email', 'Phone', 'In Person', 'Social Media', 'Mail', 'Other']
const GENRE_OPTIONS    = ['Fiction', 'Nonfiction', 'Picture Book', 'Early Reader', 'Middle Grade', 'Young Adult', 'Reference', 'Educational', 'Other']
const AGE_OPTIONS      = ['0-3', '4-6', '7-9', '10-12', '13+', 'All Ages']
const CONDITION_OPTIONS = ['New', 'Good', 'Fair', 'Poor']

const ORG_COLS = [
  { key: 'org_name',             label: 'Organization',    type: 'text',   w: 200, editable: true  },
  { key: 'org_type',             label: 'Type',            type: 'select', w: 135, editable: true,  options: ORG_TYPE_OPTIONS },
  { key: 'contact_name',         label: 'Contact',         type: 'text',   w: 145, editable: true  },
  { key: 'email',                label: 'Email',           type: 'email',  w: 190, editable: true  },
  { key: 'phone',                label: 'Phone',           type: 'text',   w: 135, editable: true  },
  { key: 'township',             label: 'Township',        type: 'text',   w: 135, editable: true  },
  { key: 'date_first_contacted', label: 'First Contacted', type: 'date',   w: 145, editable: true  },
  { key: 'current_status',       label: 'Status',          type: 'select', w: 185, editable: true,  options: STATUS_OPTIONS },
  { key: 'follow_up_date',       label: 'Follow-Up',       type: 'date',   w: 125, editable: true  },
  { key: 'partnership_interest', label: 'Interest',        type: 'text',   w: 160, editable: true  },
  { key: 'notes',                label: 'Notes',           type: 'text',   w: 200, editable: true  },
  { key: 'outcome',              label: 'Outcome',         type: 'text',   w: 145, editable: true  },
]
const BOOK_COLS = [
  { key: 'title',         label: 'Title',         type: 'text',   w: 220, editable: true },
  { key: 'author',        label: 'Author',        type: 'text',   w: 165, editable: true },
  { key: 'genre',         label: 'Genre',         type: 'select', w: 140, editable: true, options: GENRE_OPTIONS },
  { key: 'age_range',     label: 'Age Range',     type: 'select', w: 110, editable: true, options: AGE_OPTIONS },
  { key: 'condition',     label: 'Condition',     type: 'select', w: 110, editable: true, options: CONDITION_OPTIONS },
  { key: 'quantity',      label: 'Qty',           type: 'number', w: 75,  editable: true },
  { key: 'date_received', label: 'Date Received', type: 'date',   w: 140, editable: true },
]

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return d.slice(0, 10)
}

function fmt(val, type) {
  if (val == null || val === '') return ''
  if (type === 'date') return String(val).slice(0, 10)
  return String(val)
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

// ── Sortable column header ─────────────────────────────────────
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

// ── Inline editable cell ──────────────────────────────────────
function EditCell({ row, col, editCell, editValue, onStartEdit, onEditChange, onCommit, onCancel }) {
  const isEditing = editCell?.rowId === row.id && editCell?.col === col.key
  const inputRef  = useRef(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); onCommit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  const tdStyle = {
    padding: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
    width: col.w, minWidth: col.w, maxWidth: col.w, verticalAlign: 'middle',
  }
  const cellStyle = {
    display: 'block', padding: '0.5rem 0.75rem',
    fontFamily: 'var(--font-body)', fontSize: '0.825rem', color: 'rgba(255,255,255,0.8)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    cursor: col.editable ? 'pointer' : 'default', minHeight: '36px', lineHeight: '1.4',
  }
  const inputStyle = {
    width: '100%', padding: '0.45rem 0.75rem',
    background: '#122847', border: '2px solid #F6AA3C', borderRadius: 0,
    color: 'white', fontFamily: 'var(--font-body)', fontSize: '0.825rem', outline: 'none',
  }

  if (isEditing) {
    if (col.type === 'select') {
      return (
        <td style={tdStyle}>
          <select ref={inputRef} style={{ ...inputStyle, cursor: 'pointer' }} value={editValue}
            onChange={e => onEditChange(e.target.value)} onBlur={onCommit} onKeyDown={handleKeyDown}>
            <option value="">—</option>
            {col.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>
      )
    }
    return (
      <td style={tdStyle}>
        <input ref={inputRef}
          type={col.type === 'email' ? 'email' : col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
          min={col.type === 'number' ? 0 : undefined}
          style={inputStyle} value={editValue}
          onChange={e => onEditChange(e.target.value)} onBlur={onCommit} onKeyDown={handleKeyDown}
        />
      </td>
    )
  }

  const val = row[col.key]

  if (col.key === 'current_status' && val) {
    const { bg, color } = statusStyle(val)
    return (
      <td style={tdStyle} onClick={() => col.editable && onStartEdit(row.id, col.key, val ?? '')}>
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <span style={{ background: bg, color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{val}</span>
        </div>
      </td>
    )
  }

  if (col.key === 'condition' && val) {
    const { bg, color } = conditionStyle(val)
    return (
      <td style={tdStyle} onClick={() => col.editable && onStartEdit(row.id, col.key, val ?? '')}>
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <span style={{ background: bg, color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{val}</span>
        </div>
      </td>
    )
  }

  return (
    <td style={tdStyle} onClick={() => col.editable && onStartEdit(row.id, col.key, fmt(val, col.type))}>
      <span style={cellStyle}>
        {(col.key === 'date_first_contacted' || col.key === 'follow_up_date' || col.key === 'date_received')
          ? fmtDate(val)
          : (fmt(val, col.type) || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>)}
      </span>
    </td>
  )
}

// ── Add Org Panel ─────────────────────────────────────────────
const EMPTY_ORG = {
  org_name: '', org_type: '', website: '', contact_name: '', contact_title: '',
  email: '', phone: '', township: '', current_status: 'Not Contacted',
  follow_up_date: '', partnership_interest: '', notes: '', outcome: '',
}

function AddOrgPanel({ open, onClose, onAdd }) {
  const [form,   setForm]   = useState(EMPTY_ORG)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.org_name.trim()) { setErr('Organization name is required.'); return }
    setSaving(true)
    const payload = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.org_name = form.org_name.trim()
    const { error } = await onAdd(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    setForm(EMPTY_ORG); setErr(''); setSaving(false); onClose()
  }

  function lbl(text, req) {
    return <label className="p4c-label" style={{ fontSize: '0.72rem' }}>{text}{req && <span style={{ color: '#F6AA3C' }}> *</span>}</label>
  }

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={onClose} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(480px, 100vw)',
        background: '#0d233e', borderLeft: '1px solid rgba(255,255,255,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.77,0,0.175,1)',
        zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Add Organization</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <div>{lbl('Organization Name', true)}<input className="p4c-input" value={form.org_name} onChange={e => set('org_name', e.target.value)} placeholder="Org name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>{lbl('Org Type')}<select className="p4c-input" value={form.org_type} onChange={e => set('org_type', e.target.value)} style={{ cursor: 'pointer' }}><option value="">Select…</option>{ORG_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div>{lbl('Status')}<select className="p4c-input" value={form.current_status} onChange={e => set('current_status', e.target.value)} style={{ cursor: 'pointer' }}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div>{lbl('Contact Name')}<input className="p4c-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
            <div>{lbl('Position/Title')}<input className="p4c-input" value={form.contact_title} onChange={e => set('contact_title', e.target.value)} /></div>
            <div>{lbl('Email')}<input className="p4c-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div>{lbl('Phone')}<input className="p4c-input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div>{lbl('Township')}<input className="p4c-input" value={form.township} onChange={e => set('township', e.target.value)} /></div>
            <div>{lbl('Follow-Up Date')}<input className="p4c-input" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} /></div>
          </div>
          <div>{lbl('Website')}<input className="p4c-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" /></div>
          <div>{lbl('Partnership Interest')}<input className="p4c-input" value={form.partnership_interest} onChange={e => set('partnership_interest', e.target.value)} /></div>
          <div>{lbl('Notes')}<textarea className="p4c-input" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: '70px' }} /></div>
          <div>{lbl('Outcome')}<input className="p4c-input" value={form.outcome} onChange={e => set('outcome', e.target.value)} /></div>
          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving}>{saving ? <span className="p4c-spinner-sm" /> : 'Save Organization'}</button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Tracker Tab ───────────────────────────────────────────────
function TrackerTab({ chapterId }) {
  const { user } = useAuth()
  const [orgs,      setOrgs]      = useState([])
  const [count,     setCount]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(0)
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('')
  const [sortCol,   setSortCol]   = useState('row_number')
  const [sortDir,   setSortDir]   = useState('asc')
  const [editCell,  setEditCell]  = useState(null)
  const [editValue, setEditValue] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

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

  function startEdit(rowId, col, value) { setEditCell({ rowId, col }); setEditValue(value ?? '') }

  async function commitEdit() {
    if (!editCell) return
    const { rowId, col } = editCell
    setEditCell(null)
    const colDef = ORG_COLS.find(c => c.key === col)
    const val = colDef?.type === 'number' ? (editValue === '' ? null : Number(editValue)) : (editValue || null)
    const { data } = await supabase.from('organizations').update({ [col]: val }).eq('id', rowId).select().single()
    if (data) setOrgs(prev => prev.map(o => o.id === rowId ? data : o))
  }

  function cancelEdit() { setEditCell(null); setEditValue('') }

  async function addOrg(fields) {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ ...fields, chapter_id: chapterId, logged_by: user?.id })
      .select().single()
    if (!error && data) { setOrgs(prev => [data, ...prev]); setCount(prev => prev + 1) }
    return { data, error }
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
        <button
          className="pill-button orange"
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem', flexShrink: 0 }}
          onClick={() => setPanelOpen(true)}
        >
          + Add Organization
        </button>
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
                  className="p4c-item-in"
                  style={{ animationDelay: `${Math.min(i, 15) * 0.03}s`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                >
                  {ORG_COLS.map(col => (
                    <EditCell
                      key={col.key} row={org} col={col}
                      editCell={editCell} editValue={editValue}
                      onStartEdit={startEdit} onEditChange={setEditValue}
                      onCommit={commitEdit} onCancel={cancelEdit}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onPage={setPage} />
      <AddOrgPanel open={panelOpen} onClose={() => setPanelOpen(false)} onAdd={addOrg} />
    </div>
  )
}

// ── Log Books Panel ───────────────────────────────────────────
const EMPTY_BOOK = { title: '', author: '', genre: '', age_range: '', condition: 'Good', quantity: 1, date_received: '' }

function LogBooksPanel({ open, onClose, onAdd }) {
  const [form,   setForm]   = useState(EMPTY_BOOK)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setErr('Title is required.'); return }
    if (!form.quantity || Number(form.quantity) < 1) { setErr('Quantity must be at least 1.'); return }
    setSaving(true)
    const payload = { ...form, quantity: Number(form.quantity) }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.title = form.title.trim()
    const { error } = await onAdd(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    setForm(EMPTY_BOOK); setErr(''); setSaving(false); onClose()
  }

  function lbl(text, req) {
    return <label className="p4c-label" style={{ fontSize: '0.72rem' }}>{text}{req && <span style={{ color: '#F6AA3C' }}> *</span>}</label>
  }

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={onClose} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(440px, 100vw)',
        background: '#0d233e', borderLeft: '1px solid rgba(255,255,255,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.77,0,0.175,1)',
        zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Log Books</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <div>{lbl('Title', true)}<input className="p4c-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Book title" /></div>
          <div>{lbl('Author')}<input className="p4c-input" value={form.author} onChange={e => set('author', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>{lbl('Genre')}<select className="p4c-input" value={form.genre} onChange={e => set('genre', e.target.value)} style={{ cursor: 'pointer' }}><option value="">Select…</option>{GENRE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div>{lbl('Age Range')}<select className="p4c-input" value={form.age_range} onChange={e => set('age_range', e.target.value)} style={{ cursor: 'pointer' }}><option value="">Select…</option>{AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div>{lbl('Condition')}<select className="p4c-input" value={form.condition} onChange={e => set('condition', e.target.value)} style={{ cursor: 'pointer' }}>{CONDITION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div>{lbl('Quantity', true)}<input className="p4c-input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
          </div>
          <div>{lbl('Date Received')}<input className="p4c-input" type="date" value={form.date_received} onChange={e => set('date_received', e.target.value)} /></div>
          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving}>{saving ? <span className="p4c-spinner-sm" /> : 'Log Books'}</button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Distribution Modal ─────────────────────────────────────────
function DistributionModal({ open, onClose, books, chapterId, onLogged }) {
  const { user } = useAuth()
  const [orgId,    setOrgId]    = useState('')
  const [orgs,     setOrgs]     = useState([])
  const [selected, setSelected] = useState({})
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  useEffect(() => {
    if (!open || !chapterId) return
    supabase.from('organizations').select('id, org_name')
      .eq('chapter_id', chapterId).eq('current_status', 'Partnership Established').order('org_name')
      .then(({ data }) => setOrgs(data ?? []))
  }, [open, chapterId])

  function toggleBook(bookId) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[bookId] != null) delete next[bookId]
      else next[bookId] = 1
      return next
    })
  }

  function setQty(bookId, qty) {
    setSelected(prev => ({ ...prev, [bookId]: Math.max(1, Number(qty)) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!orgId) { setErr('Select an organization.'); return }
    const items = Object.entries(selected).map(([bookId, quantity]) => ({ bookId, quantity }))
    if (items.length === 0) { setErr('Select at least one book.'); return }
    for (const item of items) {
      const book = books.find(b => b.id === item.bookId)
      if (!book || book.quantity < item.quantity) { setErr(`Not enough stock for "${book?.title ?? item.bookId}".`); return }
    }
    setSaving(true)
    const errors = []
    for (const item of items) {
      const { data: book } = await supabase.from('books').select('quantity').eq('id', item.bookId).single()
      if (!book || book.quantity < item.quantity) { errors.push(`Not enough stock.`); continue }
      const { error: distErr } = await supabase.from('distributions').insert({
        chapter_id: chapterId, org_id: orgId, quantity: item.quantity,
        distribution_date: date, logged_by: user?.id, notes,
      })
      if (distErr) { errors.push(distErr.message); continue }
      await supabase.from('books').update({ quantity: book.quantity - item.quantity }).eq('id', item.bookId)
    }
    setSaving(false)
    if (errors.length > 0) { setErr(errors[0]); return }
    setOrgId(''); setSelected({}); setNotes(''); setDate(new Date().toISOString().slice(0, 10))
    onLogged(); onClose()
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="p4c-modal-in" style={{ background: '#0d233e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Log Distribution</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Organization<span style={{ color: '#F6AA3C' }}> *</span></label>
            <select className="p4c-input" value={orgId} onChange={e => setOrgId(e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select established partner…</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
            </select>
            {orgs.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: '0.25rem' }}>No established partnerships yet.</p>}
          </div>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Select Books<span style={{ color: '#F6AA3C' }}> *</span></label>
            <div style={{ border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {books.filter(b => b.quantity > 0).map(book => (
                <label key={book.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 1rem', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: selected[book.id] != null ? 'rgba(246,170,60,0.06)' : 'transparent',
                }}>
                  <input type="checkbox" checked={selected[book.id] != null} onChange={() => toggleBook(book.id)} style={{ accentColor: '#F6AA3C' }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                    {book.title}{book.author ? ` — ${book.author}` : ''}
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem', fontSize: '0.78rem' }}>({book.quantity} in stock)</span>
                  </span>
                  {selected[book.id] != null && (
                    <input type="number" min="1" max={book.quantity} value={selected[book.id]}
                      onChange={e => setQty(book.id, e.target.value)} onClick={e => e.stopPropagation()}
                      style={{ width: '64px', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none' }}
                    />
                  )}
                </label>
              ))}
              {books.filter(b => b.quantity > 0).length === 0 && (
                <p style={{ padding: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center' }}>No books in stock.</p>
              )}
            </div>
          </div>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Distribution Date</label>
            <input className="p4c-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Notes</label>
            <textarea className="p4c-input" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '70px' }} />
          </div>
          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving}>{saving ? <span className="p4c-spinner-sm" /> : 'Log Distribution'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Inventory Tab ─────────────────────────────────────────────
function InventoryTab({ chapterId }) {
  const { user } = useAuth()
  const [books,     setBooks]     = useState([])
  const [count,     setCount]     = useState(0)
  const [totals,    setTotals]    = useState({ total: 0, byGenre: {} })
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(0)
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState('row_number')
  const [sortDir,   setSortDir]   = useState('asc')
  const [editCell,  setEditCell]  = useState(null)
  const [editValue, setEditValue] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [distOpen,  setDistOpen]  = useState(false)

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

  function startEdit(rowId, col, value) { setEditCell({ rowId, col }); setEditValue(value ?? '') }

  async function commitEdit() {
    if (!editCell) return
    const { rowId, col } = editCell
    setEditCell(null)
    const colDef = BOOK_COLS.find(c => c.key === col)
    const val = colDef?.type === 'number' ? (editValue === '' ? null : Number(editValue)) : (editValue || null)
    const { data } = await supabase.from('books').update({ [col]: val }).eq('id', rowId).select().single()
    if (data) {
      setBooks(prev => prev.map(b => b.id === rowId ? data : b))
      // refresh totals if quantity changed
      if (col === 'quantity') load()
    }
  }

  function cancelEdit() { setEditCell(null); setEditValue('') }

  async function addBook(fields) {
    const { data, error } = await supabase
      .from('books')
      .insert({ ...fields, chapter_id: chapterId, logged_by: user?.id })
      .select().single()
    if (!error && data) { setBooks(prev => [data, ...prev]); setCount(prev => prev + 1); load() }
    return { data, error }
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
        <button className="pill-button secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem', flexShrink: 0 }} onClick={() => setDistOpen(true)}>Log Distribution</button>
        <button className="pill-button orange" style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem', flexShrink: 0 }} onClick={() => setPanelOpen(true)}>+ Log Books</button>
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
                  className="p4c-item-in"
                  style={{ animationDelay: `${Math.min(i, 15) * 0.03}s`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                >
                  {BOOK_COLS.map(col => (
                    <EditCell
                      key={col.key} row={book} col={col}
                      editCell={editCell} editValue={editValue}
                      onStartEdit={startEdit} onEditChange={setEditValue}
                      onCommit={commitEdit} onCancel={cancelEdit}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onPage={setPage} />
      <LogBooksPanel open={panelOpen} onClose={() => setPanelOpen(false)} onAdd={addBook} />
      <DistributionModal open={distOpen} onClose={() => setDistOpen(false)} books={books} chapterId={chapterId} onLogged={load} />
    </div>
  )
}

// ── Pipeline helpers (DnD) ────────────────────────────────────
function PipelineCard({ org, isDragging }) {
  const isEstablished = org.current_status === 'Partnership Established'
  return (
    <div style={{
      background: isDragging ? 'rgba(246,170,60,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${isDragging ? 'rgba(246,170,60,0.4)' : 'rgba(255,255,255,0.1)'}`,
      borderLeft: isEstablished ? '3px solid #86efac' : '3px solid transparent',
      borderRadius: '10px', padding: '0.65rem 0.85rem',
      cursor: 'grab', opacity: isDragging ? 0.85 : 1, userSelect: 'none',
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
  )
}

function DraggablePipelineCard({ org }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: org.id, data: { org } })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ touchAction: 'none' }}>
      <PipelineCard org={org} isDragging={isDragging} />
    </div>
  )
}

function DroppableColumn({ status, orgs, collapsed, onToggleCollapse }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const isEstablished = status === 'Partnership Established'
  const isClosed      = COLLAPSED_BY_DEFAULT.has(status)

  return (
    <div style={{ minWidth: '220px', maxWidth: '220px', flexShrink: 0 }}>
      <div
        onClick={isClosed ? onToggleCollapse : undefined}
        style={{
          background: isEstablished ? 'linear-gradient(135deg, #14532d, #166534)' : isClosed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
          borderRadius: collapsed ? '10px' : '10px 10px 0 0',
          padding: '0.6rem 0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: isClosed ? 'pointer' : 'default',
          border: `1px solid ${isEstablished ? 'rgba(134,239,172,0.2)' : 'rgba(255,255,255,0.08)'}`,
          borderBottom: collapsed ? undefined : 'none',
        }}
      >
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.75rem', color: isEstablished ? '#86efac' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {status}
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.82rem', color: isEstablished ? '#86efac' : 'rgba(255,255,255,0.5)', flexShrink: 0, marginLeft: '0.4rem' }}>
          {orgs.length}{isClosed && <span style={{ marginLeft: '0.35rem', opacity: 0.6 }}>{collapsed ? '▸' : '▾'}</span>}
        </span>
      </div>

      {!collapsed && (
        <div ref={setNodeRef} style={{
          minHeight: '80px',
          background: isOver ? 'rgba(246,170,60,0.05)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isOver ? 'rgba(246,170,60,0.3)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: '0 0 10px 10px',
          padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}>
          {orgs.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', minHeight: '60px',
              color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
            }}>Drop here</div>
          ) : orgs.map(org => (
            <DraggablePipelineCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pipeline Tab ──────────────────────────────────────────────
function PipelineTab({ chapterId }) {
  const [orgs,      setOrgs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeOrg, setActiveOrg] = useState(null)
  const [collapsed, setCollapsed] = useState(() => {
    const init = {}
    COLLAPSED_BY_DEFAULT.forEach(s => { init[s] = true })
    return init
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  function handleDragStart(event) {
    setActiveOrg(orgs.find(o => o.id === event.active.id) ?? null)
  }

  async function handleDragEnd(event) {
    setActiveOrg(null)
    const { active, over } = event
    if (!over) return
    const org = orgs.find(o => o.id === active.id)
    if (!org || org.current_status === over.id) return
    const newStatus = over.id
    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, current_status: newStatus } : o))
    const { error } = await supabase.from('organizations').update({ current_status: newStatus }).eq('id', org.id)
    if (error) setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, current_status: org.current_status } : o))
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="p4c-spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
          {orgs.length} organizations · drag cards to update status
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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1.5rem', alignItems: 'flex-start' }}>
          {ALL_PIPELINE_STATUSES.map(status => (
            <DroppableColumn
              key={status}
              status={status}
              orgs={byStatus[status] ?? []}
              collapsed={!!collapsed[status]}
              onToggleCollapse={() => setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))}
            />
          ))}
        </div>
        <DragOverlay>
          {activeOrg && <PipelineCard org={activeOrg} isDragging />}
        </DragOverlay>
      </DndContext>
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
