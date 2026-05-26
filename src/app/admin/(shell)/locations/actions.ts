"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

const LocationSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(240).optional().nullable(),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radius_m: z.coerce.number().int().gte(25).lte(1000),
  business_day_starts_at: z.string().regex(/^\d{2}:\d{2}$/).default("04:00"),
  timezone: z.string().default("America/Kralendijk"),
});

export async function createLocation(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = LocationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/locations/new?error=" + encodeURIComponent(parsed.error.issues.map(i => i.message).join("; ")));
  }
  const sb = createServiceClient();
  const { error } = await sb.from("locations").insert({
    tenant_id: ctx.tenant_id,
    name: parsed.data.name,
    address: parsed.data.address || null,
    point: `SRID=4326;POINT(${parsed.data.lng} ${parsed.data.lat})`,
    radius_m: parsed.data.radius_m,
    business_day_starts_at: parsed.data.business_day_starts_at,
    timezone: parsed.data.timezone,
  });
  if (error) {
    redirect("/admin/locations/new?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function updateLocation(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/admin/locations");
  const parsed = LocationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/locations/${id}?error=` + encodeURIComponent(parsed.error.issues.map(i => i.message).join("; ")));
  }
  const sb = createServiceClient();
  const { error } = await sb.from("locations").update({
    name: parsed.data.name,
    address: parsed.data.address || null,
    point: `SRID=4326;POINT(${parsed.data.lng} ${parsed.data.lat})`,
    radius_m: parsed.data.radius_m,
    business_day_starts_at: parsed.data.business_day_starts_at,
    timezone: parsed.data.timezone,
  }).eq("id", id).eq("tenant_id", ctx.tenant_id);
  if (error) {
    redirect(`/admin/locations/${id}?error=` + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function softDeleteLocation(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/admin/locations");
  const sb = createServiceClient();
  await sb.from("locations").update({ soft_deleted_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", ctx.tenant_id);
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}
