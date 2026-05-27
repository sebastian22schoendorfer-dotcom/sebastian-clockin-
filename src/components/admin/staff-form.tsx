import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createStaff, updateStaff } from "@/app/admin/(shell)/staff/actions";

export type StaffFormInitial = {
  id?: string;
  email?: string;
  full_name?: string;
  job_role?: "KITCHEN" | "SERVICE";
  contract_type?: "FULL_TIME" | "PART_TIME" | "CASUAL";
  date_of_birth?: string;
  status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  primary_location_id?: string;
};

export function StaffForm({
  initial, locations, error, canSetRate,
}: {
  initial?: StaffFormInitial;
  locations: { id: string; name: string }[];
  error?: string;
  canSetRate?: boolean;
}) {
  const isEdit = !!initial?.id;
  return (
    <form action={isEdit ? updateStaff : createStaff} className="flex max-w-xl flex-col gap-6">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" defaultValue={initial?.full_name ?? ""} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="job_role">Role</Label>
          <Select id="job_role" name="job_role" defaultValue={initial?.job_role ?? "SERVICE"}>
            <option value="SERVICE">Service</option>
            <option value="KITCHEN">Kitchen</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contract_type">Contract type</Label>
          <Select id="contract_type" name="contract_type" defaultValue={initial?.contract_type ?? "FULL_TIME"}>
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="CASUAL">Casual</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={initial?.date_of_birth ?? ""} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="primary_location_id">Primary location</Label>
        <Select id="primary_location_id" name="primary_location_id" defaultValue={initial?.primary_location_id ?? ""} required>
          <option value="" disabled>Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>
      </div>

      {canSetRate && !isEdit && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="rate_regular_usd">Hourly rate (USD)</Label>
          <Input
            id="rate_regular_usd"
            name="rate_regular_usd"
            type="number"
            step="0.25"
            min="0.25"
            max="999"
            placeholder="Optional — sets up payroll immediately"
          />
          <p className="text-xs text-muted-foreground">
            Optional. If set, a starter contract is created and payroll calculations
            include this staff member immediately. You can change rates later under Contracts.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}

      <div className="flex gap-3">
        <Button type="submit">{isEdit ? "Save changes" : "Create staff"}</Button>
        <Link href="/admin/staff" className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm hover:bg-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
