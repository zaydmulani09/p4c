import { createBrowserRouter } from 'react-router-dom'
import Guard               from '../components/Guard.jsx'
import ChapterLayout       from '../components/ChapterLayout.jsx'
import AdminLayout         from '../components/AdminLayout.jsx'
import Landing             from './Landing.jsx'
import Login               from './Login.jsx'
import Apply               from './Apply.jsx'
import AcceptInvite        from './AcceptInvite.jsx'
import VolunteerDashboard  from './VolunteerDashboard.jsx'
import NotFound            from './NotFound.jsx'
import Dashboard           from './chapter/Dashboard.jsx'
import Tracker             from './chapter/Tracker.jsx'
import Resources           from './chapter/Resources.jsx'
import Inventory           from './chapter/Inventory.jsx'
import Pipeline            from './chapter/Pipeline.jsx'
import ComingSoon          from './chapter/ComingSoon.jsx'
import AdminDashboard      from './admin/Dashboard.jsx'
import AdminChapters       from './admin/Chapters.jsx'
import AdminApplications   from './admin/Applications.jsx'
import AdminResources      from './admin/Resources.jsx'

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
          <AdminLayout />
        </Guard>
      ),
      children: [
        { index: true,              element: <AdminDashboard /> },
        { path: 'chapters',         element: <AdminChapters /> },
        { path: 'applications',     element: <AdminApplications /> },
        { path: 'resources',        element: <AdminResources /> },
        { path: 'impact',           element: <ComingSoon title="Impact Reports" /> },
      ],
    },

    // ── Protected: chapter_lead ────────────────────────────
    {
      path: '/chapter',
      element: (
        <Guard allowedRoles={['chapter_lead']}>
          <ChapterLayout />
        </Guard>
      ),
      children: [
        { index: true,             element: <Dashboard /> },
        { path: 'tracker',         element: <Tracker /> },
        { path: 'resources',       element: <Resources /> },
        { path: 'pipeline',        element: <Pipeline /> },
        { path: 'inventory',       element: <Inventory /> },
        { path: 'team',            element: <ComingSoon title="Team" /> },
        { path: 'stats',           element: <ComingSoon title="Chapter Stats" /> },
        { path: 'impact',          element: <ComingSoon title="Impact Reports" /> },
      ],
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
