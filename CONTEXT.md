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
│   ├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
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
│       ├── components/
│       │   ├── Guard.jsx             # Role-based route protection
│       │   └── Navbar.jsx            # Auth-aware nav, role badge
│       │
│       └── pages/
│           ├── router.jsx            # createBrowserRouter, all routes
│           ├── Landing.jsx           # Public homepage, live stats RPC
│           ├── Login.jsx             # Sign in, field-level errors
│           ├── Apply.jsx             # Chapter application form
│           ├── AcceptInvite.jsx      # Magic-link → set password flow
│           ├── NotFound.jsx          # 404
│           ├── AdminDashboard.jsx    # national_admin stub (P5)
│           ├── ChapterDashboard.jsx  # chapter_lead stub (P3)
│           └── VolunteerDashboard.jsx # volunteer stub (P4)
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
| P3 | Chapter Dashboard + Outreach Tracker | ⏳ Next |
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

---

## Test Count

**0** — no tests written yet.

---

## Known Issues / Technical Debt

- `FOUNDING_CHAPTER_ID` in `portal/src/lib/config.js` is a placeholder — replace with real UUID after the South Brunswick chapter row is created in Supabase
- No tests written yet
- Groq API key not yet configured — AI features blocked until P6
