import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { confirmClose } from "./actions";

type Row = {
  id: string;
  opened_at: string;
  suggested_close_at: string;
  staff: { full_name: string } | null;
};

type SearchParams = Promise<{ error?: string }>;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ClosesPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { error } = await searchParams;
  const sb = createServiceClient();

  const { data } = await sb.from("pending_close_requests")
    .select(`id, opened_at, suggested_close_at, staff(full_name)`)
    .eq("tenant_id", ctx.tenant_id).eq("status", "PENDING").order("opened_at");

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Pending closes</h1>
      {error && <p className="mb-4 text-sm text-destructive">{decodeURIComponent(error)}</p>}

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No open shifts past the 12-hour threshold.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-lg">{r.staff?.full_name ?? "—"}</CardTitle>
                <CardDescription>
                  Open since {new Date(r.opened_at).toLocaleString()}. Suggested close at{" "}
                  {new Date(r.suggested_close_at).toLocaleString()}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={confirmClose} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`closed_at_${r.id}`} className="text-sm font-medium">
                      Actual close time
                    </label>
                    <Input
                      id={`closed_at_${r.id}`}
                      name="closed_at"
                      type="datetime-local"
                      defaultValue={toLocalInput(r.suggested_close_at)}
                    />
                  </div>
                  <Button type="submit">Close shift</Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
