import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  rate_regular_usd: number;
  effective_from: string;
  effective_to: string | null;
  ot_policy: { basis: string; multiplier: number; weekly_threshold_h: number; daily_threshold_h: number };
  staff: { full_name: string } | null;
  locations: { name: string } | null;
};

export default async function ContractsPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const { data } = await sb.from("contracts").select(
    "id, rate_regular_usd, effective_from, effective_to, ot_policy, staff(full_name), locations(name)",
  ).eq("tenant_id", ctx.tenant_id).is("soft_deleted_at", null).order("effective_from", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Contracts</h1>
        <Link href="/admin/contracts/new"><Button>New contract</Button></Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No contracts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>OT policy</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.staff?.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.locations?.name ?? "—"}</TableCell>
                <TableCell>${r.rate_regular_usd.toFixed(2)}/h</TableCell>
                <TableCell className="text-xs text-muted-foreground">{policySummary(r.ot_policy)}</TableCell>
                <TableCell>{r.effective_from} → {r.effective_to ?? "open"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

function policySummary(p: Row["ot_policy"]): string {
  const basis =
    p.basis === "weekly" ? `weekly >${p.weekly_threshold_h}h` :
    p.basis === "daily" ? `daily >${p.daily_threshold_h}h` :
    `weekly >${p.weekly_threshold_h}h or daily >${p.daily_threshold_h}h`;
  return `${basis} × ${p.multiplier}`;
}
