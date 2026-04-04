import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

function groupByCategory(resources) {
  return resources.reduce((acc, r) => {
    const cat = r.category ?? 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(r)
    return acc
  }, {})
}

export default function Resources() {
  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('resources')
      .select('*')
      .order('category')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setResources(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="p4c-spinner" />
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '1rem',
          }}
        >
          No resources uploaded yet. Check back soon.
        </p>
      </div>
    )
  }

  const grouped = groupByCategory(resources)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: 'white',
              }}
            >
              {category}
            </h2>
            <span
              style={{
                background: 'rgba(246,170,60,0.15)',
                color: '#F6AA3C',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.15rem 0.6rem',
                borderRadius: '20px',
                letterSpacing: '0.04em',
              }}
            >
              {items.length}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            {items.map(r => (
              <div
                key={r.id}
                className="dash-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'white',
                      marginBottom: '0.2rem',
                    }}
                  >
                    {r.title}
                  </p>
                  {r.description && (
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.82rem',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {r.description}
                    </p>
                  )}
                </div>

                {r.file_url && (
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="pill-button orange"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', flexShrink: 0 }}
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
