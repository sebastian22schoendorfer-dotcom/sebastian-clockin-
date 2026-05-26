import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateStaffTimesheet } from "./calculate";
import type {
  OtPolicy, PayrollPeriod, RawClockEvent, StaffPayrollInput, StaffTimesheet,
} from "./types";

const MINOR_AGE = 16;

export async function computePayroll(
  tenant_id: string,
  period: PayrollPeriod,
): Promise<StaffTimesheet[]> {
  const sb = createServiceClient();
  const startUtc = new Date(`${period.start}T04:00:00-04:00`).toISOString();
  const endExclusiveUtc = new Date(
    new Date(`${period.end}T04:00:00-04:00`).getTime() + 86_400_000,
  ).toISOString();

  const { data: staffRows } = await sb
    .from("staff")
    .select(`id, full_name, email, job_role, contract_type, date_of_birth,
       staff_locations(is_primary, locations(name))`)
    .eq("tenant_id", tenant_id).is("soft_deleted_at", null);

  type StaffRow = {
    id: string; full_name: string; email: string;
    job_role: "KITCHEN" | "SERVICE"; contract_type: "FULL_TIME" | "PART_TIME" | "CASUAL";
    date_of_birth: string;
    staff_locations: { is_primary: boolean; locations: { name: string } | null }[];
  };
  const staff = (staffRows as unknown as StaffRow[] | null) ?? [];
  if (staff.length === 0) return [];

  const staffIds = staff.map((s) => s.id);

  const { data: eventRows } = await sb
    .from("clock_events")
    .select("id, staff_id, type, event_at, location_id, flags")
    .eq("tenant_id", tenant_id).in("staff_id", staffIds)
    .gte("event_at", startUtc).lt("event_at", endExclusiveUtc)
    .is("soft_deleted_at", null);

  const eventsByStaff = new Map<string, RawClockEvent[]>();
  for (const e of (eventRows ?? []) as RawClockEvent[]) {
    const list = eventsByStaff.get(e.staff_id);
    if (list) list.push(e); else eventsByStaff.set(e.staff_id, [e]);
  }

  const { data: contracts } = await sb
    .from("contracts")
    .select("id, staff_id, rate_regular_usd, ot_policy, effective_from, effective_to")
    .eq("tenant_id", tenant_id).in("staff_id", staffIds).is("soft_deleted_at", null)
    .lte("effective_from", period.end)
    .or(`effective_to.is.null,effective_to.gte.${period.start}`);

  const contractByStaff = new Map<string, { id: string; rate_regular_usd: number; ot_policy: OtPolicy }>();
  for (const c of (contracts ?? []) as Array<{
    id: string; staff_id: string; rate_regular_usd: number; ot_policy: OtPolicy; effective_from: string;
  }>) {
    if (!contractByStaff.has(c.staff_id)) {
      contractByStaff.set(c.staff_id, { id: c.id, rate_regular_usd: c.rate_regular_usd, ot_policy: c.ot_policy });
    }
  }

  const { data: holidayRows } = await sb
    .from("holidays").select("date").eq("tenant_id", tenant_id)
    .gte("date", period.start).lte("date", period.end).is("soft_deleted_at", null);
  const holidaySet = new Set<string>((holidayRows ?? []).map((r) => r.date as string));

  const out: StaffTimesheet[] = [];
  for (const s of staff) {
    const primary = s.staff_locations?.find((l) => l.is_primary)?.locations?.name ?? null;
    const events = eventsByStaff.get(s.id) ?? [];
    if (events.length === 0 && !contractByStaff.has(s.id)) continue;

    const input: StaffPayrollInput = {
      staff_id: s.id, full_name: s.full_name, email: s.email,
      job_role: s.job_role, contract_type: s.contract_type,
      primary_location_name: primary,
      is_minor: isMinorOn(s.date_of_birth, period.end),
      contract: contractByStaff.get(s.id) ?? null,
      events,
    };
    out.push(calculateStaffTimesheet(input, holidaySet));
  }

  out.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return out;
}

function isMinorOn(dob: string, refDate: string): boolean {
  const dobDt = new Date(dob);
  const ref = new Date(refDate);
  let age = ref.getUTCFullYear() - dobDt.getUTCFullYear();
  const m = ref.getUTCMonth() - dobDt.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < dobDt.getUTCDate())) age--;
  return age <= MINOR_AGE;
}
