import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readStaffSession } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  location_id: z.string().uuid(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy_m: z.number().gte(0).lte(10_000),
  distance_m: z.number().gte(0),
  reason: z.string().max(500).optional().nullable(),
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

  const sb = createServiceClient();
  const { data: row, error } = await sb
    .from("override_requests")
    .insert({
      tenant_id: session.tenant_id,
      staff_id: session.staff_id,
      requested_location_id: parsed.data.location_id,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      accuracy_m: parsed.data.accuracy_m,
      distance_m: parsed.data.distance_m,
      reason: parsed.data.reason ?? null,
    })
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json({ ok: false, reason: "INTERNAL", message: error?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, override_request_id: row.id }, { status: 200 });
}
