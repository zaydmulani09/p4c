import { useState, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const FOUNDING_COORDS = [-74.5333, 40.3743] // South Brunswick, NJ

const STATE_CENTROIDS = {
  AL: [-86.9023, 32.3182], AK: [-153.3691, 61.3707], AZ: [-111.0937, 34.0489],
  AR: [-92.1990, 34.7465], CA: [-119.4179, 36.7783], CO: [-105.7821, 39.5501],
  CT: [-72.7554, 41.6032], DE: [-75.5071, 38.9108], FL: [-81.5158, 27.6648],
  GA: [-82.9001, 32.1656], HI: [-157.4983, 19.8968], ID: [-114.4788, 44.0682],
  IL: [-89.1965, 40.6331], IN: [-86.1349, 40.2672], IA: [-93.0977, 41.8780],
  KS: [-96.7265, 39.0119], KY: [-84.2700, 37.8393], LA: [-91.9623, 30.9843],
  ME: [-69.4455, 45.2538], MD: [-76.6413, 39.0458], MA: [-71.3824, 42.4072],
  MI: [-85.6024, 44.3148], MN: [-94.6859, 46.7296], MS: [-89.3985, 32.3547],
  MO: [-91.8318, 37.9643], MT: [-110.3626, 46.8797], NE: [-99.9018, 41.4925],
  NV: [-116.4194, 38.8026], NH: [-71.5724, 43.1939], NJ: [-74.4057, 40.0583],
  NM: [-105.8701, 34.5199], NY: [-74.2179, 43.2994], NC: [-79.0193, 35.7596],
  ND: [-101.0020, 47.5515], OH: [-82.9071, 40.4173], OK: [-97.5164, 35.4676],
  OR: [-120.5542, 43.8041], PA: [-77.1945, 41.2033], RI: [-71.4774, 41.5801],
  SC: [-81.1637, 33.8361], SD: [-99.9018, 44.5720], TN: [-86.5804, 35.5175],
  TX: [-99.9018, 31.9686], UT: [-111.0937, 39.3210], VT: [-72.5778, 44.5588],
  VA: [-78.6569, 37.4316], WA: [-120.7401, 47.7511], WV: [-80.4549, 38.5976],
  WI: [-89.6165, 43.7844], WY: [-107.2903, 43.0760], DC: [-77.0369, 38.9072],
}

function getCoords(chapter) {
  if (chapter.is_founding) return FOUNDING_COORDS
  return STATE_CENTROIDS[chapter.state] ?? [-98.5795, 39.8283]
}

export default function ChapterMap({ chapters = [] }) {
  const wrapperRef  = useRef(null)
  const [mousePos,  setMousePos]  = useState({ x: 0, y: 0 })
  const [hovered,   setHovered]   = useState(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  function handleMouseMove(e) {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {chapters.map(c => (
          <div
            key={c.id}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{c.is_founding ? '⭐' : '📖'}</span>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                {c.name}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>
                {c.city}, {c.state} · {c.booksDistributed} books
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
      style={{
        position: 'relative',
        width: '100%',
        height: '500px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#0b1f38',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <style>{`
        @keyframes p4c-pulse-ring {
          0%   { r: 14; opacity: 0.9; }
          50%  { r: 22; opacity: 0.3; }
          100% { r: 14; opacity: 0.9; }
        }
        .founding-ring { animation: p4c-pulse-ring 2.2s ease-in-out infinite; }
      `}</style>

      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#0d233e"
                stroke="#1e3a5f"
                strokeWidth={0.8}
                style={{
                  default: { outline: 'none' },
                  hover:   { outline: 'none', fill: '#122847' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {chapters.map(chapter => (
          <Marker
            key={chapter.id}
            coordinates={getCoords(chapter)}
            onMouseEnter={() => setHovered(chapter)}
            onMouseLeave={() => setHovered(null)}
          >
            {chapter.is_founding ? (
              <>
                <circle
                  className="founding-ring"
                  r={14}
                  fill="rgba(255,215,0,0.25)"
                  stroke="none"
                />
                <circle
                  r={10}
                  fill="#FFD700"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                />
              </>
            ) : (
              <circle
                r={hovered?.id === chapter.id ? 10 : 8}
                fill="#F6AA3C"
                stroke="rgba(246,170,60,0.4)"
                strokeWidth={hovered?.id === chapter.id ? 5 : 3}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              />
            )}
          </Marker>
        ))}
      </ComposableMap>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(mousePos.x + 16, (wrapperRef.current?.offsetWidth ?? 700) - 210),
            top:  Math.max(mousePos.y - 70, 8),
            background: 'white',
            color: '#1a365d',
            padding: '0.7rem 0.95rem',
            borderRadius: '10px',
            boxShadow: '0 6px 28px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 30,
            minWidth: '190px',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.88rem', color: '#1a365d' }}>
            {hovered.name}{hovered.is_founding ? ' ⭐' : ''}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#555', marginTop: '0.1rem' }}>
            {hovered.school}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: '#888', marginTop: '0.1rem' }}>
            {hovered.city}, {hovered.state}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#F6AA3C', fontWeight: 700, marginTop: '0.35rem' }}>
            {hovered.booksDistributed} books distributed
          </p>
        </div>
      )}
    </div>
  )
}
