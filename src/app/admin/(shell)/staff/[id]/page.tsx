import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { StaffForm } from "@/components/admin/staff-form";
import { resetPin } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; new_pin?: string }>;

export default async function EditStaffPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const { error, new_pin } = await searchParams;
  const sb = createServiceClient();

  const { data: staffRow } = await sb.from("staff").select(
    `id, full_name, email, job_role, contract_type, date_of_birth, status,
     staff_locations(is_primary, location_id)`,
  ).eq("id", id).eq("tenant_id", ctx.tenant_id).is("soft_deleted_at", null).maybeSingle();

  if (!staffRow) notFound();

  const { data: locations } = await sb.from("locations").select("id, name")
    .eq("tenant_id", ctx.tenant_id).is("soft_deleted_at", null).order("name");

  const primary = (staffRow.staff_locations as { is_primary: boolean; location_id: string }[] | null)
    ?.find((l) => l.is_primary) ?? null;

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Edit staff</h1>

      {new_pin && (
        <Card>
          <CardHeader>
            <CardTitle>
              New PIN: <code className="ml-2 rounded bg-secondary px-2 py-1 text-2xl tracking-widest">{new_pin}</code>
            </CardTitle>
            <CardDescription>
              Show this PIN to the staff member now — it won't be displayed again. Refresh this
              page after they've recorded it.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <StaffForm
        initial={{
          id: staffRow.id as string,
          full_name: staffRow.full_name as string,
          email: staffRow.email as string,
          job_role: staffRow.job_role as "KITCHEN" | "SERVICE",
          contract_type: staffRow.contract_type as "FULL_TIME" | "PART_TIME" | "CASUAL",
          date_of_birth: staffRow.date_of_birth as string,
          status: staffRow.status as "ACTIVE" | "SUSPENDED" | "ARCHIVED",
          primary_location_id: primary?.location_id ?? "",
        }}
        locations={(locations ?? []) as { id: string; name: string }[]}
        error={error}
      />

      <Card>
        <CardHeader>
          <CardTitle>PIN reset</CardTitle>
          <CardDescription>
            Generates a fresh 6-digit PIN and clears any active lockout. Old PIN stops working immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={resetPin}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-sm font-medium text-destructive underline">Reset PIN</button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
