# Payroll CSV Export — Column Mapping

> Stub. Final columns land with Milestone 6 (Payroll Overview & Export).

## Per-staff per-period

| Column | Type | Notes |
|---|---|---|
| `staff_id` | uuid | |
| `staff_full_name` | text | |
| `staff_email` | text | |
| `job_role` | enum | `KITCHEN` \| `SERVICE` |
| `contract_type` | enum | `FULL_TIME` \| `PART_TIME` \| `CASUAL` |
| `period_start` | date | inclusive, Bonaire local |
| `period_end` | date | inclusive, Bonaire local |
| `hours_regular` | numeric(6,2) | |
| `hours_overtime` | numeric(6,2) | |
| `hours_holiday` | numeric(6,2) | Subset of OT, paid at uplift |
| `hours_break` | numeric(6,2) | Unpaid |
| `rate_regular_usd` | numeric(6,2) | |
| `rate_overtime_usd` | numeric(6,2) | `rate_regular_usd × multiplier` |
| `pay_gross_usd` | numeric(8,2) | No taxes applied |
| `flags` | text | semicolon-joined |

Encoding: UTF-8 with BOM, CRLF, USD throughout.
