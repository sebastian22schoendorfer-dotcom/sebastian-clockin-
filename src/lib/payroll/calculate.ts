import { businessDayEnd, businessDayOf, isoWeekOf } from "./business-day";
import type { OtPolicy, RawClockEvent, StaffPayrollInput, StaffTimesheet } from "./types";

const DEFAULT_POLICY: OtPolicy = {
  basis: "weekly",
  weekly_threshold_h: 40,
  daily_threshold_h: 9,
  multiplier: 1.5,
  holiday_multiplier: 1.5,
};

const MINOR_DAILY_CAP_H = 8;
const MINOR_WEEKLY_CAP_H = 40;

export type Segment = { start: Date; end: Date; kind: "WORK" | "BREAK" };

export function calculateStaffTimesheet(
  input: StaffPayrollInput,
  holidays: Set<string>,
): StaffTimesheet {
  const policy = input.contract?.ot_policy ?? DEFAULT_POLICY;
  const rate = input.contract?.rate_regular_usd ?? 0;
  const otRate = rate * policy.multiplier;
  const holidayRate = rate * policy.holiday_multiplier;

  const segments = pairEvents(input.events);
  const splitSegs = splitAtBusinessDayBoundaries(segments);
  const flags = new Set<string>();

  type DayBucket = { work_h: number; break_h: number; is_holiday: boolean };
  const days = new Map<string, DayBucket>();

  for (const seg of splitSegs) {
    const day = businessDayOf(seg.start);
    const hours = (seg.end.getTime() - seg.start.getTime()) / 3_600_000;
    let bucket = days.get(day);
    if (!bucket) {
      bucket = { work_h: 0, break_h: 0, is_holiday: holidays.has(day) };
      days.set(day, bucket);
    }
    if (seg.kind === "WORK") bucket.work_h += hours;
    else bucket.break_h += hours;
  }

  for (const e of input.events) {
    for (const f of e.flags) flags.add(f);
  }

  let holidayHours = 0;
  let nonHolidayWork = 0;
  let breakHours = 0;
  for (const b of days.values()) {
    if (b.is_holiday) holidayHours += b.work_h;
    else nonHolidayWork += b.work_h;
    breakHours += b.break_h;
  }

  let weeklyOt = 0;
  let dailyOt = 0;
  if (policy.basis === "weekly" || policy.basis === "both") {
    const weeks = new Map<string, number>();
    for (const [day, b] of days) {
      if (b.is_holiday) continue;
      const w = isoWeekOf(day);
      weeks.set(w, (weeks.get(w) ?? 0) + b.work_h);
    }
    for (const total of weeks.values()) {
      weeklyOt += Math.max(0, total - policy.weekly_threshold_h);
    }
  }
  if (policy.basis === "daily" || policy.basis === "both") {
    for (const b of days.values()) {
      if (b.is_holiday) continue;
      dailyOt += Math.max(0, b.work_h - policy.daily_threshold_h);
    }
  }
  const otHours = policy.basis === "both" ? Math.max(weeklyOt, dailyOt) : weeklyOt + dailyOt;

  if (input.is_minor) {
    for (const b of days.values()) {
      if (b.work_h > MINOR_DAILY_CAP_H) flags.add("MINOR_DAILY_CAP_EXCEEDED");
    }
    const weeks = new Map<string, number>();
    for (const [day, b] of days) {
      const w = isoWeekOf(day);
      weeks.set(w, (weeks.get(w) ?? 0) + b.work_h);
    }
    for (const total of weeks.values()) {
      if (total > MINOR_WEEKLY_CAP_H) flags.add("MINOR_WEEKLY_CAP_EXCEEDED");
    }
  }

  const regularHours = Math.max(0, nonHolidayWork - otHours);
  const reportedOtHours = otHours + holidayHours;

  const payRegular = regularHours * rate;
  const payOvertime = otHours * otRate + holidayHours * holidayRate;
  const payGross = payRegular + payOvertime;

  if (!input.contract) flags.add("NO_ACTIVE_CONTRACT");

  return {
    staff_id: input.staff_id,
    full_name: input.full_name,
    email: input.email,
    job_role: input.job_role,
    contract_type: input.contract_type,
    primary_location: input.primary_location_name,
    hours_regular: round2(regularHours),
    hours_overtime: round2(reportedOtHours),
    hours_holiday: round2(holidayHours),
    hours_break: round2(breakHours),
    rate_regular_usd: round2(rate),
    rate_overtime_usd: round2(otRate),
    pay_regular_usd: round2(payRegular),
    pay_overtime_usd: round2(payOvertime),
    pay_gross_usd: round2(payGross),
    flags: Array.from(flags),
  };
}

function pairEvents(events: RawClockEvent[]): Segment[] {
  const sorted = [...events].sort((a, b) => a.event_at.localeCompare(b.event_at));
  const segs: Segment[] = [];
  let mode: "WORKING" | "BREAK" | "OFF" = "OFF";
  let cursor: Date | null = null;

  for (const e of sorted) {
    const t = new Date(e.event_at);
    if (mode !== "OFF" && cursor) {
      segs.push({ start: cursor, end: t, kind: mode === "WORKING" ? "WORK" : "BREAK" });
    }
    switch (e.type) {
      case "IN":
      case "BREAK_END":
        mode = "WORKING"; cursor = t; break;
      case "BREAK_START":
        mode = "BREAK"; cursor = t; break;
      case "OUT":
        mode = "OFF"; cursor = null; break;
    }
  }
  return segs;
}

function splitAtBusinessDayBoundaries(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segs) {
    let cursor = seg.start;
    while (cursor < seg.end) {
      const day = businessDayOf(cursor);
      const boundary = businessDayEnd(day);
      const chunkEnd = boundary < seg.end ? boundary : seg.end;
      out.push({ start: cursor, end: chunkEnd, kind: seg.kind });
      cursor = chunkEnd;
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
