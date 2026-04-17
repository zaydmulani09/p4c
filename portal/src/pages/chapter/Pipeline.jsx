import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'

// ── Constants ─────────────────────────────────────────────────
const ALL_STATUSES = [
  'Not Contacted',
  'Researching',
  'Initial Outreach Sent',
  'Follow-Up Sent',
  'Awaiting Response',
  'Interested',
  'Meeting Scheduled',
  'Partnership Established',
  'Not Interested',
  'Closed',
]

const COLLAPSED_BY_DEFAULT = new Set(['Not Interested', 'Closed'])
const ESTABLISHED_STATUS   = 'Partnership Established'
const CLOSED_STATUSES      = new Set(['Not Interested', 'Closed'])

const ORG_TYPE_OPTIONS = ['Library', 'School', 'Community Center', 'Church/Religious', 'Hospital', 'Non-Profit', 'Business', 'Government', 'Other']
const STATUS_OPTIONS   = ALL_STATUSES
const CONTACT_METHODS  = ['Email', 'Phone', 'In Person', 'Social Media', 'Mail', 'Other']

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function daysLabel(dateStr) {
  const d = daysSince(dateStr)
  if (d == null) return null
  if (d === 0) return 'Updated today'
  if (d === 1) return 'Updated 1 day ago'
  return `Updated ${d} days ago`
}

function isOverdue(org) {
  if (CLOSED_STATUSES.has(org.current_status)) return false
  return daysSince(org.updated_at) >= 14
}

// ── Org Card ──────────────────────────────────────────────────
function OrgCard({ org, onClick, isDragging }) {
  const overdue = isOverdue(org)
  const days    = daysLabel(org.updated_at)

  return (
    <div
      onClick={onClick}
      style={{
        background: isDragging ? 'rgba(246,170,60,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isDragging ? 'rgba(246,170,60,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderLeft: overdue ? '3px solid #F6AA3C' : '3px solid transparent',
        borderRadius: '10px',
        padding: '0.75rem 0.9rem',
        cursor: 'pointer',
        opacity: isDragging ? 0.85 : 1,
        transition: 'background 0.15s ease, border-color 0.15s ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
      onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem', color: 'white', margin: 0, lineHeight: 1.3 }}>
          {org.org_name}
        </p>
        {overdue && (
          <span title="14+ days since last update" style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#F6AA3C', flexShrink: 0, marginTop: '4px',
          }} />
        )}
      </div>

      {org.org_type && (
        <div style={{ marginBottom: '0.35rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(246,170,60,0.15)', color: '#F6AA3C',
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: '0.6rem', padding: '0.1rem 0.5rem',
            transform: 'skewX(-15deg)', letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            <span style={{ transform: 'skewX(15deg)' }}>{org.org_type}</span>
          </span>
        </div>
      )}

      {org.contact_name && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: 0, marginBottom: '0.25rem' }}>
          {org.contact_name}
        </p>
      )}

      {days && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: overdue ? '#F6AA3C' : 'rgba(255,255,255,0.35)', margin: 0 }}>
          {days}
        </p>
      )}
    </div>
  )
}

// ── Draggable Card ────────────────────────────────────────────
function DraggableCard({ org, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: org.id, data: { org } })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ touchAction: 'none' }}>
      <OrgCard org={org} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}

// ── Droppable Column ──────────────────────────────────────────
function KanbanColumn({ status, orgs, onCardClick, collapsed, onToggleCollapse }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const isEstablished = status === ESTABLISHED_STATUS
  const isClosed      = COLLAPSED_BY_DEFAULT.has(status)

  const headerBg = isEstablished
    ? 'linear-gradient(135deg, #14532d, #166534)'
    : isClosed
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.06)'

  return (
    <div style={{
      minWidth: '240px',
      maxWidth: '240px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div
        onClick={isClosed ? onToggleCollapse : undefined}
        style={{
          background: headerBg,
          borderRadius: '10px 10px 0 0',
          padding: '0.6rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isClosed ? 'pointer' : 'default',
          border: `1px solid ${isEstablished ? 'rgba(134,239,172,0.2)' : 'rgba(255,255,255,0.08)'}`,
          borderBottom: 'none',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem',
          color: isEstablished ? '#86efac' : 'rgba(255,255,255,0.75)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {status}
        </span>
        <span style={{
          fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.82rem',
          color: isEstablished ? '#86efac' : 'rgba(255,255,255,0.5)',
          flexShrink: 0, marginLeft: '0.4rem',
        }}>
          {orgs.length}
          {isClosed && <span style={{ marginLeft: '0.35rem', opacity: 0.6 }}>{collapsed ? '▸' : '▾'}</span>}
        </span>
      </div>

      {/* Cards area */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            minHeight: '120px',
            background: isOver ? 'rgba(246,170,60,0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isOver ? 'rgba(246,170,60,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '0 0 10px 10px',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
        >
          {orgs.map(org => (
            <DraggableCard key={org.id} org={org} onClick={() => onCardClick(org)} />
          ))}
          {orgs.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px',
              minHeight: '80px',
              color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
            }}>
              Drop here
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Detail Side Panel ─────────────────────────────────────────
function DetailPanel({ org, open, onClose, onUpdate }) {
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  useEffect(() => {
    if (org) setForm({ ...org })
  }, [org])

  if (!org) return null

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    setSaving(true)
    setErr('')
    const payload = {}
    const fields = ['org_name', 'org_type', 'website', 'contact_name', 'contact_title', 'email', 'phone', 'township', 'current_status', 'follow_up_date', 'notes', 'outcome']
    fields.forEach(k => { payload[k] = form[k] || null })
    payload.org_name = form.org_name?.trim() || org.org_name
    const { error } = await onUpdate(org.id, payload)
    if (error) { setErr(error.message); setSaving(false); return }
    setSaving(false)
    onClose()
  }

  function lbl(text) {
    return <label className="p4c-label" style={{ fontSize: '0.68rem' }}>{text}</label>
  }

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={onClose} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(460px, 100vw)',
        background: '#0d233e', borderLeft: '1px solid rgba(255,255,255,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.77,0,0.175,1)',
        zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
            {org.org_name}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1 }}>
          <div>
            {lbl('Organization Name')}
            <input className="p4c-input" value={form.org_name ?? ''} onChange={e => set('org_name', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div>
              {lbl('Org Type')}
              <select className="p4c-input" value={form.org_type ?? ''} onChange={e => set('org_type', e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">Select…</option>
                {ORG_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              {lbl('Status')}
              <select className="p4c-input" value={form.current_status ?? ''} onChange={e => set('current_status', e.target.value)} style={{ cursor: 'pointer' }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              {lbl('Contact Name')}
              <input className="p4c-input" value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} />
            </div>
            <div>
              {lbl('Position')}
              <input className="p4c-input" value={form.contact_title ?? ''} onChange={e => set('contact_title', e.target.value)} />
            </div>
            <div>
              {lbl('Email')}
              <input className="p4c-input" type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              {lbl('Phone')}
              <input className="p4c-input" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              {lbl('Township')}
              <input className="p4c-input" value={form.township ?? ''} onChange={e => set('township', e.target.value)} />
            </div>
            <div>
              {lbl('Follow-Up Date')}
              <input className="p4c-input" type="date" value={form.follow_up_date?.slice(0,10) ?? ''} onChange={e => set('follow_up_date', e.target.value)} />
            </div>
          </div>
          <div>
            {lbl('Website')}
            <input className="p4c-input" value={form.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            {lbl('Notes')}
            <textarea className="p4c-input" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} style={{ minHeight: '80px' }} />
          </div>
          <div>
            {lbl('Outcome')}
            <input className="p4c-input" value={form.outcome ?? ''} onChange={e => set('outcome', e.target.value)} />
          </div>

          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{err}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button type="button" className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
            <button type="button" className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }} disabled={saving} onClick={handleSave}>
              {saving ? <span className="p4c-spinner-sm" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Pipeline ─────────────────────────────────────────────
export default function Pipeline() {
  const { chapterId } = useAuth()
  const [orgs,      setOrgs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeOrg, setActiveOrg] = useState(null)   // drag overlay
  const [detailOrg, setDetailOrg] = useState(null)   // detail panel
  const [panelOpen, setPanelOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    const init = {}
    COLLAPSED_BY_DEFAULT.forEach(s => { init[s] = true })
    return init
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchOrgs = useCallback(async () => {
    if (!chapterId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('updated_at', { ascending: false })
    setOrgs(data ?? [])
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const byStatus = {}
  ALL_STATUSES.forEach(s => { byStatus[s] = [] })
  orgs.forEach(org => {
    const s = org.current_status ?? 'Not Contacted'
    if (byStatus[s]) byStatus[s].push(org)
    else byStatus['Not Contacted'].push(org)
  })

  function handleDragStart(event) {
    const org = orgs.find(o => o.id === event.active.id)
    setActiveOrg(org ?? null)
  }

  async function handleDragEnd(event) {
    setActiveOrg(null)
    const { active, over } = event
    if (!over) return
    const orgId    = active.id
    const newStatus = over.id  // droppable id === status string

    const org = orgs.find(o => o.id === orgId)
    if (!org || org.current_status === newStatus) return

    // Optimistic update
    setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, current_status: newStatus } : o))

    const { error } = await supabase
      .from('organizations')
      .update({ current_status: newStatus })
      .eq('id', orgId)

    if (error) {
      // Revert on error
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, current_status: org.current_status } : o))
    }
  }

  async function updateOrg(id, fields) {
    const { data, error } = await supabase
      .from('organizations')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setOrgs(prev => prev.map(o => o.id === id ? data : o))
    }
    return { data, error }
  }

  function openDetail(org) {
    setDetailOrg(org)
    setPanelOpen(true)
  }

  function closeDetail() {
    setPanelOpen(false)
    setTimeout(() => setDetailOrg(null), 350)
  }

  function toggleCollapse(status) {
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="p4c-spinner" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexShrink: 0 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
          {orgs.length} organizations · drag cards to update status
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {Array.from(COLLAPSED_BY_DEFAULT).map(s => (
            <button key={s} onClick={() => toggleCollapse(s)} style={{
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

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{
          display: 'flex', gap: '0.75rem',
          overflowX: 'auto', overflowY: 'visible',
          paddingBottom: '1.5rem',
          flex: 1,
          alignItems: 'flex-start',
        }}>
          {ALL_STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              orgs={byStatus[status]}
              onCardClick={openDetail}
              collapsed={!!collapsed[status]}
              onToggleCollapse={() => toggleCollapse(status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrg && <OrgCard org={activeOrg} onClick={() => {}} isDragging />}
        </DragOverlay>
      </DndContext>

      <DetailPanel
        org={detailOrg}
        open={panelOpen}
        onClose={closeDetail}
        onUpdate={updateOrg}
      />
    </div>
  )
}
