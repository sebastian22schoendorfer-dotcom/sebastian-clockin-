import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readStaffSession } from "@/lib/auth/staff-session";
import { getClockSnapshot, recordClockAttempt } from "@/lib/clock/server";

const InputSchema = z.object({
  type: z.enum(["IN", "OUT", "BREAK_START", "BREAK_END"]),
  location_id: z.string().uuid(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy_m: z.number().gte(0).lte(10_000),
  captured_at: z.string(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await readStaffSession();
  if (!session) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "BAD_REQUEST" }, { status: 400 });
  }

  const snap = await getClockSnapshot(session.tenant_id, session.staff_id);
  const result = await recordClockAttempt(session.tenant_id, session.staff_id, parsed.data, snap.state);

  if (result.ok) return NextResponse.json(result, { status: 200 });
  switch (result.reason) {
    case "LOW_ACCURACY":
    case "OUT_OF_ZONE":
    case "INVALID_TRANSITION":
    case "INVALID_STATE":
    case "NOT_ASSIGNED":
      return NextResponse.json(result, { status: 422 });
    default:
      return NextResponse.json(result, { status: 500 });
  }
}
