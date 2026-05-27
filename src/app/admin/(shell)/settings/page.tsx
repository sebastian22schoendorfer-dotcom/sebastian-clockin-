import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addHoliday, removeHoliday } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { error } = await searchParams;
  const sb = createServiceClient();

  const { data: tenant } = await sb.from("tenants").select("name, slug").eq("id", ctx.tenant_id).maybeSingle();
  const { data: holidays } = await sb.from("holidays").select("id, date, name")
    .eq("tenant_id", ctx.tenant_id).is("soft_deleted_at", null).order("date");

  type Holiday = { id: string; date: string; name: string };
  const rows = (holidays ?? []) as Holiday[];

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Tenant</CardTitle>
          <CardDescription>Read-only for now.</CardDescription>
        </CardHeader>
        <CardContent>
          <p><span className="text-muted-foreground">Name: </span>{tenant?.name}</p>
          <p><span className="text-muted-foreground">Slug: </span><code>{tenant?.slug}</code></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public holidays</CardTitle>
          <CardDescription>
            Hours worked on these dates are paid at the holiday multiplier set on each contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="px-6 pb-4">
            <form action={addHoliday} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="e.g. King's Day" required />
              </div>
              <Button type="submit">Add holiday</Button>
            </form>
          </div>
          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.date}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell className="text-right">
                      <form action={removeHoliday} className="inline">
                        <input type="hidden" name="id" value={h.id} />
                        <button type="submit" className="text-sm text-destructive underline">Remove</button>
                      </form>
                    </TableCell>
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
