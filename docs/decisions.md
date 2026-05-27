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
