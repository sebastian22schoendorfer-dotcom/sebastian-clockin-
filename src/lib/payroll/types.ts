export type OtPolicy = {
  basis: "weekly" | "daily" | "both";
  weekly_threshold_h: number;
  daily_threshold_h: number;
  multiplier: number;
  holiday_multiplier: number;
};

export type RawClockEvent = {
  id: string;
  staff_id: string;
  type: "IN" | "OUT" | "BREAK_START" | "BREAK_END";
  event_at: string;
  location_id: string;
  flags: string[];
};

export type StaffPayrollInput = {
  staff_id: string;
  full_name: string;
  email: string;
  job_role: "KITCHEN" | "SERVICE";
  contract_type: "FULL_TIME" | "PART_TIME" | "CASUAL";
  primary_location_name: string | null;
  is_minor: boolean;
  contract: {
    id: string;
    rate_regular_usd: number;
    ot_policy: OtPolicy;
  } | null;
  events: RawClockEvent[];
};

export type StaffTimesheet = {
  staff_id: string;
  full_name: string;
  email: string;
  job_role: "KITCHEN" | "SERVICE";
  contract_type: "FULL_TIME" | "PART_TIME" | "CASUAL";
  primary_location: string | null;
  hours_regular: number;
  hours_overtime: number;
  hours_holiday: number;
  hours_break: number;
  rate_regular_usd: number;
  rate_overtime_usd: number;
  pay_regular_usd: number;
  pay_overtime_usd: number;
  pay_gross_usd: number;
  flags: string[];
};

export type PayrollPeriod = { start: string; end: string };
