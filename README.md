# Pages for Change Network Portal

The chapter management platform powering the Pages for Change literacy nonprofit network.

## What it is

Multi-tenant web platform where student chapter leads manage outreach, book inventory,
and partnerships for their local chapter. National admins (Zayd Mulani & Affan Shaik)
oversee the full network from a unified dashboard.

## Stack

- React + Vite (frontend)
- Supabase (PostgreSQL + RLS + Auth + Storage)
- Groq AI (impact reports + summaries)
- Vercel (hosting)

## Setup

1. Create a Supabase project and run `schema.sql` in the SQL editor
2. Run `scripts/setup_chapter_001.sql` after creating auth users for the founding team
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Set the Groq API key in your Supabase project securely:
   ```bash
   supabase secrets set GROQ_API_KEY=your_key_here
   ```
5. `cd portal && npm install && npm run dev`

## Data migration

To import the South Brunswick outreach CSV:
```
cd scripts
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python migrate_sheets.py outreach.csv
```

Use `--dry-run` to preview without inserting.

## Chapter leads

Access your dashboard at `pagesforchange.org/portal`

## Founded by

Zayd Mulani & Affan Shaik — Pages for Change, South Brunswick NJ
