"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

const ApproveSchema = z.object({ id: z.string().uuid() });
const RejectSchema = z.object({
  id: z.string().uuid(),
  rejection_reason: z.string().max(500).optional(),
});

export async function approveOverride(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = ApproveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/overrides");

  const sb = createServiceClient();
  const { data: req } = await sb.from("override_requests")
    .select("id, staff_id, requested_location_id, requested_event_type, lat, lng, accuracy_m, distance_m, status")
    .eq("id", parsed.data.id).eq("tenant_id", ctx.tenant_id).maybeSingle();

  if (!req || req.status !== "PENDING") {
    redirect("/admin/overrides?error=" + encodeURIComponent("Override request not found or already resolved."));
  }

  const approvedAt = new Date().toISOString();
  const { data: event, error: evErr } = await sb.from("clock_events").insert({
    tenant_id: ctx.tenant_id,
    staff_id: req.staff_id,
    location_id: req.requested_location_id,
    type: req.requested_event_type,
    event_at: approvedAt,
    lat: req.lat,
    lng: req.lng,
    accuracy_m: req.accuracy_m,
    distance_m: req.distance_m,
    flags: ["MANAGER_OVERRIDE"],
  }).select("id").single();

  if (evErr || !event) {
    redirect("/admin/overrides?error=" + encodeURIComponent(evErr?.message ?? "Could not create clock event."));
  }

  await sb.from("override_requests").update({
    status: "APPROVED",
    approved_by_user_id: ctx.user_id,
    approved_at: approvedAt,
    approval_clock_event_id: event.id,
  }).eq("id", req.id);

  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "override_request.approve",
    target_table: "override_requests",
    target_id: req.id,
    after: { approval_clock_event_id: event.id, type: req.requested_event_type },
  });

  revalidatePath("/admin/overrides");
  revalidatePath("/admin");
  redirect("/admin/overrides");
}

export async function rejectOverride(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = RejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/overrides");

  const sb = createServiceClient();
  const { error } = await sb.from("override_requests").update({
    status: "REJECTED",
    approved_by_user_id: ctx.user_id,
    approved_at: new Date().toISOString(),
    rejection_reason: parsed.data.rejection_reason ?? null,
  }).eq("id", parsed.data.id).eq("tenant_id", ctx.tenant_id).eq("status", "PENDING");

  if (error) redirect("/admin/overrides?error=" + encodeURIComponent(error.message));

  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "override_request.reject",
    target_table: "override_requests",
    target_id: parsed.data.id,
    after: { rejection_reason: parsed.data.rejection_reason ?? null },
  });

  revalidatePath("/admin/overrides");
  redirect("/admin/overrides");
}
