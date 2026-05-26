"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

const ConfirmSchema = z.object({
  id: z.string().uuid(),
  closed_at: z.string().optional(),
});

export async function confirmClose(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = ConfirmSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/closes");

  const sb = createServiceClient();
  const { data: req } = await sb.from("pending_close_requests")
    .select("id, staff_id, opened_clock_event_id, opened_at, suggested_close_at, status")
    .eq("id", parsed.data.id).eq("tenant_id", ctx.tenant_id).maybeSingle();

  if (!req || req.status !== "PENDING") {
    redirect("/admin/closes?error=" + encodeURIComponent("Close request not found or already resolved."));
  }

  const { data: openEvent } = await sb.from("clock_events").select("location_id")
    .eq("id", req.opened_clock_event_id).maybeSingle();
  if (!openEvent) {
    redirect("/admin/closes?error=" + encodeURIComponent("Open clock event not found."));
  }

  const closedAt = parsed.data.closed_at
    ? new Date(parsed.data.closed_at).toISOString()
    : req.suggested_close_at;

  const { data: outEvent, error: outErr } = await sb.from("clock_events").insert({
    tenant_id: ctx.tenant_id,
    staff_id: req.staff_id,
    location_id: openEvent.location_id,
    type: "OUT",
    event_at: closedAt,
    flags: ["MANAGER_CLOSED"],
  }).select("id").single();

  if (outErr || !outEvent) {
    redirect("/admin/closes?error=" + encodeURIComponent(outErr?.message ?? "Could not create clock event."));
  }

  await sb.from("pending_close_requests").update({
    status: "CLOSED",
    closed_at: new Date().toISOString(),
    closed_by_user_id: ctx.user_id,
    resolution_clock_event_id: outEvent.id,
  }).eq("id", req.id);

  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "pending_close_request.confirm",
    target_table: "pending_close_requests",
    target_id: req.id,
    after: { resolution_clock_event_id: outEvent.id, closed_at: closedAt },
  });

  revalidatePath("/admin/closes");
  redirect("/admin/closes");
}
