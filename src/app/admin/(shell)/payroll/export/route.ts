import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth/admin-context";
import { computePayroll } from "@/lib/payroll/server";
import { timesheetsToCsv } from "@/lib/payroll/csv";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = await requireOwner();
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ ok: false, reason: "BAD_REQUEST" }, { status: 400 });
  }
  const rows = await computePayroll(ctx.tenant_id, { start, end });
  const csv = timesheetsToCsv(rows, { start, end });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="payroll_${start}_to_${end}.csv"`,
    },
  });
}
