import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approveOverride, rejectOverride } from "./actions";

type Row = {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  distance_m: number;
  reason: string | null;
  staff: { full_name: string; email: string } | null;
  locations: { name: string; radius_m: number } | null;
};

type SearchParams = Promise<{ error?: string }>;

export default async function OverridesPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { error } = await searchParams;
  const sb = createServiceClient();

  const { data } = await sb.from("override_requests").select(
    `id, created_at, lat, lng, accuracy_m, distance_m, reason,
     staff(full_name, email),
     locations:requested_location_id(name, radius_m)`,
  ).eq("tenant_id", ctx.tenant_id).eq("status", "PENDING")
   .is("soft_deleted_at", null).order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Override requests</h1>
      {error && <p className="mb-4 text-sm text-destructive">{decodeURIComponent(error)}</p>}

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No pending override requests.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {r.staff?.full_name ?? "—"} at {r.locations?.name ?? "—"}
                </CardTitle>
                <CardDescription>
                  Requested {new Date(r.created_at).toLocaleString()} ·{" "}
                  {Math.round(r.distance_m)} m from perimeter (radius {r.locations?.radius_m ?? 0} m) ·
                  GPS ±{Math.round(r.accuracy_m)} m
                </CardDescription>
              </CardHeader>
              <CardContent>
                {r.reason && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Staff reason:</span> {r.reason}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  <form action={approveOverride}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit">Approve &amp; clock in</Button>
                  </form>
                  <form action={rejectOverride} className="flex flex-1 gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="rejection_reason"
                      placeholder="Rejection reason (optional)"
                      className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      maxLength={500}
                    />
                    <Button type="submit" variant="destructive">Reject</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
