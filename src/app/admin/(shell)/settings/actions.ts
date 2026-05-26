"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

const HolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2).max(120),
});

export async function addHoliday(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = HolidaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/settings?error=" + encodeURIComponent("Bad holiday input."));
  }
  const sb = createServiceClient();
  const { error } = await sb.from("holidays").insert({
    tenant_id: ctx.tenant_id, date: parsed.data.date, name: parsed.data.name,
  });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

export async function removeHoliday(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/admin/settings");
  const sb = createServiceClient();
  await sb.from("holidays").update({ soft_deleted_at: new Date().toISOString() })
    .eq("id", id).eq("tenant_id", ctx.tenant_id);
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}
