import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addManualEvent, editEventTime, softDeleteEvent } from "./actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

type Event = {
  id: string;
  type: "IN" | "OUT" | "BREAK_START" | "BREAK_END";
  event_at: string;
  flags: string[];
  locations: { name: string } | null;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_LABEL: Record<Event["type"], string> = {
  IN: "Clock In",
  OUT: "Clock Out",
  BREAK_START: "Break start",
  BREAK_END: "Break end",
};

export default async function TimecardPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const sb = createServiceClient();

  const { data: staff } = await sb.from("staff")
    .select("id, full_name, email")
    .eq("id", id).eq("tenant_id", ctx.tenant_id)
    .is("soft_deleted_at", null)
    .maybeSingle();
  if (!staff) notFound();

  const { data: locations } = await sb.from("locations")
    .select("id, name")
    .eq("tenant_id", ctx.tenant_id)
    .is("soft_deleted_at", null)
    .order("name");

  const { data: events } = await sb.from("clock_events")
    .select("id, type, event_at, flags, locations:location_id(name)")
    .eq("staff_id", id).eq("tenant_id", ctx.tenant_id)
    .is("soft_deleted_at", null)
    .order("event_at", { ascending: false })
    .limit(100);

  const rows = (events ?? []) as unknown as Event[];

  return (
    <main className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Timecard</h1>
        <p className="mt-1 text-muted-foreground">{staff.full_name} — {staff.email}</p>
        <Link href={`/admin/staff/${id}`} className="text-sm underline">← Back to staff</Link>
      </div>

      {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Add manual clock event</CardTitle>
          <CardDescription>
            Use when staff forgets to clock in/out or you need to backfill a shift.
            Always logged in the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addManualEvent} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="staff_id" value={id} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Action</Label>
              <Select id="type" name="type" required defaultValue="IN">
                <option value="IN">Clock In</option>
                <option value="OUT">Clock Out</option>
                <option value="BREAK_START">Break start</option>
                <option value="BREAK_END">Break end</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="event_at">When</Label>
              <Input
                id="event_at"
                name="event_at"
                type="datetime-local"
                defaultValue={toLocalInput(new Date().toISOString())}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="location_id">Location</Label>
              <Select id="location_id" name="location_id" required defaultValue="">
                <option value="" disabled>Select…</option>
                {((locations ?? []) as { id: string; name: string }[]).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Add event</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Last 100. Edit timestamps or remove rows here.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {rows.length === 0 ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{TYPE_LABEL[e.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <form action={editEventTime} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="staff_id" value={id} />
                        <Input
                          name="event_at"
                          type="datetime-local"
                          defaultValue={toLocalInput(e.event_at)}
                          className="h-9 w-56"
                        />
                        <Button type="submit" size="sm" variant="secondary">Save</Button>
                      </form>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.locations?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.flags.join(", ") || "—"}</TableCell>
                    <TableCell className="text-right">
                      <form action={softDeleteEvent} className="inline">
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="staff_id" value={id} />
                        <button type="submit" className="text-sm text-destructive underline">Delete</button>
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
