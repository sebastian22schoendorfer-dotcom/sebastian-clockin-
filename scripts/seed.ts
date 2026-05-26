import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";

const SUPABASE_URL = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = mustEnv("NEXT_PUBLIC_APP_URL");
const OWNER_EMAIL = mustEnv("OWNER_EMAIL");
const TENANT_NAME = process.env.TENANT_NAME ?? "Kralendijk Restaurant Group";
const TENANT_SLUG = process.env.TENANT_SLUG ?? "kralendijk";

const ENROLLMENT_TTL_HOURS = 24;

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}. See .env.example.`);
    process.exit(1);
  }
  return v;
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("→ Seeding ClockIn Bonaire");

  const { data: existing } = await sb
    .from("tenants")
    .select("id")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();

  if (existing) {
    console.log(`✓ Tenant '${TENANT_SLUG}' already exists (${existing.id}). Skipping.`);
    return;
  }

  const { data: tenant, error: tErr } = await sb
    .from("tenants")
    .insert({ name: TENANT_NAME, slug: TENANT_SLUG })
    .select("id")
    .single();
  if (tErr || !tenant) throw tErr ?? new Error("tenant insert failed");
  const tenantId: string = tenant.id;
  console.log(`✓ Tenant created: ${tenantId}`);

  const { data: authUser, error: aErr } = await sb.auth.admin.createUser({
    email: OWNER_EMAIL,
    email_confirm: true,
    app_metadata: { tenant_id: tenantId, role: "OWNER" },
    user_metadata: { full_name: "Restaurant Owner" },
  });
  if (aErr || !authUser?.user) throw aErr ?? new Error("auth user creation failed");
  console.log(`✓ Auth user: ${authUser.user.id}`);

  const { error: uErr } = await sb.from("app_users").insert({
    id: authUser.user.id,
    tenant_id: tenantId,
    email: OWNER_EMAIL,
    full_name: "Restaurant Owner",
    role: "OWNER",
  });
  if (uErr) throw uErr;

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });
  const expiresAt = new Date(Date.now() + ENROLLMENT_TTL_HOURS * 3600_000);

  const { error: eErr } = await sb.from("enrollment_tokens").insert({
    tenant_id: tenantId,
    app_user_id: authUser.user.id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
  if (eErr) throw eErr;

  const { error: lErr } = await sb.from("locations").insert([
    {
      tenant_id: tenantId,
      name: "Kralendijk Waterfront",
      address: "Kaya J.N.E. Craane, Kralendijk",
      point: "SRID=4326;POINT(-68.2693 12.1456)",
      radius_m: 75,
    },
    {
      tenant_id: tenantId,
      name: "Hato",
      address: "Kaya Gob. N. Debrot, Hato",
      point: "SRID=4326;POINT(-68.2778 12.1733)",
      radius_m: 75,
    },
  ]);
  if (lErr) throw lErr;
  console.log("✓ Sample locations: Kralendijk Waterfront, Hato");

  const bes2026 = [
    ["2026-01-01", "New Year's Day"],
    ["2026-02-16", "Carnival Monday"],
    ["2026-04-03", "Good Friday"],
    ["2026-04-06", "Easter Monday"],
    ["2026-04-27", "King's Day"],
    ["2026-05-01", "Labour Day"],
    ["2026-05-14", "Ascension Day"],
    ["2026-09-06", "Bonaire Day"],
    ["2026-12-15", "Kingdom Day"],
    ["2026-12-25", "Christmas Day"],
    ["2026-12-26", "Boxing Day"],
  ] as const;
  const { error: hErr } = await sb.from("holidays").insert(
    bes2026.map(([date, name]) => ({ tenant_id: tenantId, date, name })),
  );
  if (hErr) throw hErr;
  console.log(`✓ ${bes2026.length} BES public holidays`);

  const enrollmentUrl = `${APP_URL}/enroll?token=${rawToken}`;
  console.log("");
  console.log("════════════════════════════════════════════════════════════");
  console.log("OWNER ENROLLMENT — single-use link, expires in 24 hours:");
  console.log("");
  console.log(`  ${enrollmentUrl}`);
  console.log("");
  console.log("════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
