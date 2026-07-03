import { useState, useRef, useEffect } from 'react'
import { useOrganizations, PAGE_SIZE } from '../../hooks/useOrganizations.js'

// ── Constants ─────────────────────────────────────────────────
const STATUS_OPTIONS  = ['Not Contacted', 'Contacted', 'Meeting Scheduled', 'Interested', 'In Progress', 'Follow-Up Needed', 'Partnership Established', 'Not Interested', 'Closed']
const ORG_TYPE_OPTIONS = ['Library', 'School', 'Community Center', 'Church/Religious', 'Hospital', 'Non-Profit', 'Business', 'Government', 'Other']
const CONTACT_METHODS = ['Email', 'Phone', 'In Person', 'Social Media', 'Mail', 'Other']
const CLOSED_SET      = new Set(['Partnership Established', 'Not Interested', 'Closed'])

const TRACKER_SORTS = [
  { value: 'date_asc',       label: 'Date Added (oldest first)',         col: 'created_at',           dir: 'asc'  },
  { value: 'date_desc',      label: 'Date Added (newest first)',         col: 'created_at',           dir: 'desc' },
  { value: 'name_asc',       label: 'Organization Name A → Z',          col: 'org_name',             dir: 'asc'  },
  { value: 'name_desc',      label: 'Organization Name Z → A',          col: 'org_name',             dir: 'desc' },
  { value: 'status',         label: 'Status',                            col: 'current_status',       dir: 'asc'  },
  { value: 'contacted_desc', label: 'Date First Contacted (newest)',     col: 'date_first_contacted', dir: 'desc' },
  { value: 'interest_desc',  label: 'Partnership Interest (High → Low)', col: 'partnership_interest', dir: 'desc' },
  { value: 'updated_desc',   label: 'Last Updated (most recent)',        col: 'updated_at',           dir: 'desc' },
]

const COLUMNS = [
  { key: 'org_name',             label: 'Organization Name',    type: 'text',   w: 200, editable: true },
  { key: 'org_type',             label: 'Organization Type',    type: 'select', w: 155, editable: true,  options: ORG_TYPE_OPTIONS },
  { key: 'website',              label: 'Website',              type: 'text',   w: 165, editable: true },
  { key: 'contact_name',         label: 'Contact Name',         type: 'text',   w: 155, editable: true },
  { key: 'contact_title',        label: 'Position/Title',       type: 'text',   w: 145, editable: true },
  { key: 'email',                label: 'Email Address',        type: 'email',  w: 195, editable: true },
  { key: 'phone',                label: 'Phone Number',         type: 'text',   w: 145, editable: true },
  { key: 'township',             label: 'Township/State',       type: 'text',   w: 145, editable: true },
  { key: 'date_researched',      label: 'Date Researched',      type: 'date',   w: 145, editable: true },
  { key: 'date_first_contacted', label: 'Date First Contacted', type: 'date',   w: 165, editable: true },
  { key: 'contact_method',       label: 'Contact Method',       type: 'select', w: 145, editable: true,  options: CONTACT_METHODS },
  { key: 'current_status',       label: 'Current Status',       type: 'select', w: 185, editable: true,  options: STATUS_OPTIONS },
  { key: 'follow_up_date',       label: 'Follow-Up Date',       type: 'date',   w: 145, editable: true },
  { key: 'last_response_date',   label: 'Last Response Date',   type: 'date',   w: 165, editable: true },
  { key: 'partnership_interest', label: 'Partnership Interest', type: 'text',   w: 185, editable: true },
  { key: 'notes',                label: 'Notes',                type: 'text',   w: 220, editable: true },
  { key: 'outcome',              label: 'Outcome',              type: 'text',   w: 165, editable: true },
  { key: 'logged_by',            label: 'Logged By',            type: 'text',   w: 145, editable: false },
]

// ── Helpers ───────────────────────────────────────────────────
function statusStyle(status) {
  const s = (status ?? '').toLowerCase()
  if (s === 'partnership established')         return { bg: '#14532d', color: '#86efac' }
  if (s === 'interested' || s === 'meeting scheduled') return { bg: '#134e4a', color: '#5eead4' }
  if (s === 'not interested' || s === 'closed') return { bg: '#450a0a', color: '#fca5a5' }
  return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }
}

function isOverdue(org) {
  if (!org.follow_up_date)                        return false
  if (CLOSED_SET.has(org.current_status))         return false
  return new Date(org.follow_up_date) < new Date()
}

function fmt(val, type) {
  if (!val) return ''
  if (type === 'date') return val.slice(0, 10)
  return val
}

// ── Inline Cell ───────────────────────────────────────────────
function Cell({ org, col, editCell, editValue, onStartEdit, onEditChange, onCommit, onCancel, memberMap }) {
  const isEditing = editCell?.rowId === org.id && editCell?.col === col.key
  const inputRef  = useRef(null)
  const isFirstCol = col.key === 'org_name'

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); onCommit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  const tdStyle = {
    padding: '0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    width: col.w,
    minWidth: col.w,
    maxWidth: col.w,
    position: isFirstCol ? 'sticky' : 'relative',
    left: isFirstCol ? 0 : undefined,
    zIndex: isFirstCol ? 1 : undefined,
    background: isFirstCol ? '#122847' : undefined,
    boxShadow: isFirstCol ? '2px 0 6px rgba(0,0,0,0.25)' : undefined,
    verticalAlign: 'middle',
  }

  const cellStyle = {
    display: 'block',
    padding: '0.5rem 0.75rem',
    fontFamily: 'var(--font-body)',
    fontSize: '0.825rem',
    color: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: col.editable ? 'pointer' : 'default',
    minHeight: '36px',
    lineHeight: '1.4',
  }

  if (isEditing) {
    const inputStyle = {
      width: '100%',
      padding: '0.45rem 0.75rem',
      background: '#122847',
      border: '2px solid #F6AA3C',
      borderRadius: 0,
      color: 'white',
      fontFamily: 'var(--font-body)',
      fontSize: '0.825rem',
      outline: 'none',
    }

    if (col.type === 'select') {
      return (
        <td style={tdStyle}>
          <select
            ref={inputRef}
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
          >
            <option value="">—</option>
            {col.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>
      )
    }

    return (
      <td style={tdStyle}>
        <input
          ref={inputRef}
          type={col.type === 'email' ? 'email' : col.type === 'date' ? 'date' : 'text'}
          style={inputStyle}
          value={editValue}
          onChange={e => onEditChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={handleKeyDown}
        />
      </td>
    )
  }

  // Display mode
  if (col.key === 'current_status' && org.current_status) {
    const { bg, color } = statusStyle(org.current_status)
    return (
      <td style={tdStyle} onClick={() => col.editable && onStartEdit(org.id, col.key, org[col.key] ?? '')}>
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <span style={{ background: bg, color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {org.current_status}
          </span>
        </div>
      </td>
    )
  }

  if (col.key === 'logged_by') {
    return (
      <td style={tdStyle}>
        <span style={cellStyle}>{memberMap[org.logged_by] ?? '—'}</span>
      </td>
    )
  }

  if (col.key === 'website' && org.website) {
    return (
      <td style={tdStyle} onClick={() => col.editable && onStartEdit(org.id, col.key, org[col.key] ?? '')}>
        <a
          href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ ...cellStyle, color: '#60a5fa', textDecoration: 'underline', cursor: 'pointer', display: 'block' }}
        >
          {org.website}
        </a>
      </td>
    )
  }

  return (
    <td style={tdStyle} onClick={() => col.editable && onStartEdit(org.id, col.key, fmt(org[col.key], col.type))}>
      <span style={cellStyle}>{fmt(org[col.key], col.type) || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}</span>
    </td>
  )
}

// ── Add Org Panel ─────────────────────────────────────────────
const EMPTY_ORG = {
  org_name: '', org_type: '', website: '', contact_name: '', contact_title: '',
  email: '', phone: '', township: '', state: '', date_researched: '',
  date_first_contacted: '', contact_method: '', current_status: 'Not Contacted',
  follow_up_date: '', last_response_date: '', partnership_interest: '', notes: '', outcome: '',
}

function AddOrgPanel({ open, onClose, addOrg }) {
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
    const { error } = await addOrg(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    setForm(EMPTY_ORG)
    setErr('')
    onClose()
  }

  function label(text, req) {
    return (
      <label className="p4c-label" style={{ fontSize: '0.72rem' }}>
        {text}{req && <span style={{ color: '#F6AA3C' }}> *</span>}
      </label>
    )
  }

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
          onClick={onClose}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(480px, 100vw)',
          background: '#0d233e',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.77,0,0.175,1)',
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Add Organization</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <div>
            {label('Organization Name', true)}
            <input className="p4c-input" value={form.org_name} onChange={e => set('org_name', e.target.value)} placeholder="Org name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              {label('Org Type')}
              <select className="p4c-input" value={form.org_type} onChange={e => set('org_type', e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">Select…</option>
                {ORG_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              {label('Status')}
              <select className="p4c-input" value={form.current_status} onChange={e => set('current_status', e.target.value)} style={{ cursor: 'pointer' }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            {label('Website')}
            <input className="p4c-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              {label('Contact Name')}
              <input className="p4c-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              {label('Position/Title')}
              <input className="p4c-input" value={form.contact_title} onChange={e => set('contact_title', e.target.value)} placeholder="Title" />
            </div>
            <div>
              {label('Email')}
              <input className="p4c-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email" />
            </div>
            <div>
              {label('Phone')}
              <input className="p4c-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" />
            </div>
            <div>
              {label('Township')}
              <input className="p4c-input" value={form.township} onChange={e => set('township', e.target.value)} placeholder="Township" />
            </div>
            <div>
              {label('State')}
              <input className="p4c-input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="NJ" />
            </div>
            <div>
              {label('Date Researched')}
              <input className="p4c-input" type="date" value={form.date_researched} onChange={e => set('date_researched', e.target.value)} />
            </div>
            <div>
              {label('Date First Contacted')}
              <input className="p4c-input" type="date" value={form.date_first_contacted} onChange={e => set('date_first_contacted', e.target.value)} />
            </div>
            <div>
              {label('Contact Method')}
              <select className="p4c-input" value={form.contact_method} onChange={e => set('contact_method', e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">Select…</option>
                {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              {label('Follow-Up Date')}
              <input className="p4c-input" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
            </div>
            <div>
              {label('Last Response Date')}
              <input className="p4c-input" type="date" value={form.last_response_date} onChange={e => set('last_response_date', e.target.value)} />
            </div>
          </div>
          <div>
            {label('Partnership Interest')}
            <input className="p4c-input" value={form.partnership_interest} onChange={e => set('partnership_interest', e.target.value)} placeholder="Books, mentorship, …" />
          </div>
          <div>
            {label('Notes')}
            <textarea className="p4c-input" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: '80px' }} />
          </div>
          <div>
            {label('Outcome')}
            <input className="p4c-input" value={form.outcome} onChange={e => set('outcome', e.target.value)} />
          </div>

          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving}>
              {saving ? <span className="p4c-spinner-sm" /> : 'Save Organization'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Filters Bar ───────────────────────────────────────────────
function FiltersBar({ search, onSearch, statusFilter, onStatusToggle, orgType, onOrgType, dateFrom, onDateFrom, dateTo, onDateTo, sortKey, onSortKey, onClearAll }) {
  const [statusOpen, setStatusOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function outside(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setStatusOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const hasFilters = search || statusFilter.length || orgType || dateFrom || dateTo

  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
      {/* Search */}
      <input
        className="p4c-input"
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search org, contact, email…"
        style={{ maxWidth: '260px', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
      />

      {/* Status multi-select */}
      <div style={{ position: 'relative' }} ref={dropRef}>
        <button
          onClick={() => setStatusOpen(v => !v)}
          style={{
            padding: '0.5rem 0.9rem',
            background: statusFilter.length ? 'rgba(246,170,60,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${statusFilter.length ? 'rgba(246,170,60,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '8px',
            color: statusFilter.length ? '#F6AA3C' : 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Status {statusFilter.length > 0 ? `(${statusFilter.length})` : '▾'}
        </button>
        {statusOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            background: '#0d233e',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            padding: '0.5rem',
            zIndex: 50,
            minWidth: '210px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {STATUS_OPTIONS.map(s => (
              <label
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.82rem',
                  color: statusFilter.includes(s) ? 'white' : 'rgba(255,255,255,0.6)',
                  background: statusFilter.includes(s) ? 'rgba(246,170,60,0.1)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={statusFilter.includes(s)}
                  onChange={() => onStatusToggle(s)}
                  style={{ accentColor: '#F6AA3C' }}
                />
                {s}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Org Type */}
      <select
        value={orgType}
        onChange={e => onOrgType(e.target.value)}
        style={{
          padding: '0.5rem 0.9rem',
          background: orgType ? 'rgba(246,170,60,0.1)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${orgType ? 'rgba(246,170,60,0.3)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '8px',
          color: orgType ? '#F6AA3C' : 'rgba(255,255,255,0.7)',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.82rem',
          cursor: 'pointer',
        }}
      >
        <option value="">All Types</option>
        {ORG_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {/* Date range */}
      <input
        type="date"
        value={dateFrom}
        onChange={e => onDateFrom(e.target.value)}
        title="Date first contacted: from"
        style={{
          padding: '0.5rem 0.7rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px',
          color: dateFrom ? 'white' : 'rgba(255,255,255,0.4)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.82rem',
        }}
      />
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>→</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => onDateTo(e.target.value)}
        title="Date first contacted: to"
        style={{
          padding: '0.5rem 0.7rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px',
          color: dateTo ? 'white' : 'rgba(255,255,255,0.4)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.82rem',
        }}
      />

      <select
        value={sortKey}
        onChange={e => onSortKey(e.target.value)}
        style={{
          padding: '0.5rem 0.9rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.7)',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.82rem',
          cursor: 'pointer',
        }}
      >
        {TRACKER_SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {hasFilters && (
        <button
          onClick={onClearAll}
          style={{
            padding: '0.45rem 0.9rem',
            background: 'transparent',
            border: '1px solid rgba(252,165,165,0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

// ── Column Header ─────────────────────────────────────────────
function ColHeader({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col.key
  const isFirstCol = col.key === 'org_name'
  return (
    <th
      onClick={() => onSort(col.key)}
      style={{
        padding: '0.65rem 0.75rem',
        textAlign: 'left',
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: '0.72rem',
        color: active ? '#F6AA3C' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: '#0d233e',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        position: 'sticky',
        top: 0,
        left: isFirstCol ? 0 : undefined,
        zIndex: isFirstCol ? 3 : 2,
        width: col.w,
        minWidth: col.w,
        userSelect: 'none',
        boxShadow: isFirstCol ? '2px 0 6px rgba(0,0,0,0.3)' : undefined,
      }}
    >
      {col.label}
      {active && (
        <span style={{ marginLeft: '0.3rem', opacity: 0.8 }}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </th>
  )
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ page, totalPages, count, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '1rem 0', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginRight: '0.5rem' }}>
        {count} total
      </span>
      <button
        onClick={() => onPage(0)}
        disabled={page === 0}
        style={pillStyle(false, page === 0)}
      >«</button>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        style={pillStyle(false, page === 0)}
      >‹</button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onPage(i)}
          style={pillStyle(i === page, false)}
        >
          {i + 1}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        style={pillStyle(false, page >= totalPages - 1)}
      >›</button>
      <button
        onClick={() => onPage(totalPages - 1)}
        disabled={page >= totalPages - 1}
        style={pillStyle(false, page >= totalPages - 1)}
      >»</button>
    </div>
  )
}

function pillStyle(active, disabled) {
  return {
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
    border: 'none',
    background: active ? '#F6AA3C' : 'rgba(255,255,255,0.07)',
    color: active ? '#1a365d' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
    fontFamily: 'var(--font-body)',
    fontWeight: active ? 800 : 600,
    fontSize: '0.82rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
  }
}

// ── Main Tracker ──────────────────────────────────────────────
export default function Tracker() {
  const [panelOpen,     setPanelOpen]     = useState(false)
  const [editCell,      setEditCell]      = useState(null)  // { rowId, col }
  const [editValue,     setEditValue]     = useState('')
  const [page,          setPage]          = useState(0)
  const [sortKey,       setSortKey]       = useState('date_asc')
  const [sortCol,       setSortCol]       = useState('created_at')
  const [sortDir,       setSortDir]       = useState('asc')
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState([])
  const [orgType,       setOrgType]       = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  const filters = { search, status: statusFilter, orgType, dateFrom, dateTo, sortCol, sortDir }
  const { orgs, count, totalPages, loading, memberMap, addOrg, updateOrg } = useOrganizations(filters, page)

  function updateFilter(fn) {
    fn()
    setPage(0)
  }

  function handleSortKey(key) {
    const opt = TRACKER_SORTS.find(s => s.value === key)
    setSortKey(key)
    setSortCol(opt.col)
    setSortDir(opt.dir)
    setPage(0)
  }

  function handleSort(col) {
    const newDir = sortCol === col ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'
    const match = TRACKER_SORTS.find(s => s.col === col && s.dir === newDir)
    if (match) setSortKey(match.value)
    else setSortKey('')
    setSortCol(col)
    setSortDir(newDir)
    setPage(0)
  }

  function startEdit(rowId, col, value) {
    setEditCell({ rowId, col })
    setEditValue(value ?? '')
  }

  async function commitEdit() {
    if (!editCell) return
    const { rowId, col } = editCell
    setEditCell(null)
    await updateOrg(rowId, { [col]: editValue || null })
  }

  function cancelEdit() {
    setEditCell(null)
    setEditValue('')
  }

  function toggleStatus(s) {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    setPage(0)
  }

  function clearAll() {
    setSearch(''); setStatusFilter([]); setOrgType(''); setDateFrom(''); setDateTo('')
    setPage(0)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filters + Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <FiltersBar
          search={search}
          onSearch={v => updateFilter(() => setSearch(v))}
          statusFilter={statusFilter}
          onStatusToggle={toggleStatus}
          orgType={orgType}
          onOrgType={v => updateFilter(() => setOrgType(v))}
          dateFrom={dateFrom}
          onDateFrom={v => updateFilter(() => setDateFrom(v))}
          dateTo={dateTo}
          onDateTo={v => updateFilter(() => setDateTo(v))}
          sortKey={sortKey}
          onSortKey={handleSortKey}
          onClearAll={clearAll}
        />
        <button
          className="pill-button orange"
          style={{ fontSize: '0.875rem', padding: '0.55rem 1.25rem', flexShrink: 0 }}
          onClick={() => setPanelOpen(true)}
        >
          + Add Organization
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          background: '#122847',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="p4c-spinner" />
          </div>
        ) : orgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
              No organizations yet. Add your first one to get started.
            </p>
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <ColHeader key={col.key} col={col} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => (
                <tr
                  key={org.id}
                  style={{
                    background: isOverdue(org)
                      ? 'rgba(246,170,60,0.04)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    borderLeft: isOverdue(org) ? '3px solid #F6AA3C' : '3px solid transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isOverdue(org)
                      ? 'rgba(246,170,60,0.04)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  }}
                >
                  {COLUMNS.map(col => (
                    <Cell
                      key={col.key}
                      org={org}
                      col={col}
                      editCell={editCell}
                      editValue={editValue}
                      onStartEdit={startEdit}
                      onEditChange={setEditValue}
                      onCommit={commitEdit}
                      onCancel={cancelEdit}
                      memberMap={memberMap}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} count={count} onPage={setPage} />

      <AddOrgPanel open={panelOpen} onClose={() => setPanelOpen(false)} addOrg={addOrg} />
    </div>
  )
}
