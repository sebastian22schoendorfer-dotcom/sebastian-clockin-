import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { softDeleteLocation } from "./actions";

type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  staff_count: number;
};

export default async function LocationsPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const { data } = await sb.rpc("admin_list_locations", { p_tenant_id: ctx.tenant_id });
  const locations = (data ?? []) as LocationRow[];

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Locations</h1>
        <Link href="/admin/locations/new"><Button>New location</Button></Link>
      </div>

      {locations.length === 0 ? (
        <p className="text-muted-foreground">No locations yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Radius</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">{loc.name}</TableCell>
                <TableCell className="text-muted-foreground">{loc.address ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</TableCell>
                <TableCell>{loc.radius_m} m</TableCell>
                <TableCell>{loc.staff_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/locations/${loc.id}`} className="text-sm underline">Edit</Link>
                    <form action={softDeleteLocation} className="inline">
                      <input type="hidden" name="id" value={loc.id} />
                      <button type="submit" className="text-sm text-destructive underline">Delete</button>
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
