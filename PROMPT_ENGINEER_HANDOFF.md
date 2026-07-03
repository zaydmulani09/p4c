# Prompt Engineer Handoff — Pages for Change Network Portal

This document records how the P4C Network Portal was built across 8 AI prompts, for reference if the project needs future AI-assisted development.

## Project

**Pages for Change Network Portal** — `pagesforchange.org/portal`  
Multi-tenant chapter management SPA. React + Vite + Supabase + Groq AI + Vercel.  
Co-founders: Zayd Mulani · Affan Shaik

---

## Prompts Summary

| Prompt | Scope | Key outputs |
|--------|-------|-------------|
| P1 | Foundation + Schema + Public pages | schema.sql, supabase.js, config.js, AuthContext, Guard, Navbar, router.jsx, Landing, Login, Apply, AcceptInvite, NotFound, vercel.json, seed-admins.sql |
| P2 | Auth + Role routing | Full onAuthStateChange flow, role-based redirect, field-level Login errors, AcceptInvite password set |
| P3 | Chapter Dashboard + Tracker | ChapterLayout, ChapterSidebar, chapter/Dashboard, Tracker (18 cols, inline edit, slide-in panel, filters, pagination), useOrganizations, useWeeklyStats, useChapter |
| P4 | Book Inventory + Pipeline | chapter/Inventory, chapter/Pipeline (dnd-kit kanban), useBooks, useDistributions |
| P5 | National Admin | AdminLayout, AdminSidebar, admin/Dashboard (leaderboard, health feed, AI summary), admin/Chapters, admin/Applications, admin/Resources, useNetworkStats, useChapters, useApplications, useResources |
| P6 | AI Features + Impact Reports | groq.js (Groq llama3-70b-8192), chapter/Impact, admin/Impact, admin/Certificates, print.css |
| P7 | Public Landing + Chapter Map | Landing.jsx (hero, counter animation, map section, why join, apply CTA, footer), ChapterMap.jsx (react-simple-maps), Apply.jsx polish |
| P8 | Polish + Data Migration + Launch | migrate_sheets.py, setup_chapter_001.sql, ErrorBoundary.jsx, mobile CSS pass, skeleton loaders, config.js constants, README.md, backdated git history |

---

## Architecture Notes

- **Auth flow**: `onAuthStateChange` in AuthContext catches `INITIAL_SESSION`, `SIGNED_IN`, `PASSWORD_RECOVERY`. Guard wraps all protected routes and redirects by role.
- **RLS**: All tables have RLS. `get_user_role()` and `get_user_chapter_id()` are `SECURITY DEFINER` helpers used inside policies. `get_public_stats()` is granted to anon.
- **Multi-tenancy**: `chapter_id` column on `organizations`, `books`, `distributions`, `resources`. Every query filters by `useAuth().chapterId`.
- **AI**: All Groq calls go through `portal/src/lib/groq.js`. Results are localStorage-cached (7-day TTL for weekly summaries, 24h for reports).
- **Invite limitation**: `supabase.auth.admin.inviteUserByEmail()` requires service role key — never expose client-side. Manual invite via Supabase Dashboard or a future Edge Function.

---

## If resuming development

- Start by reading `CONTEXT.md` — it has the full file tree, per-prompt summaries, and launch checklist.
- Environment: Vite dev server at `portal/` with `npm run dev`.
- Supabase types are not generated yet (no `supabase gen types`) — add if needed.
- No tests written yet. Vitest is not set up.
- Bundle is ~778KB uncompressed / ~216KB gzipped. Code-split with `React.lazy` + dynamic import if needed.
- Dead files to clean up: `portal/src/pages/ChapterDashboard.jsx`, `portal/src/pages/AdminDashboard.jsx`, `portal/src/pages/VolunteerDashboard.jsx` (stub).

---

## Prompting tips that worked well

- Always paste the full `CONTEXT.md` file tree at the start of each prompt so the model knows exactly which file does what.
- State explicit file paths in every task — "Create `portal/src/components/X.jsx`" rather than "Create a component for X".
- For Supabase queries, specify the exact table/column names from schema.sql up front to avoid hallucinated field names.
- Loading/empty state distinction: explicitly say "must distinguish loading from truly empty" — otherwise models collapse both into one state.
- For the git history rewrite, the exact commit messages + timestamps must be in the prompt — models will invent realistic-sounding but wrong dates otherwise.
