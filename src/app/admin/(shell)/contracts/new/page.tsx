import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createContract } from "../actions";

type SearchParams = Promise<{ error?: string }>;

export default async function NewContractPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireAdmin();
  const { error } = await searchParams;
  const sb = createServiceClient();
  const [{ data: staff }, { data: locations }] = await Promise.all([
    sb.from("staff").select("id, full_name").eq("tenant_id", ctx.tenant_id)
      .is("soft_deleted_at", null).eq("status", "ACTIVE").order("full_name"),
    sb.from("locations").select("id, name").eq("tenant_id", ctx.tenant_id)
      .is("soft_deleted_at", null).order("name"),
  ]);

  if (!staff?.length || !locations?.length) {
    return (
      <main className="p-8">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">New contract</h1>
        <p className="text-muted-foreground">
          You need at least one active staff member and one location before creating a contract.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">New contract</h1>
      <form action={createContract} className="flex max-w-xl flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff_id">Staff</Label>
            <Select id="staff_id" name="staff_id" required defaultValue="">
              <option value="" disabled>Select…</option>
              {(staff as { id: string; full_name: string }[]).map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="location_id">Location</Label>
            <Select id="location_id" name="location_id" required defaultValue="">
              <option value="" disabled>Select…</option>
              {(locations as { id: string; name: string }[]).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rate_regular_usd">Hourly rate (USD)</Label>
          <Input id="rate_regular_usd" name="rate_regular_usd" type="number" step="0.25" min="0.25" max="999" required />
        </div>

        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">Overtime policy</legend>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="basis">Basis</Label>
              <Select id="basis" name="basis" defaultValue="weekly">
                <option value="weekly">Weekly only (&gt;40h)</option>
                <option value="daily">Daily only (&gt;9h)</option>
                <option value="both">Both — whichever yields more</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="multiplier">Multiplier</Label>
              <Input id="multiplier" name="multiplier" type="number" step="0.25" defaultValue="1.5" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="weekly_threshold_h">Weekly threshold (h)</Label>
              <Input id="weekly_threshold_h" name="weekly_threshold_h" type="number" step="1" defaultValue="40" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="daily_threshold_h">Daily threshold (h)</Label>
              <Input id="daily_threshold_h" name="daily_threshold_h" type="number" step="1" defaultValue="9" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="holiday_multiplier">Public-holiday multiplier</Label>
              <Input id="holiday_multiplier" name="holiday_multiplier" type="number" step="0.25" defaultValue="1.5" />
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="effective_from">Effective from</Label>
            <Input id="effective_from" name="effective_from" type="date" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="effective_to">Effective to (optional)</Label>
            <Input id="effective_to" name="effective_to" type="date" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}

        <div className="flex gap-3">
          <Button type="submit">Create contract</Button>
          <Link href="/admin/contracts" className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm hover:bg-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
