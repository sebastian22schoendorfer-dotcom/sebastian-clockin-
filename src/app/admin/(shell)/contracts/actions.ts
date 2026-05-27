"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

const ContractSchema = z.object({
  staff_id: z.string().uuid(),
  location_id: z.string().uuid(),
  rate_regular_usd: z.coerce.number().positive().max(999),
  basis: z.enum(["weekly", "daily", "both"]),
  weekly_threshold_h: z.coerce.number().min(20).max(60).default(40),
  daily_threshold_h: z.coerce.number().min(4).max(16).default(9),
  multiplier: z.coerce.number().min(1).max(3).default(1.5),
  holiday_multiplier: z.coerce.number().min(1).max(3).default(1.5),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export async function createContract(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = ContractSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/contracts/new?error=" + encodeURIComponent(parsed.error.issues.map(i => i.message).join("; ")));
  }
  const ot_policy = {
    basis: parsed.data.basis,
    weekly_threshold_h: parsed.data.weekly_threshold_h,
    daily_threshold_h: parsed.data.daily_threshold_h,
    multiplier: parsed.data.multiplier,
    holiday_multiplier: parsed.data.holiday_multiplier,
  };
  const sb = createServiceClient();
  const { error } = await sb.from("contracts").insert({
    tenant_id: ctx.tenant_id,
    staff_id: parsed.data.staff_id,
    location_id: parsed.data.location_id,
    rate_regular_usd: parsed.data.rate_regular_usd,
    ot_policy,
    effective_from: parsed.data.effective_from,
    effective_to: parsed.data.effective_to || null,
  });
  if (error) {
    redirect("/admin/contracts/new?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}
