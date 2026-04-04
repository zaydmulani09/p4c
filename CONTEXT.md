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
│       │
│       ├── lib/
│       │   ├── supabase.js           # Supabase client singleton
│       │   └── config.js             # FOUNDING_CHAPTER_ID constant
│       │
│       ├── context/
│       │   └── AuthContext.jsx       # AuthProvider + useAuth hook
│       │
│       ├── hooks/
│       │   ├── useChapter.js         # Fetch current chapter details
│       │   ├── useWeeklyStats.js     # This-week counts (orgs, books, dists, active)
│       │   └── useOrganizations.js   # Fetch/add/update orgs, filter + pagination
│       │
│       ├── components/
│       │   ├── Guard.jsx             # Role-based route protection
│       │   ├── Navbar.jsx            # Auth-aware nav, role badge
│       │   ├── Modal.jsx             # Reusable centered modal wrapper
│       │   ├── ChapterLayout.jsx     # Sidebar + top bar shell for chapter pages
│       │   └── ChapterSidebar.jsx    # 240px nav sidebar, mobile overlay
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
│           └── chapter/
│               ├── Dashboard.jsx     # Chapter lead home — stats, overdue, AI summary, quick actions
│               ├── Tracker.jsx       # Outreach tracker — inline editing, filters, pagination
│               ├── Resources.jsx     # Resource library grouped by category
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
| P4 | Book Inventory + Pipeline | 🔲 Pending |
| P5 | National Admin Views | 🔲 Pending |
| P6 | AI Features + Impact Reports | 🔲 Pending |
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

## Test Count

**0** — no tests written yet.

---

## Known Issues / Technical Debt

- `FOUNDING_CHAPTER_ID` in `portal/src/lib/config.js` is a placeholder — replace with real UUID after the South Brunswick chapter row is created in Supabase
- No tests written yet
- `VITE_GROQ_API_KEY` must be set in Vercel env vars for AI summaries to work
- Bundle is ~506KB gzipped to ~141KB — acceptable for now, can code-split in P8
- `ChapterDashboard.jsx` is a dead file (superseded by `chapter/Dashboard.jsx`) — safe to delete later
