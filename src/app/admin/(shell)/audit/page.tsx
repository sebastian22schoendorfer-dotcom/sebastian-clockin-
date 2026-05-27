import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  at: string;
  app_users: { full_name: string } | null;
  staff: { full_name: string } | null;
};

export default async function AuditPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const { data } = await sb.from("audit_log").select(
    "id, action, target_table, target_id, at, app_users:actor_user_id(full_name), staff:actor_staff_id(full_name)",
  ).eq("tenant_id", ctx.tenant_id).order("at", { ascending: false }).limit(200);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="p-8">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Audit log</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Most recent 200 entries. Retained 5 years per Decision #12.
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No activity yet.</p>
      ) : (
        <Card>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{new Date(r.at).toLocaleString()}</TableCell>
                    <TableCell>{r.app_users?.full_name ?? r.staff?.full_name ?? "—"}</TableCell>
                    <TableCell><code className="text-xs">{r.action}</code></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.target_table}{r.target_id ? `:${r.target_id.slice(0, 8)}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
