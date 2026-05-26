import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type ActiveRow = {
  staff_id: string;
  full_name: string;
  job_role: "KITCHEN" | "SERVICE";
  location_name: string;
  state: "CLOCKED_IN" | "ON_BREAK";
  since: string;
};

export default async function AdminDashboard() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const [{ data: active }, { data: hoursData }, { count: pendingOverrides }, { count: pendingCloses }] =
    await Promise.all([
      sb.rpc("currently_clocked_in", { p_tenant_id: ctx.tenant_id }),
      sb.rpc("todays_hours", { p_tenant_id: ctx.tenant_id }),
      sb.from("override_requests").select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenant_id).eq("status", "PENDING").is("soft_deleted_at", null),
      sb.from("pending_close_requests").select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenant_id).eq("status", "PENDING"),
    ]);

  const rows = (active ?? []) as ActiveRow[];
  const todaysHours = (hoursData ?? 0) as number;

  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome back, {ctx.full_name}.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Active now" value={rows.length} />
        <Stat title="Hours today" value={Number(todaysHours).toFixed(1)} />
        <StatLink title="Pending overrides" value={pendingOverrides ?? 0} href="/admin/overrides"
          highlight={(pendingOverrides ?? 0) > 0} />
        <StatLink title="Pending closes" value={pendingCloses ?? 0} href="/admin/closes"
          highlight={(pendingCloses ?? 0) > 0} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Currently clocked in</CardTitle>
          <CardDescription>Live snapshot of who&apos;s on shift.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is clocked in.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.staff_id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.job_role === "KITCHEN" ? "Kitchen" : "Service"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.location_name}</TableCell>
                    <TableCell>{r.state === "ON_BREAK" ? "On break" : "Working"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.since).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function StatLink({ title, value, href, highlight }:
  { title: string; value: number; href: string; highlight: boolean }) {
  return (
    <Link href={href} className="rounded-lg">
      <Card className={highlight ? "border-destructive/60" : ""}>
        <CardHeader>
          <CardDescription>{title}</CardDescription>
          <CardTitle className={`text-3xl ${highlight ? "text-destructive" : ""}`}>{value}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}
