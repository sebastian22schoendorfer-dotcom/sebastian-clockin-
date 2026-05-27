import { requireOwner } from "@/lib/auth/admin-context";
import { computePayroll } from "@/lib/payroll/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ start?: string; end?: string }>;

function defaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = (now.getUTCDay() + 6) % 7;
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - dayOfWeek - 1);
  const lastMonday = new Date(lastSunday);
  lastMonday.setUTCDate(lastSunday.getUTCDate() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(lastMonday), end: fmt(lastSunday) };
}

export default async function PayrollPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOwner();
  const params = await searchParams;
  const period = {
    start: params.start ?? defaultPeriod().start,
    end: params.end ?? defaultPeriod().end,
  };

  const rows = await computePayroll(ctx.tenant_id, period);

  const totals = rows.reduce(
    (acc, r) => ({
      regular: acc.regular + r.hours_regular,
      overtime: acc.overtime + r.hours_overtime,
      gross: acc.gross + r.pay_gross_usd,
    }),
    { regular: 0, overtime: 0, gross: 0 },
  );

  return (
    <main className="space-y-6 p-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Payroll</h1>
        <form className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="start">Period start</Label>
            <Input id="start" name="start" type="date" defaultValue={period.start} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="end">Period end</Label>
            <Input id="end" name="end" type="date" defaultValue={period.end} />
          </div>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader>
          <CardDescription>Regular hours</CardDescription>
          <CardTitle className="text-3xl">{totals.regular.toFixed(2)}</CardTitle>
        </CardHeader></Card>
        <Card><CardHeader>
          <CardDescription>Overtime hours (incl. holiday)</CardDescription>
          <CardTitle className="text-3xl">{totals.overtime.toFixed(2)}</CardTitle>
        </CardHeader></Card>
        <Card><CardHeader>
          <CardDescription>Gross USD</CardDescription>
          <CardTitle className="text-3xl">${totals.gross.toFixed(2)}</CardTitle>
        </CardHeader></Card>
      </div>

      <div className="flex justify-end">
        <a
          href={`/admin/payroll/export?start=${period.start}&end=${period.end}`}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Export CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No payroll data for this period.</p>
      ) : (
        <Card>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Regular</TableHead>
                  <TableHead className="text-right">OT</TableHead>
                  <TableHead className="text-right">Holiday</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Gross USD</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.staff_id}>
                    <TableCell className="font-medium">
                      {r.full_name}
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.primary_location ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.hours_regular.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.hours_overtime.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.hours_holiday.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${r.rate_regular_usd.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${r.pay_gross_usd.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.flags.join("; ")}</TableCell>
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
