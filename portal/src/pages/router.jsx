import { createBrowserRouter, Navigate } from 'react-router-dom'
import Guard                from '../components/Guard.jsx'
import Landing              from './Landing.jsx'
import Login                from './Login.jsx'
import Apply                from './Apply.jsx'
import AcceptInvite         from './AcceptInvite.jsx'
import AdminDashboard       from './AdminDashboard.jsx'
import ChapterDashboard     from './ChapterDashboard.jsx'
import VolunteerDashboard   from './VolunteerDashboard.jsx'
import NotFound             from './NotFound.jsx'

export const router = createBrowserRouter(
  [
    // ── Public ────────────────────────────────────────────
    { path: '/',       element: <Landing /> },
    { path: '/login',  element: <Login /> },
    { path: '/apply',  element: <Apply /> },
    { path: '/invite', element: <AcceptInvite /> },

    // ── Protected: national_admin ──────────────────────────
    {
      path: '/admin',
      element: (
        <Guard allowedRoles={['national_admin']}>
          <AdminDashboard />
        </Guard>
      ),
    },

    // ── Protected: chapter_lead ────────────────────────────
    {
      path: '/chapter',
      element: (
        <Guard allowedRoles={['chapter_lead']}>
          <ChapterDashboard />
        </Guard>
      ),
    },

    // ── Protected: volunteer ───────────────────────────────
    {
      path: '/volunteer',
      element: (
        <Guard allowedRoles={['volunteer']}>
          <VolunteerDashboard />
        </Guard>
      ),
    },

    // ── 404 ───────────────────────────────────────────────
    { path: '*', element: <NotFound /> },
  ],
  { basename: '/portal' }
)
