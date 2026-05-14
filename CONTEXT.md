# Pages for Change — Network Portal Context

## Project Description

**Pages for Change Network Portal** — multi-tenant chapter management platform at `pagesforchange.org/portal`.

South Brunswick, NJ is the Founding Chapter (HQ). All other chapters are satellite chapters that apply via the public Apply page.

**Co-Founders & Co-Executive Directors:** Zayd Mulani · Affan Shaik

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5, React Router v6, Tailwind CSS v3 |
| Auth & DB | Supabase (PostgreSQL + RLS + Auth + Storage) |
| Supabase client | @supabase/supabase-js v2 |
| Hosting | Vercel (free tier) |
| AI | Groq (llama3-70b-8192) — impact reports, weekly summaries, certificates only |
| Repo | zaydmulani09/p4c |

---

## File Tree

```
p4c/
├── index.html                        # Static site root
├── style.css                         # Static site styles
├── script.js                         # Static site scripts
├── vercel.json                       # Vercel build + SPA rewrites
├── schema.sql                        # Full Supabase schema (run in SQL editor)
├── CONTEXT.md                        # This file
├── .gitignore
│
├── scripts/
│   └── seed-admins.sql               # Seed Zayd + Affan as national_admin
│
├── portal/                           # React SPA (Vite, base: /portal/)
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GROQ_API_KEY
│   │
│   └── src/
│       ├── main.jsx                  # Entry: AuthProvider → RouterProvider
│       ├── index.css                 # Design tokens, component classes
│       ├── print.css                 # @media print styles — imported by Impact + Certificates pages
│       │
│       ├── lib/
│       │   ├── supabase.js           # Supabase client singleton
│       │   ├── config.js             # FOUNDING_CHAPTER_ID constant
│       │   └── groq.js               # Groq service — generateWeeklySummary, generateImpactReport, generateImpactCertificate
│       │
│       ├── context/
│       │   └── AuthContext.jsx       # AuthProvider + useAuth hook
│       │
│       ├── hooks/
│       │   ├── useChapter.js         # Fetch current chapter details
│       │   ├── useWeeklyStats.js     # This-week counts (orgs, books, dists, active)
│       │   ├── useOrganizations.js   # Fetch/add/update orgs, filter + pagination
│       │   ├── useBooks.js           # Fetch/add/update books; logDistribution()
│       │   ├── useDistributions.js   # Fetch distribution history for chapter
│       │   ├── useNetworkStats.js    # get_public_stats() RPC + leaderboard + health + activity
│       │   ├── useChapters.js        # All chapters with aggregate stats, suspend/reactivate
│       │   ├── useApplications.js    # Fetch apps by status, approve/reject
│       │   └── useResources.js       # Fetch, upload (Storage), delete, update resources
│       │
│       ├── components/
│       │   ├── Guard.jsx             # Role-based route protection
│       │   ├── Navbar.jsx            # Auth-aware nav, role badge
│       │   ├── Modal.jsx             # Reusable centered modal wrapper
│       │   ├── ChapterLayout.jsx     # Sidebar + top bar shell for chapter pages
│       │   ├── ChapterSidebar.jsx    # 240px nav sidebar, mobile overlay
│       │   ├── AdminLayout.jsx       # Admin sidebar + top bar shell
│       │   └── AdminSidebar.jsx      # 240px admin nav with Co-ED badge
│       │
│       └── pages/
│           ├── router.jsx            # createBrowserRouter, all routes
│           ├── Landing.jsx           # Public homepage, live stats RPC
│           ├── Login.jsx             # Sign in, field-level errors
│           ├── Apply.jsx             # Chapter application form
│           ├── AcceptInvite.jsx      # Magic-link → set password flow
│           ├── NotFound.jsx          # 404
│           ├── AdminDashboard.jsx    # national_admin stub (P5)
│           ├── ChapterDashboard.jsx  # (superseded by chapter/ pages below)
│           ├── VolunteerDashboard.jsx # volunteer stub (P4)
│           │
│           ├── admin/
│           │   ├── Dashboard.jsx     # Network stats, leaderboard, health feed, AI summary, activity
│           │   ├── Chapters.jsx      # All chapters table, inline expand, suspend/reactivate
│           │   ├── Applications.jsx  # Pending/approved/rejected tabs, approve/reject flow
│           │   ├── Resources.jsx     # Upload/delete/edit resources, Supabase Storage integration
│           │   ├── Impact.jsx        # National impact report — network aggregation, Groq, PDF/copy
│           │   └── Certificates.jsx  # Chapter lead certificate generator — Groq, PDF print
│           └── chapter/
│               ├── Dashboard.jsx     # Chapter lead home — stats, overdue, AI summary, quick actions
│               ├── Tracker.jsx       # Outreach tracker — inline editing, filters, pagination
│               ├── Inventory.jsx     # Book inventory — table, log panel, distribution modal, totals bar
│               ├── Pipeline.jsx      # Kanban pipeline — drag & drop, detail panel, collapsed columns
│               ├── Resources.jsx     # Resource library grouped by category
│               ├── Impact.jsx        # Chapter impact report — period selector, Groq generation, PDF/copy
│               └── ComingSoon.jsx    # Stub for unimplemented routes
│
└── (static site assets)
    ├── hero-bg.png
    ├── footer-bg.png
    ├── about-illustration.png
    ├── logo.png
    ├── wood-texture.png
    └── (team photos: zayd-mulani.png, affan-shaik.png, anay-krishna.png,
                       sharf-syed.png, zaid-ali.png, zaid-koujalgi.png,
                       affan-anwari.png)
```

---

## Prompt Status

| Prompt | Title | Status |
|--------|-------|--------|
| P1 | Foundation + Schema + Public Pages | ✅ Complete |
| P2 | Auth + Role Routing | ✅ Complete |
| P3 | Chapter Dashboard + Outreach Tracker | ✅ Complete |
| P4 | Book Inventory + Pipeline | ✅ Complete |
| P5 | National Admin Views | ✅ Complete |
| P6 | AI Features + Impact Reports | ✅ Complete |
| P7 | Public Portal Landing + Chapter Map | 🔲 Pending |
| P8 | Polish + Data Migration + Launch | 🔲 Pending |

---

## What P1 Built

- `schema.sql` — 8 tables (`chapters`, `users`, `organizations`, `books`, `distributions`, `contact_log`, `chapter_applications`, `resources`), `user_role` ENUM, RLS enabled on all tables with full policies, 13 indexes, `get_user_role()` + `get_user_chapter_id()` SECURITY DEFINER helpers, `get_public_stats()` RPC (GRANT to anon)
- `portal/src/lib/supabase.js` — Supabase client singleton
- `portal/src/lib/config.js` — `FOUNDING_CHAPTER_ID` constant
- `portal/src/context/AuthContext.jsx` — `AuthProvider` + `useAuth` hook, `onAuthStateChange` session restore
- `portal/src/components/Guard.jsx` — loading spinner, unauthenticated redirect, wrong-role redirect
- `portal/src/components/Navbar.jsx` — auth-aware, role badge
- `portal/src/pages/router.jsx` — all 8 routes with `basename: '/portal'`
- `portal/src/pages/Landing.jsx` — public homepage, live stats via `get_public_stats()` RPC
- `portal/src/pages/Login.jsx` — sign in
- `portal/src/pages/Apply.jsx` — chapter application form
- `portal/src/pages/AcceptInvite.jsx` — magic-link invite → set password
- `portal/src/pages/NotFound.jsx` — 404 page
- `vercel.json` — Vercel build config + SPA rewrites
- `scripts/seed-admins.sql` — seed Zayd + Affan as `national_admin`
- `index.html` — added Portal nav link

## What P2 Built

- Full auth flow with `supabase.auth.onAuthStateChange` (handles page refresh, `INITIAL_SESSION`)
- Role-based routing: `national_admin → /admin`, `chapter_lead → /chapter`, `volunteer → /volunteer`
- Invite accept flow (`AcceptInvite.jsx`): watches for `SIGNED_IN` / `PASSWORD_RECOVERY` events, sets password, redirects to role dashboard
- 404 page (`NotFound.jsx`)
- Role-colored navbar badges (orange = national_admin, teal = chapter_lead, green = volunteer)
- Field-level error states in Login (maps Supabase error strings to specific field)
- Inline spinner on Login submit button
- Session persistence across page refreshes via `onAuthStateChange`

## What P3 Built

- `ChapterLayout.jsx` + `ChapterSidebar.jsx` — 240px fixed sidebar with P4C logo, nav items with active state (orange left border), role badge, sign out. Mobile: full-screen overlay with hamburger. Top bar: sticky, shows page title + notification bell (UI only).
- `pages/chapter/Dashboard.jsx` — Welcome header (Montserrat 900), chapter name (Josefin Slab), Founding Chapter ⭐ badge, 4 stat cards (navy bg, orange left border), overdue follow-ups panel (orgs not updated in 14+ days and status not closed), 3 quick-action modals (Add Organization, Log Books, Log Distribution), AI weekly summary panel (Groq llama3-70b-8192, 7-day localStorage cache per chapter per week)
- `pages/chapter/Tracker.jsx` — horizontally scrollable table with 18 columns matching Google Sheet, inline cell editing (click → input/select → Enter/blur to save), slide-in add panel (right, 0.35s cubic-bezier), filters bar (search, status multi-select, org type, date range, clear all), overdue row highlighting (orange left border for past follow_up_date), status badge colors (green=established, teal=interested/meeting, red=closed), sort on column headers (asc/desc toggle), pagination (50 rows, pill controls), empty state
- `pages/chapter/Resources.jsx` — resource list from DB grouped by category, download button per file, empty state
- `pages/chapter/ComingSoon.jsx` — stub for Pipeline, Inventory, Team, Stats, Impact routes
- `components/Modal.jsx` — reusable centered modal wrapper with backdrop blur
- `hooks/useChapter.js` — fetch chapter details by chapterId
- `hooks/useWeeklyStats.js` — 4 parallel count queries for weekly dashboard stats
- `hooks/useOrganizations.js` — fetch/add/update orgs with filter params, pagination, logged_by name resolution via `public.users`
- `router.jsx` — updated: `/chapter` now uses nested routes under `ChapterLayout` Guard wrapper
- `.env.example` — added `VITE_GROQ_API_KEY=`

---

## What P5 Built

- `components/AdminLayout.jsx` + `components/AdminSidebar.jsx` — mirror of ChapterLayout/Sidebar for national_admin. Sidebar lists 5 nav items (Impact Reports stub), Co-Executive Directors orange badge, Zayd Mulani + Affan Shaik names, Sign Out. HQ badge in top bar.
- `pages/admin/Dashboard.jsx` — "Pages for Change Network" header (Montserrat 900), Josefin Slab co-eds line, Founding Chapter badge; 4 aggregate stat cards (navy, orange left border); AI weekly network summary (Groq, 7-day localStorage cache per week); chapter leaderboard table (ranked by books distributed, gold trophy for #1); chapter health feed (green/amber/red dots based on last activity days); recent activity feed (last 10 org/book events across all chapters)
- `pages/admin/Chapters.jsx` — sortable/filterable table of all chapters; click row → inline expand showing 6 aggregate stats (orgs, books, dists, partnerships, lead, last activity); Suspend (with confirmation) and Reactivate actions; filter by status; search by name/school; empty state
- `pages/admin/Applications.jsx` — 3-tab bar (Pending/Approved/Rejected); expandable application cards with full "why interested"; Approve flow creates chapter row in DB + updates application status (invite email stubbed — requires service role key, note shown in UI); Reject flow shows reason modal, stores reason
- `pages/admin/Resources.jsx` — upload modal with drag-and-drop file zone, Supabase Storage bucket `resources`; grouped by category; per-resource inline edit (title/description) + delete (removes from Storage + table) + download; empty state
- `hooks/useNetworkStats.js` — parallel queries: get_public_stats(), chapter rows, distributions, partnerships, user names, last-activity per chapter, recent activity feed
- `hooks/useChapters.js` — all chapters enriched with aggregate stats via parallel Supabase queries; suspend/reactivate mutations
- `hooks/useApplications.js` — fetch by status tab; approve (chapter insert + status update); reject (status update with reason)
- `hooks/useResources.js` — fetch, upload to Storage, delete (Storage + DB row), update
- `router.jsx` — `/admin` now uses nested routes under `AdminLayout` Guard; old flat `AdminDashboard` import removed; Impact Reports stub kept

## What P6 Built

- `portal/src/lib/groq.js` — centralized Groq service (`llama3-70b-8192`): `generateWeeklySummary(stats, scope)`, `generateImpactReport(data, period, scope)`, `generateImpactCertificate(data)`. All functions handle errors gracefully → fallback string. 24-hour localStorage cache per report type + key.
- `portal/src/pages/chapter/Impact.jsx` — chapter impact report page: 5-period selector (This Month / Last Month / This Semester / This Year / Custom Range), data preview with 5 stat cards + status breakdown + top volunteer, Groq report generation with screen preview, Download PDF (`window.print()`), Copy Text. Empty state if no data.
- `portal/src/pages/admin/Impact.jsx` — national network impact report: same UX pattern, aggregates orgs/books/distributions/partnerships across all chapters, shows top chapter + geographic spread (states list).
- `portal/src/pages/admin/Certificates.jsx` — admin-only certificate generator: chapter lead dropdown (all `chapter_lead` users), year selector (current + 2 prior), fetches full-year chapter stats, Groq generates certificate body, screen preview with signature lines, PDF download. Navy-border certificate layout in print CSS.
- `portal/src/print.css` — `@media print` styles: hides aside/nav/buttons/.no-print, white background, navy text, `report-header`/`report-body`/`certificate-border`/`certificate-sigs` classes, fixed `.print-footer` ("Pages for Change — pagesforchange.org") appears on every printed page. Imported only in Impact + Certificates pages.
- `router.jsx` — `/chapter/impact` → `ChapterImpact`, `/admin/impact` → `AdminImpact`, `/admin/certificates` → `Certificates`. `ComingSoon` stubs replaced.
- `AdminSidebar.jsx` — Impact Reports stub removed; Certificates nav item added.
- `ChapterSidebar.jsx` — Impact Reports stub removed.

## What P4 Built

- `pages/chapter/Inventory.jsx` — book inventory table (8 columns, inline editing, sort, pagination 50/page), slide-in "+ Log Books" panel, filter bar (search/genre/age/condition), running totals bar (total + top-3 genres + Other), 90-day stale row highlight (orange left border), Log Distribution modal (org dropdown filtered to Partnership Established, multi-select books with qty, decrement on submit)
- `pages/chapter/Pipeline.jsx` — kanban board with 10 status columns; drag-and-drop via @dnd-kit (card drop updates `current_status` in Supabase instantly); overdue indicator (orange dot, 14+ days non-closed); Partnership Established column has green header; Not Interested + Closed collapsed by default (click header to expand); detail side panel (slide-in, all fields editable inline); DragOverlay for smooth drag preview; horizontal scroll on overflow
- `hooks/useBooks.js` — fetch/add/update books with filters + pagination; `logDistribution()` inserts distribution row and decrements book quantity, validates stock
- `hooks/useDistributions.js` — fetch distribution history with org name join
- `@dnd-kit/core` and `@dnd-kit/sortable` added to portal/package.json
- `ChapterSidebar.jsx` — removed "Soon" stub badge from Pipeline and Inventory nav items
- `router.jsx` — `/chapter/pipeline` → `<Pipeline />`, `/chapter/inventory` → `<Inventory />`

## Test Count

**0** — no tests written yet.

---

## Known Issues / Technical Debt

- `FOUNDING_CHAPTER_ID` in `portal/src/lib/config.js` is a placeholder — replace with real UUID after the South Brunswick chapter row is created in Supabase
- No tests written yet
- `VITE_GROQ_API_KEY` must be set in Vercel env vars for AI summaries to work
- Bundle is ~627KB / ~169KB gzipped — can code-split in P8
- `ChapterDashboard.jsx` is a dead file (superseded by `chapter/Dashboard.jsx`) — safe to delete later
- `AdminDashboard.jsx` (pages root) is a dead file — superseded by `admin/Dashboard.jsx` — safe to delete later
- **Invite email limitation**: `supabase.auth.admin.inviteUserByEmail()` requires the service role key, which must never be exposed in the frontend. On application approval, the chapter DB row is created but the auth invite must be sent manually via the Supabase dashboard (Auth → Users → Invite) or via a backend Edge Function. This is a P6/P8 concern.
