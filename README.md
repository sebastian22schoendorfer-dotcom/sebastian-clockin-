# ClockIn Bonaire

Restaurant staff time-clock and payroll-overview app for a Bonaire (BES Islands) operator running 2–5 locations and 50–100 staff. PWA, mobile-first, USD, EN + ES, BES Labour Act-aware.

> Status: **Milestone 0 — Foundations.** Schema, RLS, auth, and the clock loop arrive in subsequent milestones. Read `docs/decisions.md` for locked design decisions.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + PostGIS + Auth + Storage), RLS from day one
- PWA, IndexedDB offline queue
- `next-intl` (EN, ES)
- Vitest (unit) + Playwright (e2e)
- Leaflet + OpenStreetMap (drop-pin)

## Local dev

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run seed
npm run dev
```

See `docs/decisions.md` for the 15 locked design decisions.
