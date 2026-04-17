import { useState, useRef, useEffect } from 'react'
import { useBooks, BOOKS_PAGE_SIZE } from '../../hooks/useBooks.js'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'

// ── Constants ─────────────────────────────────────────────────
const GENRE_OPTIONS     = ['Fiction', 'Nonfiction', 'Picture Book', 'Early Reader', 'Middle Grade', 'Young Adult', 'Reference', 'Educational', 'Other']
const AGE_OPTIONS       = ['0-3', '4-6', '7-9', '10-12', '13+', 'All Ages']
const CONDITION_OPTIONS = ['New', 'Good', 'Fair', 'Poor']

const COLUMNS = [
  { key: 'title',         label: 'Title',         type: 'text',   w: 220, editable: true },
  { key: 'author',        label: 'Author',        type: 'text',   w: 175, editable: true },
  { key: 'genre',         label: 'Genre',         type: 'select', w: 145, editable: true,  options: GENRE_OPTIONS },
  { key: 'age_range',     label: 'Age Range',     type: 'select', w: 115, editable: true,  options: AGE_OPTIONS },
  { key: 'condition',     label: 'Condition',     type: 'select', w: 115, editable: true,  options: CONDITION_OPTIONS },
  { key: 'quantity',      label: 'Qty',           type: 'number', w: 80,  editable: true },
  { key: 'date_received', label: 'Date Received', type: 'date',   w: 145, editable: true },
  { key: 'logged_by',     label: 'Logged By',     type: 'text',   w: 145, editable: false },
]

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function isStale(book) {
  if (!book.date_received) return false
  return Date.now() - new Date(book.date_received).getTime() > NINETY_DAYS_MS
}

function fmt(val, type) {
  if (val == null || val === '') return ''
  if (type === 'date') return val.slice(0, 10)
  return String(val)
}

// ── Inline Cell ───────────────────────────────────────────────
function Cell({ book, col, editCell, editValue, onStartEdit, onEditChange, onCommit, onCancel, memberMap }) {
  const isEditing = editCell?.rowId === book.id && editCell?.col === col.key
  const inputRef  = useRef(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); onCommit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  const tdStyle = {
    padding: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    width: col.w, minWidth: col.w, maxWidth: col.w,
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
          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
          min={col.type === 'number' ? 0 : undefined}
          style={inputStyle} value={editValue}
          onChange={e => onEditChange(e.target.value)} onBlur={onCommit} onKeyDown={handleKeyDown}
        />
      </td>
    )
  }

  if (col.key === 'logged_by') {
    return <td style={tdStyle}><span style={cellStyle}>{memberMap[book.logged_by] ?? '—'}</span></td>
  }

  if (col.key === 'condition' && book.condition) {
    const colors = { New: { bg: '#14532d', color: '#86efac' }, Good: { bg: '#134e4a', color: '#5eead4' }, Fair: { bg: '#78350f', color: '#fcd34d' }, Poor: { bg: '#450a0a', color: '#fca5a5' } }
    const c = colors[book.condition] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }
    return (
      <td style={tdStyle} onClick={() => col.editable && onStartEdit(book.id, col.key, book[col.key] ?? '')}>
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <span style={{ background: c.bg, color: c.color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            {book.condition}
          </span>
        </div>
      </td>
    )
  }

  return (
    <td style={tdStyle} onClick={() => col.editable && onStartEdit(book.id, col.key, fmt(book[col.key], col.type))}>
      <span style={cellStyle}>{fmt(book[col.key], col.type) || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}</span>
    </td>
  )
}

// ── Log Books Panel ───────────────────────────────────────────
const EMPTY_BOOK = { title: '', author: '', genre: '', age_range: '', condition: 'Good', quantity: 1, date_received: '' }

function LogBooksPanel({ open, onClose, addBook }) {
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
    payload.quantity = Number(form.quantity)
    const { error } = await addBook(payload)
    if (error) { setErr(error.message); setSaving(false); return }
    setForm(EMPTY_BOOK)
    setErr('')
    onClose()
  }

  function lbl(text, req) {
    return (
      <label className="p4c-label" style={{ fontSize: '0.72rem' }}>
        {text}{req && <span style={{ color: '#F6AA3C' }}> *</span>}
      </label>
    )
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
          <div>
            {lbl('Title', true)}
            <input className="p4c-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Book title" />
          </div>
          <div>
            {lbl('Author')}
            <input className="p4c-input" value={form.author} onChange={e => set('author', e.target.value)} placeholder="Author name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              {lbl('Genre')}
              <select className="p4c-input" value={form.genre} onChange={e => set('genre', e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">Select…</option>
                {GENRE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              {lbl('Age Range')}
              <select className="p4c-input" value={form.age_range} onChange={e => set('age_range', e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">Select…</option>
                {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              {lbl('Condition')}
              <select className="p4c-input" value={form.condition} onChange={e => set('condition', e.target.value)} style={{ cursor: 'pointer' }}>
                {CONDITION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              {lbl('Quantity', true)}
              <input className="p4c-input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
          </div>
          <div>
            {lbl('Date Received')}
            <input className="p4c-input" type="date" value={form.date_received} onChange={e => set('date_received', e.target.value)} />
          </div>

          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving}>
              {saving ? <span className="p4c-spinner-sm" /> : 'Log Books'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Distribution Modal ─────────────────────────────────────────
function DistributionModal({ open, onClose, books, logDistribution, chapterId }) {
  const [orgId,    setOrgId]    = useState('')
  const [orgs,     setOrgs]     = useState([])
  const [selected, setSelected] = useState({}) // bookId → qty
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  useEffect(() => {
    if (!open || !chapterId) return
    supabase
      .from('organizations')
      .select('id, org_name')
      .eq('chapter_id', chapterId)
      .eq('current_status', 'Partnership Established')
      .order('org_name')
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

    // Validate stock
    for (const item of items) {
      const book = books.find(b => b.id === item.bookId)
      if (!book || book.quantity < item.quantity) {
        setErr(`Not enough stock for "${book?.title ?? item.bookId}".`)
        return
      }
    }

    setSaving(true)
    const { errors } = await logDistribution(orgId, items, date, notes)
    setSaving(false)
    if (errors.length > 0) { setErr(errors[0]); return }
    setOrgId(''); setSelected({}); setNotes(''); setDate(new Date().toISOString().slice(0, 10))
    onClose()
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#0d233e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
                    <input
                      type="number" min="1" max={book.quantity}
                      value={selected[book.id]}
                      onChange={e => setQty(book.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Distribution Date</label>
              <input className="p4c-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Notes</label>
            <textarea className="p4c-input" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '70px' }} />
          </div>

          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving}>
              {saving ? <span className="p4c-spinner-sm" /> : 'Log Distribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Totals Bar ─────────────────────────────────────────────────
function TotalsBar({ totals }) {
  const { total, byGenre } = totals

  // Top 3 genres + Other
  const sorted = Object.entries(byGenre).sort((a, b) => b[1] - a[1])
  const top3   = sorted.slice(0, 3)
  const otherQty = sorted.slice(3).reduce((s, [, q]) => s + q, 0)

  return (
    <div style={{
      display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center',
      background: '#122847', borderRadius: '10px', padding: '0.75rem 1.25rem',
      marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.4rem', color: '#F6AA3C', lineHeight: 1 }}>
          {total.toLocaleString()}
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total in Stock
        </span>
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
  )
}

// ── Filters Bar ───────────────────────────────────────────────
function FiltersBar({ search, onSearch, genre, onGenre, ageRange, onAgeRange, condition, onCondition, onClearAll }) {
  const hasFilters = search || genre || ageRange || condition
  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
      <input
        className="p4c-input" value={search} onChange={e => onSearch(e.target.value)}
        placeholder="Search title or author…"
        style={{ maxWidth: '240px', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
      />
      {[
        { val: genre, setter: onGenre, placeholder: 'All Genres', options: GENRE_OPTIONS },
        { val: ageRange, setter: onAgeRange, placeholder: 'All Ages', options: AGE_OPTIONS },
        { val: condition, setter: onCondition, placeholder: 'All Conditions', options: CONDITION_OPTIONS },
      ].map(({ val, setter, placeholder, options }) => (
        <select key={placeholder}
          value={val} onChange={e => setter(e.target.value)}
          style={{
            padding: '0.5rem 0.9rem',
            background: val ? 'rgba(246,170,60,0.1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${val ? 'rgba(246,170,60,0.3)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '8px', color: val ? '#F6AA3C' : 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}
      {hasFilters && (
        <button onClick={onClearAll} style={{
          padding: '0.45rem 0.9rem', background: 'transparent',
          border: '1px solid rgba(252,165,165,0.3)', borderRadius: '8px',
          color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
        }}>Clear all</button>
      )}
    </div>
  )
}

// ── Column Header ─────────────────────────────────────────────
function ColHeader({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col.key
  return (
    <th onClick={() => onSort(col.key)} style={{
      padding: '0.65rem 0.75rem', textAlign: 'left',
      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem',
      color: active ? '#F6AA3C' : 'rgba(255,255,255,0.55)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      background: '#0d233e', borderBottom: '1px solid rgba(255,255,255,0.1)',
      cursor: 'pointer', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2,
      width: col.w, minWidth: col.w, userSelect: 'none',
    }}>
      {col.label}
      {active && <span style={{ marginLeft: '0.3rem', opacity: 0.8 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ page, totalPages, count, onPage }) {
  if (totalPages <= 1) return null
  const pill = (active, disabled) => ({
    padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none',
    background: active ? '#F6AA3C' : 'rgba(255,255,255,0.07)',
    color: active ? '#1a365d' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
    fontFamily: 'var(--font-body)', fontWeight: active ? 800 : 600, fontSize: '0.82rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '1rem 0', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginRight: '0.5rem' }}>{count} total</span>
      <button onClick={() => onPage(0)}           disabled={page === 0}              style={pill(false, page === 0)}>«</button>
      <button onClick={() => onPage(page - 1)}    disabled={page === 0}              style={pill(false, page === 0)}>‹</button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i} onClick={() => onPage(i)} style={pill(i === page, false)}>{i + 1}</button>
      ))}
      <button onClick={() => onPage(page + 1)}    disabled={page >= totalPages - 1}  style={pill(false, page >= totalPages - 1)}>›</button>
      <button onClick={() => onPage(totalPages-1)} disabled={page >= totalPages - 1} style={pill(false, page >= totalPages - 1)}>»</button>
    </div>
  )
}

// ── Main Inventory ─────────────────────────────────────────────
export default function Inventory() {
  const { chapterId } = useAuth()
  const [panelOpen,  setPanelOpen]  = useState(false)
  const [distOpen,   setDistOpen]   = useState(false)
  const [editCell,   setEditCell]   = useState(null)
  const [editValue,  setEditValue]  = useState('')
  const [page,       setPage]       = useState(0)
  const [sortCol,    setSortCol]    = useState('created_at')
  const [sortDir,    setSortDir]    = useState('desc')
  const [search,     setSearch]     = useState('')
  const [genre,      setGenre]      = useState('')
  const [ageRange,   setAgeRange]   = useState('')
  const [condition,  setCondition]  = useState('')

  const filters = { search, genre, ageRange, condition, sortCol, sortDir }
  const { books, count, totalPages, loading, memberMap, totals, addBook, updateBook, logDistribution } = useBooks(filters, page)

  function upd(fn) { fn(); setPage(0) }

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
    const colDef = COLUMNS.find(c => c.key === col)
    const val = colDef?.type === 'number' ? (editValue === '' ? null : Number(editValue)) : (editValue || null)
    await updateBook(rowId, { [col]: val })
  }

  function cancelEdit() { setEditCell(null); setEditValue('') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TotalsBar totals={totals} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <FiltersBar
          search={search} onSearch={v => upd(() => setSearch(v))}
          genre={genre}   onGenre={v => upd(() => setGenre(v))}
          ageRange={ageRange} onAgeRange={v => upd(() => setAgeRange(v))}
          condition={condition} onCondition={v => upd(() => setCondition(v))}
          onClearAll={() => { setSearch(''); setGenre(''); setAgeRange(''); setCondition(''); setPage(0) }}
        />
        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
          <button className="pill-button secondary" style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem' }} onClick={() => setDistOpen(true)}>
            Log Distribution
          </button>
          <button className="pill-button orange" style={{ fontSize: '0.875rem', padding: '0.55rem 1.25rem' }} onClick={() => setPanelOpen(true)}>
            + Log Books
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', background: '#122847' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="p4c-spinner" /></div>
        ) : books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
              No books logged yet. Log your first donation to get started.
            </p>
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>{COLUMNS.map(col => <ColHeader key={col.key} col={col} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />)}</tr>
            </thead>
            <tbody>
              {books.map((book, i) => (
                <tr key={book.id} style={{
                  background: isStale(book) ? 'rgba(246,170,60,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderLeft: isStale(book) ? '3px solid #F6AA3C' : '3px solid transparent',
                  transition: 'background 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isStale(book) ? 'rgba(246,170,60,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                >
                  {COLUMNS.map(col => (
                    <Cell key={col.key} book={book} col={col} editCell={editCell} editValue={editValue}
                      onStartEdit={startEdit} onEditChange={setEditValue} onCommit={commitEdit} onCancel={cancelEdit}
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

      <LogBooksPanel open={panelOpen} onClose={() => setPanelOpen(false)} addBook={addBook} />
      <DistributionModal open={distOpen} onClose={() => setDistOpen(false)} books={books} logDistribution={logDistribution} chapterId={chapterId} />
    </div>
  )
}
