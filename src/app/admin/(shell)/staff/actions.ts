"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePin } from "@/lib/auth/generate-pin";
import { hashPin } from "@/lib/auth/pin";

const StaffSchema = z.object({
  email: z.string().email().max(160),
  full_name: z.string().min(2).max(160),
  job_role: z.enum(["KITCHEN", "SERVICE"]),
  contract_type: z.enum(["FULL_TIME", "PART_TIME", "CASUAL"]),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).default("ACTIVE"),
  primary_location_id: z.string().uuid(),
  rate_regular_usd: z.coerce.number().positive().max(999).optional().or(z.literal("").transform(() => undefined)),
});

export async function createStaff(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = StaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/staff/new?error=" + encodeURIComponent(parsed.error.issues.map((i) => i.message).join("; ")));
  }
  const sb = createServiceClient();
  const pin = generatePin();
  const pin_hash = await hashPin(pin);
  const { data: staff, error } = await sb.from("staff").insert({
    tenant_id: ctx.tenant_id,
    email: parsed.data.email,
    pin_hash,
    full_name: parsed.data.full_name,
    job_role: parsed.data.job_role,
    contract_type: parsed.data.contract_type,
    date_of_birth: parsed.data.date_of_birth,
    status: parsed.data.status,
  }).select("id").single();
  if (error || !staff) {
    redirect("/admin/staff/new?error=" + encodeURIComponent(error?.message ?? "Insert failed."));
  }

  await sb.from("staff_locations").insert({
    tenant_id: ctx.tenant_id,
    staff_id: staff.id,
    location_id: parsed.data.primary_location_id,
    is_primary: true,
  });

  if (parsed.data.rate_regular_usd && parsed.data.rate_regular_usd > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await sb.from("contracts").insert({
      tenant_id: ctx.tenant_id,
      staff_id: staff.id,
      location_id: parsed.data.primary_location_id,
      rate_regular_usd: parsed.data.rate_regular_usd,
      effective_from: today,
    });
  }

  revalidatePath("/admin/staff");
  redirect(`/admin/staff/${staff.id}?new_pin=${pin}`);
}

const StaffUpdateSchema = StaffSchema.extend({ id: z.string().uuid() });

export async function updateStaff(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = StaffUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/staff?error=" + encodeURIComponent("Invalid form data."));
  }
  const sb = createServiceClient();
  const { error } = await sb.from("staff").update({
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    job_role: parsed.data.job_role,
    contract_type: parsed.data.contract_type,
    date_of_birth: parsed.data.date_of_birth,
    status: parsed.data.status,
  }).eq("id", parsed.data.id).eq("tenant_id", ctx.tenant_id);
  if (error) {
    redirect(`/admin/staff/${parsed.data.id}?error=` + encodeURIComponent(error.message));
  }
  await sb.from("staff_locations").update({ is_primary: false }).eq("staff_id", parsed.data.id);
  await sb.from("staff_locations").upsert({
    tenant_id: ctx.tenant_id,
    staff_id: parsed.data.id,
    location_id: parsed.data.primary_location_id,
    is_primary: true,
  }, { onConflict: "staff_id,location_id" });
  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

export async function resetPin(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/admin/staff");
  const pin = generatePin();
  const pin_hash = await hashPin(pin);
  const sb = createServiceClient();
  const { error } = await sb.from("staff").update({
    pin_hash, failed_pin_attempts: 0, locked_until: null,
  }).eq("id", id).eq("tenant_id", ctx.tenant_id);
  if (error) {
    redirect(`/admin/staff/${id}?error=` + encodeURIComponent(error.message));
  }
  redirect(`/admin/staff/${id}?new_pin=${pin}`);
}

export async function softDeleteStaff(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/admin/staff");
  const sb = createServiceClient();
  await sb.from("staff").update({
    soft_deleted_at: new Date().toISOString(),
    status: "ARCHIVED",
  }).eq("id", id).eq("tenant_id", ctx.tenant_id);
  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}
