import { describe, expect, it } from "vitest";
import { calculateStaffTimesheet } from "./calculate";
import type { OtPolicy, RawClockEvent, StaffPayrollInput } from "./types";

const WEEKLY: OtPolicy = {
  basis: "weekly",
  weekly_threshold_h: 40,
  daily_threshold_h: 9,
  multiplier: 1.5,
  holiday_multiplier: 1.5,
};
const DAILY: OtPolicy = { ...WEEKLY, basis: "daily" };
const BOTH: OtPolicy = { ...WEEKLY, basis: "both" };

function ev(date: string, time: string, type: RawClockEvent["type"]): RawClockEvent {
  const [hh, mm] = time.split(":").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh + 4, mm));
  return { id: `${date}-${time}-${type}`, staff_id: "s", type, event_at: utc.toISOString(), location_id: "l", flags: [] };
}

function input(events: RawClockEvent[], policy: OtPolicy = WEEKLY, is_minor = false): StaffPayrollInput {
  return {
    staff_id: "s", full_name: "Test Person", email: "t@example.com",
    job_role: "SERVICE", contract_type: "FULL_TIME",
    primary_location_name: "Test", is_minor,
    contract: { id: "c", rate_regular_usd: 10, ot_policy: policy },
    events,
  };
}

describe("calculateStaffTimesheet", () => {
  it("counts a simple 8h shift as 8h regular", () => {
    const r = calculateStaffTimesheet(input([ev("2026-06-01", "08:00", "IN"), ev("2026-06-01", "16:00", "OUT")]), new Set());
    expect(r.hours_regular).toBe(8);
    expect(r.pay_gross_usd).toBe(80);
  });

  it("subtracts breaks from worked hours", () => {
    const r = calculateStaffTimesheet(input([
      ev("2026-06-01", "08:00", "IN"),
      ev("2026-06-01", "12:00", "BREAK_START"),
      ev("2026-06-01", "13:00", "BREAK_END"),
      ev("2026-06-01", "17:00", "OUT"),
    ]), new Set());
    expect(r.hours_regular).toBe(8);
    expect(r.hours_break).toBe(1);
  });

  it("weekly OT only counts over 40h in a week", () => {
    const events: RawClockEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      const date = `2026-06-0${d}`;
      events.push(ev(date, "08:00", "IN"));
      events.push(ev(date, "17:00", "OUT"));
    }
    const r = calculateStaffTimesheet(input(events, WEEKLY), new Set());
    expect(r.hours_regular).toBe(40);
    expect(r.hours_overtime).toBe(5);
    expect(r.pay_overtime_usd).toBe(75);
  });

  it("daily OT only counts over 9h per day", () => {
    const r = calculateStaffTimesheet(input([ev("2026-06-01", "08:00", "IN"), ev("2026-06-01", "20:00", "OUT")], DAILY), new Set());
    expect(r.hours_regular).toBe(9);
    expect(r.hours_overtime).toBe(3);
  });

  it("'both' basis picks whichever yields more", () => {
    const events: RawClockEvent[] = [];
    for (let d = 1; d <= 5; d++) {
      const date = `2026-06-0${d}`;
      events.push(ev(date, "08:00", "IN"));
      events.push(ev(date, "18:00", "OUT"));
    }
    const r = calculateStaffTimesheet(input(events, BOTH), new Set());
    expect(r.hours_overtime).toBe(10);
  });

  it("holiday hours roll into hours_overtime and are paid at holiday rate", () => {
    const holidays = new Set(["2026-04-27"]);
    const r = calculateStaffTimesheet(input([ev("2026-04-27", "08:00", "IN"), ev("2026-04-27", "16:00", "OUT")]), holidays);
    expect(r.hours_holiday).toBe(8);
    expect(r.hours_overtime).toBe(8);
    expect(r.pay_overtime_usd).toBe(120);
  });

  it("flags minor over the daily cap", () => {
    const r = calculateStaffTimesheet(input([ev("2026-06-01", "08:00", "IN"), ev("2026-06-01", "17:00", "OUT")], WEEKLY, true), new Set());
    expect(r.flags).toContain("MINOR_DAILY_CAP_EXCEEDED");
  });

  it("splits a shift crossing the 04:00 business-day boundary", () => {
    const r = calculateStaffTimesheet(input([ev("2026-06-01", "20:00", "IN"), ev("2026-06-02", "06:00", "OUT")], DAILY), new Set());
    expect(r.hours_regular).toBe(10);
    expect(r.hours_overtime).toBe(0);
  });

  it("emits NO_ACTIVE_CONTRACT when contract is missing", () => {
    const r = calculateStaffTimesheet({
      ...input([ev("2026-06-01", "08:00", "IN"), ev("2026-06-01", "16:00", "OUT")]),
      contract: null,
    }, new Set());
    expect(r.flags).toContain("NO_ACTIVE_CONTRACT");
    expect(r.pay_gross_usd).toBe(0);
  });
});
