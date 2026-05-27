"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPin, PIN_REGEX } from "@/lib/auth/pin";
import { issueStaffSession } from "@/lib/auth/staff-session";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function signInStaff(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const pin = formData.get("pin");

  if (typeof email !== "string" || typeof pin !== "string" || !PIN_REGEX.test(pin)) {
    redirect("/sign-in?error=" + encodeURIComponent("Enter your email and 6-digit PIN."));
  }

  const sb = createServiceClient();
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? null) as string | null;
  const ua = h.get("user-agent");

  const { data: staff } = await sb
    .from("staff")
    .select("id, tenant_id, pin_hash, failed_pin_attempts, locked_until, status")
    .eq("email", email)
    .is("soft_deleted_at", null)
    .maybeSingle();

  const genericError = "/sign-in?error=" + encodeURIComponent("Invalid email or PIN.");

  if (!staff || staff.status !== "ACTIVE") {
    redirect(genericError);
  }

  if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
    await sb.from("login_events").insert({
      tenant_id: staff.tenant_id,
      staff_id: staff.id,
      event_type: "LOGIN_LOCKOUT",
      ip,
      user_agent: ua,
    });
    redirect(
      "/sign-in?error=" +
        encodeURIComponent(`Account is locked. Try again in ${LOCKOUT_MINUTES} minutes.`),
    );
  }

  const ok = await verifyPin(pin, staff.pin_hash);
  if (!ok) {
    const attempts = (staff.failed_pin_attempts ?? 0) + 1;
    const shouldLock = attempts >= MAX_ATTEMPTS;
    await sb
      .from("staff")
      .update({
        failed_pin_attempts: shouldLock ? 0 : attempts,
        locked_until: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
          : null,
      })
      .eq("id", staff.id);

    await sb.from("login_events").insert({
      tenant_id: staff.tenant_id,
      staff_id: staff.id,
      event_type: shouldLock ? "LOGIN_LOCKOUT" : "LOGIN_FAIL",
      ip,
      user_agent: ua,
    });

    redirect(genericError);
  }

  await sb
    .from("staff")
    .update({ failed_pin_attempts: 0, locked_until: null })
    .eq("id", staff.id);

  await sb.from("login_events").insert({
    tenant_id: staff.tenant_id,
    staff_id: staff.id,
    event_type: "LOGIN_OK",
    ip,
    user_agent: ua,
  });

  await issueStaffSession({ staff_id: staff.id, tenant_id: staff.tenant_id });
  redirect("/clock");
}
