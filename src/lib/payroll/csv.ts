import type { PayrollPeriod, StaffTimesheet } from "./types";

const HEADERS = [
  "staff_id","staff_full_name","staff_email","job_role","contract_type",
  "location_primary","period_start","period_end",
  "hours_regular","hours_overtime","hours_holiday","hours_break",
  "rate_regular_usd","rate_overtime_usd",
  "pay_regular_usd","pay_overtime_usd","pay_gross_usd",
  "flags",
] as const;

const BOM = "﻿";
const CRLF = "\r\n";

function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function timesheetsToCsv(rows: StaffTimesheet[], period: PayrollPeriod): string {
  const lines: string[] = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push([
      r.staff_id, r.full_name, r.email, r.job_role, r.contract_type,
      r.primary_location ?? "", period.start, period.end,
      r.hours_regular.toFixed(2), r.hours_overtime.toFixed(2),
      r.hours_holiday.toFixed(2), r.hours_break.toFixed(2),
      r.rate_regular_usd.toFixed(2), r.rate_overtime_usd.toFixed(2),
      r.pay_regular_usd.toFixed(2), r.pay_overtime_usd.toFixed(2),
      r.pay_gross_usd.toFixed(2),
      r.flags.join(";"),
    ].map(csvField).join(","));
  }
  return BOM + lines.join(CRLF) + CRLF;
}
