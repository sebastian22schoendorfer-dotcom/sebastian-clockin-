import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { StaffForm } from "@/components/admin/staff-form";

type SearchParams = Promise<{ error?: string }>;

export default async function NewStaffPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { error } = await searchParams;
  const sb = createServiceClient();
  const { data: locations } = await sb.from("locations").select("id, name")
    .eq("tenant_id", ctx.tenant_id).is("soft_deleted_at", null).order("name");
  if (!locations || locations.length === 0) {
    return (
      <main className="p-8">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">New staff</h1>
        <p className="text-muted-foreground">
          Create at least one location first — every staff member needs a primary location.
        </p>
      </main>
    );
  }
  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">New staff</h1>
      <StaffForm locations={locations as { id: string; name: string }[]} error={error} />
    </main>
  );
}
