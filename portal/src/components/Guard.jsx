import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_ROUTES = {
  national_admin: '/admin',
  chapter_lead:   '/chapter',
  volunteer:      '/volunteer',
}

export default function Guard({ allowedRoles, children }) {
  const { user, role, loading } = useAuth()

  if (loading) return <FullScreenSpinner />

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_ROUTES[role] ?? '/login'} replace />
  }

  // Still fetching profile (user set but role not yet)
  if (allowedRoles && !role) return <FullScreenSpinner />

  return children
}

function FullScreenSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a365d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}
    >
      <img
        src="/logo.png"
        alt="P4C"
        style={{ height: '2.5rem', opacity: 0.6, transition: 'opacity 0.3s ease' }}
      />
      <div className="p4c-spinner" />
    </div>
  )
}
