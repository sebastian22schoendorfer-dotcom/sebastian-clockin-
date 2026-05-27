"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

const AddSchema = z.object({
  staff_id: z.string().uuid(),
  location_id: z.string().uuid(),
  type: z.enum(["IN", "OUT", "BREAK_START", "BREAK_END"]),
  event_at: z.string(),
  note: z.string().max(200).optional(),
});

export async function addManualEvent(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = AddSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/staff/${formData.get("staff_id")}/timecard?error=` +
      encodeURIComponent("Invalid input."));
  }

  const sb = createServiceClient();
  const eventAtIso = new Date(parsed.data.event_at).toISOString();

  const { data: row, error } = await sb.from("clock_events").insert({
    tenant_id: ctx.tenant_id,
    staff_id: parsed.data.staff_id,
    location_id: parsed.data.location_id,
    type: parsed.data.type,
    event_at: eventAtIso,
    flags: ["ADMIN_MANUAL"],
  }).select("id").single();

  if (error || !row) {
    redirect(`/admin/staff/${parsed.data.staff_id}/timecard?error=` +
      encodeURIComponent(error?.message ?? "Insert failed."));
  }

  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "clock_event.create_manual",
    target_table: "clock_events",
    target_id: row.id,
    after: { type: parsed.data.type, event_at: eventAtIso, note: parsed.data.note ?? null },
  });

  revalidatePath(`/admin/staff/${parsed.data.staff_id}/timecard`);
  revalidatePath("/admin");
  redirect(`/admin/staff/${parsed.data.staff_id}/timecard`);
}

const EditSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  event_at: z.string(),
});

export async function editEventTime(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = EditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/staff/${formData.get("staff_id")}/timecard?error=` +
      encodeURIComponent("Invalid input."));
  }

  const sb = createServiceClient();
  const eventAtIso = new Date(parsed.data.event_at).toISOString();

  const { data: before } = await sb.from("clock_events")
    .select("event_at, type, flags")
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenant_id)
    .maybeSingle();

  const newFlags = [...(before?.flags ?? []), "ADMIN_EDITED"].filter((v, i, a) => a.indexOf(v) === i);

  const { error } = await sb.from("clock_events")
    .update({ event_at: eventAtIso, flags: newFlags })
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenant_id);

  if (error) {
    redirect(`/admin/staff/${parsed.data.staff_id}/timecard?error=` +
      encodeURIComponent(error.message));
  }

  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "clock_event.edit_time",
    target_table: "clock_events",
    target_id: parsed.data.id,
    before: { event_at: before?.event_at },
    after: { event_at: eventAtIso },
  });

  revalidatePath(`/admin/staff/${parsed.data.staff_id}/timecard`);
  revalidatePath("/admin");
  redirect(`/admin/staff/${parsed.data.staff_id}/timecard`);
}

const DeleteSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
});

export async function softDeleteEvent(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = DeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin");

  const sb = createServiceClient();
  const { error } = await sb.from("clock_events")
    .update({ soft_deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenant_id);

  if (error) {
    redirect(`/admin/staff/${parsed.data.staff_id}/timecard?error=` +
      encodeURIComponent(error.message));
  }

  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "clock_event.soft_delete",
    target_table: "clock_events",
    target_id: parsed.data.id,
  });

  revalidatePath(`/admin/staff/${parsed.data.staff_id}/timecard`);
  redirect(`/admin/staff/${parsed.data.staff_id}/timecard`);
}
