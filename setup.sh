#!/bin/bash
# ClockIn Bonaire — Milestone 0 scaffold installer.
# Run this from inside your local clone of sebastian-clockin-.
# It creates ~28 project files. Safe to re-run.

set -e

if [ ! -d ".git" ]; then
  echo "ERROR: This script must be run from the root of your git clone of sebastian-clockin-."
  echo "Current directory: $(pwd)"
  exit 1
fi

echo "Creating directories..."
mkdir -p src/app src/lib/geo src/lib/supabase src/i18n messages public docs supabase/migrations scripts test e2e .github/workflows

echo "Writing .gitignore..."
cat > .gitignore <<'GITIGNORE_EOF'
node_modules/
.pnp
.pnp.js

.next/
out/
build/
dist/

*.tsbuildinfo
next-env.d.ts

.DS_Store
*.pem

npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

.env
.env.local
.env.development.local
.env.test.local
.env.production.local

.vercel

coverage/
playwright-report/
test-results/
.playwright/

.vscode/
.idea/

supabase/.branches
supabase/.temp
supabase/.env
GITIGNORE_EOF

echo "Writing .env.example..."
cat > .env.example <<'ENV_EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-me
SUPABASE_SERVICE_ROLE_KEY=replace-me

OWNER_EMAIL=owner@example.com
OWNER_INITIAL_PASSWORD=changeme-on-first-login

NEXT_PUBLIC_APP_URL=http://localhost:3000

RESEND_API_KEY=
EMAIL_FROM="ClockIn <no-reply@example.com>"

TOTP_ISSUER=ClockIn Bonaire

STAFF_SESSION_TTL_MIN=720
ADMIN_SESSION_TTL_MIN=60

CLOCK_RATE_LIMIT_PER_3S=1
ENV_EOF

echo "Writing README.md..."
cat > README.md <<'README_EOF'
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
README_EOF

echo "Writing package.json..."
cat > package.json <<'PKG_EOF'
{
  "name": "clockin-bonaire",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:install": "playwright install --with-deps chromium",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.10",
    "@react-pdf/renderer": "^4.1.6",
    "argon2": "^0.41.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "leaflet": "^1.9.4",
    "next": "15.1.3",
    "next-intl": "^3.26.3",
    "otplib": "^12.0.1",
    "papaparse": "^5.4.1",
    "qrcode": "^1.5.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-leaflet": "^5.0.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "15.1.3",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "prettier": "^3.4.2",
    "supabase": "^1.226.4",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
PKG_EOF

echo "Writing tsconfig.json..."
cat > tsconfig.json <<'TS_EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
TS_EOF

echo "Writing .eslintrc.json..."
cat > .eslintrc.json <<'ESLINT_EOF'
{
  "extends": ["next/core-web-vitals", "next/typescript"]
}
ESLINT_EOF

echo "Writing .prettierrc.json..."
cat > .prettierrc.json <<'PRETTIER_EOF'
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
PRETTIER_EOF

echo "Writing next.config.ts..."
cat > next.config.ts <<'NEXT_EOF'
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["argon2", "@react-pdf/renderer"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
NEXT_EOF

echo "Writing tailwind.config.ts..."
cat > tailwind.config.ts <<'TAILWIND_EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        kitchen: { DEFAULT: "hsl(var(--kitchen))", foreground: "hsl(var(--kitchen-foreground))" },
        service: { DEFAULT: "hsl(var(--service))", foreground: "hsl(var(--service-foreground))" },
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
TAILWIND_EOF

echo "Writing postcss.config.mjs..."
cat > postcss.config.mjs <<'POSTCSS_EOF'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
POSTCSS_EOF

echo "Writing playwright.config.ts..."
cat > playwright.config.ts <<'PW_EOF'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    locale: "en-US",
    timezoneId: "America/Kralendijk",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-android", use: { ...devices["Pixel 5"] } },
    { name: "mobile-ios", use: { ...devices["iPhone 13"] } },
  ],
});
PW_EOF

echo "Writing vitest.config.ts..."
cat > vitest.config.ts <<'VITEST_EOF'
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
VITEST_EOF

echo "Writing test/setup.ts..."
cat > test/setup.ts <<'TESTSETUP_EOF'
import "@testing-library/jest-dom/vitest";
TESTSETUP_EOF

echo "Writing e2e/.gitkeep..."
echo "placeholder" > e2e/.gitkeep

echo "Writing messages/en.json..."
cat > messages/en.json <<'EN_EOF'
{
  "app": { "name": "ClockIn", "tagline": "Restaurant time-clock for Bonaire" },
  "common": { "signIn": "Sign in", "signOut": "Sign out", "cancel": "Cancel", "save": "Save", "loading": "Loading…" },
  "clock": {
    "clockIn": "Clock In",
    "clockOut": "Clock Out",
    "breakStart": "Start Break",
    "breakEnd": "End Break",
    "outOfZone": "You are {distance} m from {location}. Request manager override?",
    "requestOverride": "Request manager override",
    "lowAccuracy": "GPS accuracy too low. Move outside or wait a moment, then try again.",
    "pendingSync": "Saved offline — will sync when back online."
  },
  "errors": { "generic": "Something went wrong. Please try again." }
}
EN_EOF

echo "Writing messages/es.json..."
cat > messages/es.json <<'ES_EOF'
{
  "app": { "name": "ClockIn", "tagline": "Control horario para restaurantes en Bonaire" },
  "common": { "signIn": "Iniciar sesión", "signOut": "Cerrar sesión", "cancel": "Cancelar", "save": "Guardar", "loading": "Cargando…" },
  "clock": {
    "clockIn": "Entrar",
    "clockOut": "Salir",
    "breakStart": "Iniciar descanso",
    "breakEnd": "Terminar descanso",
    "outOfZone": "Estás a {distance} m de {location}. ¿Solicitar autorización del supervisor?",
    "requestOverride": "Solicitar autorización",
    "lowAccuracy": "Precisión GPS insuficiente.",
    "pendingSync": "Guardado sin conexión — se sincronizará al volver a la red."
  },
  "errors": { "generic": "Algo salió mal." }
}
ES_EOF

echo "Writing src/i18n/request.ts..."
cat > src/i18n/request.ts <<'I18N_EOF'
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

function pickLocale(value: string | null | undefined): Locale {
  if (value && (SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("locale")?.value;
  const headerLocale = (await headers()).get("x-locale");
  const locale = pickLocale(cookieLocale ?? headerLocale);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "America/Kralendijk",
    now: new Date(),
  };
});
I18N_EOF

echo "Writing src/lib/utils.ts..."
cat > src/lib/utils.ts <<'UTILS_EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
UTILS_EOF

echo "Writing src/lib/geo/haversine.ts..."
cat > src/lib/geo/haversine.ts <<'HAV_EOF'
// Distance between two WGS84 points using the Haversine formula.
// Client-side preview; the server is the source of truth via PostGIS.
const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
HAV_EOF

echo "Writing src/lib/geo/haversine.test.ts..."
cat > src/lib/geo/haversine.test.ts <<'HAVTEST_EOF'
import { describe, expect, it } from "vitest";
import { haversineMeters } from "./haversine";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    const p = { lat: 12.15, lng: -68.27 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it("computes ~3 km between two Bonaire fixtures", () => {
    const waterfront = { lat: 12.1456, lng: -68.2693 };
    const hato = { lat: 12.1733, lng: -68.2778 };
    const d = haversineMeters(waterfront, hato);
    expect(d).toBeGreaterThan(2950);
    expect(d).toBeLessThan(3250);
  });

  it("is symmetric", () => {
    const a = { lat: 12.15, lng: -68.27 };
    const b = { lat: 12.16, lng: -68.26 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 5);
  });
});
HAVTEST_EOF

echo "Writing src/lib/supabase/.gitkeep..."
echo "placeholder" > src/lib/supabase/.gitkeep

echo "Writing src/app/globals.css..."
cat > src/app/globals.css <<'CSS_EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --border: 214 32% 91%;
    --kitchen: 25 95% 53%;
    --kitchen-foreground: 0 0% 100%;
    --service: 217 91% 60%;
    --service-foreground: 0 0% 100%;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground antialiased; }
}
CSS_EOF

echo "Writing src/app/layout.tsx..."
cat > src/app/layout.tsx <<'LAYOUT_EOF'
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClockIn — Restaurant time-clock",
  description: "Staff time-clock and payroll overview for Bonaire restaurants.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
LAYOUT_EOF

echo "Writing src/app/page.tsx..."
cat > src/app/page.tsx <<'PAGE_EOF'
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("app");
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("name")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Foundations scaffolded. Auth, locations, staff, and clock loop come next.
      </p>
    </main>
  );
}
PAGE_EOF

echo "Writing public/manifest.webmanifest..."
cat > public/manifest.webmanifest <<'MANIFEST_EOF'
{
  "name": "ClockIn — Restaurant time-clock",
  "short_name": "ClockIn",
  "description": "Staff time-clock and payroll overview for Bonaire restaurants.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
MANIFEST_EOF

echo "Writing supabase/config.toml..."
cat > supabase/config.toml <<'SUPABASE_EOF'
project_id = "clockin-bonaire"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[realtime]
enabled = true

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 3600
enable_signup = false

[storage]
enabled = true
file_size_limit = "10MiB"

[inbucket]
enabled = true
port = 54324
SUPABASE_EOF

echo "Writing supabase/migrations/00000000000000_extensions.sql..."
cat > supabase/migrations/00000000000000_extensions.sql <<'MIGRATION_EOF'
-- Foundational extensions. Schema, tables, and RLS land in Milestone 1.
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "citext";
MIGRATION_EOF

echo "Writing scripts/seed.ts..."
cat > scripts/seed.ts <<'SEED_EOF'
// Seed script — placeholder for Milestone 1.
console.log("[seed] Placeholder. Schema + seed will be implemented in Milestone 1.");
console.log("[seed] See docs/decisions.md for the locked design decisions.");
SEED_EOF

echo "Writing .github/workflows/ci.yml..."
cat > .github/workflows/ci.yml <<'CI_EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
CI_EOF

echo "Writing docs/decisions.md..."
cat > docs/decisions.md <<'DECISIONS_EOF'
# Decisions Log — MVP

Living document. Each entry is a decision we've locked, the reasoning, and any nuance worth remembering.

## 2026-05-26 — 15 spec ambiguities resolved

| # | Topic | Decision |
|---|---|---|
| 1 | Staff login identifier | **Real email + 6-digit PIN.** Every staff record must have a unique email. PIN stored argon2id-hashed. |
| 2 | Override notification stack | **Email only for MVP.** Resend (or SMTP) for supervisor + owner. Web Push deferred. |
| 3 | Overtime calculation basis | **Configurable per contract from day one.** Each contract picks weekly-only (>40h × 1.5), daily-only (>9h × 1.5), or both-whichever-greater. Public-holiday and weekly-rest-day hours always uplifted regardless. Multiplier stored on contract. |
| 4 | Override approval behaviour | **Auto-create clock-in at the approval timestamp**, flagged `MANAGER_OVERRIDE`. Staff does not need to re-tap. |
| 5 | GPS accuracy gate | **Hard gate at ≤50 m.** Staff must retry until they get a good fix. Failed-accuracy attempts logged but do not create a `clock_events` row. |
| 6 | Owner bootstrap | **Seed script (`npm run seed`) creates the tenant + owner row + a one-time enrollment link printed to console.** Owner clicks, sets password, scans TOTP QR. Enrollment token expires after 24 h. |
| 7 | PIN lockout policy | **5 fails → 15-minute cooldown.** Counter resets on success or after cooldown. Both `LOGIN_FAIL` and `LOGIN_LOCKOUT` recorded in `login_events`. |
| 8 | Auto clock-out source | **At 12 h open, ping a manager (supervisor + owner) for permission to close, with an inline picker to set the actual close time.** No silent auto-close. If no manager responds within 24 h, system closes at the 12 h mark with `AUTO_CLOSED` flag. |
| 9 | Contract PDF engine | **`@react-pdf/renderer`** in a Node route handler. Markdown body rendered to PDF components via remark + custom renderer. |
| 10 | Selfies on clock-in | **Removed.** No camera, no `selfie_url`, no storage path. |
| 11 | Minor labor policy | **Only the ≤16 cap** (40 h/week, 8 h/day). 17-year-olds treated as adults. |
| 12 | Deletion model | **Two-tier.** Retention-locked tables (`clock_events`, `timesheets`, `contracts`, `audit_log`, `login_events`) always soft-deleted, retained 5 years, hard delete blocked. All other records get a UI choice: *soft (recoverable for 1 year)* or *hard (immediate purge)*. |
| 13 | Period boundary / midnight | **Business-day boundary at 04:00 location-local.** A "day" runs 04:00–04:00; OT calculated against the business week starting Monday 04:00. |
| 14 | Tenant binding | **JWT claim, single tenant, no switcher UI.** `tenant_id` enforced on every RLS policy via `auth.jwt() ->> 'tenant_id'`. |
| 15 | Hosting | **Greenfield.** Local dev via `supabase start` works end-to-end. Cloud provisioning is the operator's task. |
DECISIONS_EOF

echo "Writing docs/payroll-export.md..."
cat > docs/payroll-export.md <<'PAYROLL_EOF'
# Payroll CSV Export — Column Mapping

> Stub. Final columns land with Milestone 6 (Payroll Overview & Export).

## Per-staff per-period

| Column | Type | Notes |
|---|---|---|
| `staff_id` | uuid | |
| `staff_full_name` | text | |
| `staff_email` | text | |
| `job_role` | enum | `KITCHEN` \| `SERVICE` |
| `contract_type` | enum | `FULL_TIME` \| `PART_TIME` \| `CASUAL` |
| `period_start` | date | inclusive, Bonaire local |
| `period_end` | date | inclusive, Bonaire local |
| `hours_regular` | numeric(6,2) | |
| `hours_overtime` | numeric(6,2) | |
| `hours_holiday` | numeric(6,2) | Subset of OT, paid at uplift |
| `hours_break` | numeric(6,2) | Unpaid |
| `rate_regular_usd` | numeric(6,2) | |
| `rate_overtime_usd` | numeric(6,2) | `rate_regular_usd × multiplier` |
| `pay_gross_usd` | numeric(8,2) | No taxes applied |
| `flags` | text | semicolon-joined |

Encoding: UTF-8 with BOM, CRLF, USD throughout.
PAYROLL_EOF

echo ""
echo "✅ Done. All Milestone 0 scaffold files created."
echo ""
echo "Next, run these commands one at a time to push to GitHub:"
echo "  git checkout -b claude/brave-goldberg-rBEsn"
echo "  git add ."
echo "  git commit -m 'chore: scaffold Milestone 0 foundations'"
echo "  git push -u origin claude/brave-goldberg-rBEsn"
