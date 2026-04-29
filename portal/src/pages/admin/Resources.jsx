import { useState, useRef } from 'react'
import { useResources } from '../../hooks/useResources.js'

const CATEGORY_OPTIONS = ['Outreach Templates', 'Brand Guide', 'Pitch Decks', 'Playbook', 'Inventory Guides', 'Other']

function groupByCategory(resources) {
  return resources.reduce((acc, r) => {
    const cat = r.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(r)
    return acc
  }, {})
}

// ── Upload Modal ───────────────────────────────────────────────
function UploadModal({ open, onClose, onUpload }) {
  const [form,     setForm]     = useState({ title: '', description: '', category: '' })
  const [file,     setFile]     = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err,      setErr]      = useState('')
  const fileRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setErr('Title is required.'); return }
    if (!file) { setErr('Please select a file.'); return }
    setUploading(true)
    setErr('')
    const { error } = await onUpload({ title: form.title.trim(), description: form.description, category: form.category, file })
    setUploading(false)
    if (error) { setErr(error.message); return }
    setForm({ title: '', description: '', category: '' })
    setFile(null)
    onClose()
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#0d233e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
        width: 'min(520px, 100%)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white', margin: 0 }}>Upload Resource</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Title<span style={{ color: '#F6AA3C' }}> *</span></label>
            <input className="p4c-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Resource title" />
          </div>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Description</label>
            <textarea className="p4c-input" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: '70px' }} placeholder="Brief description…" />
          </div>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>Category</label>
            <select className="p4c-input" value={form.category} onChange={e => set('category', e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select category…</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="p4c-label" style={{ fontSize: '0.72rem' }}>File<span style={{ color: '#F6AA3C' }}> *</span></label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'rgba(246,170,60,0.5)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '10px', padding: '1.25rem',
                textAlign: 'center', cursor: 'pointer',
                background: file ? 'rgba(246,170,60,0.04)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.15s ease',
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
            >
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: file ? '#F6AA3C' : 'rgba(255,255,255,0.45)', margin: 0 }}>
                {file ? file.name : 'Click or drag a file here'}
              </p>
              {file && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: '0.25rem 0 0' }}>
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]) }} />
          </div>

          {err && <p style={{ color: '#fca5a5', fontSize: '0.82rem', margin: 0 }}>{err}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="pill-button secondary" style={{ flex: 1, fontSize: '0.85rem' }}>Cancel</button>
            <button type="submit" disabled={uploading} className="pill-button orange" style={{ flex: 2, fontSize: '0.85rem' }}>
              {uploading ? <span className="p4c-spinner-sm" /> : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Resource Row ───────────────────────────────────────────────
function ResourceRow({ resource, onDelete, onUpdate }) {
  const [editMode,    setEditMode]    = useState(false)
  const [title,       setTitle]       = useState(resource.title)
  const [description, setDescription] = useState(resource.description ?? '')
  const [deleting,    setDeleting]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)

  async function handleSave() {
    setSaving(true)
    await onUpdate(resource.id, { title, description: description || null })
    setSaving(false)
    setEditMode(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(resource.id, resource.file_url)
    setDeleting(false)
  }

  return (
    <div className="dash-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              className="p4c-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
            />
            <textarea
              className="p4c-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
              placeholder="Description…"
            />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '0.35rem 0.8rem', background: '#F6AA3C', border: 'none', borderRadius: '6px',
                color: '#1a365d', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              }}>
                {saving ? <span className="p4c-spinner-sm" /> : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setTitle(resource.title); setDescription(resource.description ?? '') }} style={{
                padding: '0.35rem 0.8rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: '0.2rem' }}>{resource.title}</p>
            {resource.description && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{resource.description}</p>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        {resource.file_url && (
          <a
            href={resource.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="pill-button orange"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem' }}
          >
            Download
          </a>
        )}
        {!editMode && (
          <button onClick={() => setEditMode(true)} style={{
            padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
            color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}>
            Edit
          </button>
        )}
        {confirmDel ? (
          <>
            <button onClick={handleDelete} disabled={deleting} style={{
              padding: '0.35rem 0.75rem', background: '#450a0a',
              border: '1px solid rgba(252,165,165,0.3)', borderRadius: '6px',
              color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
            }}>
              {deleting ? <span className="p4c-spinner-sm" /> : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDel(false)} style={{
              padding: '0.35rem 0.6rem', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
              color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer',
            }}>✕</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{
            padding: '0.35rem 0.75rem', background: 'rgba(252,165,165,0.07)',
            border: '1px solid rgba(252,165,165,0.2)', borderRadius: '6px',
            color: '#fca5a5', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Resources ───────────────────────────────────────
export default function AdminResources() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const { resources, loading, uploadResource, deleteResource, updateResource } = useResources()

  const grouped = groupByCategory(resources)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="pill-button orange" style={{ fontSize: '0.875rem', padding: '0.55rem 1.25rem' }} onClick={() => setUploadOpen(true)}>
          + Upload Resource
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
          <div className="p4c-spinner" />
        </div>
      ) : resources.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>
            No resources uploaded yet. Upload the first one.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'white' }}>{category}</h2>
              <span style={{
                background: 'rgba(246,170,60,0.15)', color: '#F6AA3C',
                fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.6rem',
                borderRadius: '20px', letterSpacing: '0.04em',
              }}>
                {items.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {items.map(r => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  onDelete={deleteResource}
                  onUpdate={updateResource}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={uploadResource} />
    </div>
  )
}
