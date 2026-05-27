import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { LocationForm, type LocationFormInitial } from "@/components/admin/location-form";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditLocationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const sb = createServiceClient();
  const { data } = await sb.rpc("admin_get_location", { p_tenant_id: ctx.tenant_id, p_id: id });
  const row = (data?.[0] ?? null) as LocationFormInitial | null;
  if (!row) notFound();
  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Edit location</h1>
      <LocationForm initial={{ ...row, id }} error={error} />
    </main>
  );
}
