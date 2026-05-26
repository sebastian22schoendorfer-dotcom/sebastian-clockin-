import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { softDeleteStaff } from "./actions";

type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  job_role: "KITCHEN" | "SERVICE";
  contract_type: "FULL_TIME" | "PART_TIME" | "CASUAL";
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  primary_location_name: string | null;
};

const ROLE_LABEL: Record<StaffRow["job_role"], string> = { KITCHEN: "Kitchen", SERVICE: "Service" };
const CONTRACT_LABEL: Record<StaffRow["contract_type"], string> = {
  FULL_TIME: "Full time", PART_TIME: "Part time", CASUAL: "Casual",
};

export default async function StaffPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const { data } = await sb.from("staff").select(
    `id, full_name, email, job_role, contract_type, status,
     staff_locations(is_primary, locations(name))`,
  ).eq("tenant_id", ctx.tenant_id).is("soft_deleted_at", null).order("full_name");

  type Raw = {
    id: string;
    full_name: string;
    email: string;
    job_role: StaffRow["job_role"];
    contract_type: StaffRow["contract_type"];
    status: StaffRow["status"];
    staff_locations: { is_primary: boolean; locations: { name: string } | null }[];
  };

  const staff: StaffRow[] = (data as unknown as Raw[] | null ?? []).map((row) => {
    const primary = row.staff_locations?.find((l) => l.is_primary);
    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      job_role: row.job_role,
      contract_type: row.contract_type,
      status: row.status,
      primary_location_name: primary?.locations?.name ?? null,
    };
  });

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Staff</h1>
        <Link href="/admin/staff/new"><Button>New staff</Button></Link>
      </div>

      {staff.length === 0 ? (
        <p className="text-muted-foreground">No staff yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell><RoleBadge role={s.job_role} /></TableCell>
                <TableCell>{CONTRACT_LABEL[s.contract_type]}</TableCell>
                <TableCell className="text-muted-foreground">{s.primary_location_name ?? "—"}</TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/staff/${s.id}`} className="text-sm underline">Edit</Link>
                    <form action={softDeleteStaff} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-sm text-destructive underline">Archive</button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

function RoleBadge({ role }: { role: StaffRow["job_role"] }) {
  const color = role === "KITCHEN" ? "bg-kitchen text-kitchen-foreground" : "bg-service text-service-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}
