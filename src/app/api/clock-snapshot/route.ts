import { NextResponse } from "next/server";
import { readStaffSession } from "@/lib/auth/staff-session";
import { getClockSnapshot, getRecentEvents } from "@/lib/clock/server";

export async function GET(): Promise<NextResponse> {
  const session = await readStaffSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const [snapshot, recent] = await Promise.all([
    getClockSnapshot(session.tenant_id, session.staff_id),
    getRecentEvents(session.tenant_id, session.staff_id, 10),
  ]);
  return NextResponse.json({ snapshot, recent });
}
