import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readStaffSession } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, getManagerEmails } from "@/lib/notifications/email";

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

  // Decision #2: email-only notification, fire-and-forget.
  const managers = await getManagerEmails(session.tenant_id);
  if (managers.length > 0) {
    const { data: staff } = await sb.from("staff").select("full_name").eq("id", session.staff_id).maybeSingle();
    const { data: loc } = await sb.from("locations").select("name").eq("id", parsed.data.location_id).maybeSingle();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    void sendEmail({
      to: managers,
      subject: `Override request from ${staff?.full_name ?? "staff"}`,
      html: `
        <p><strong>${staff?.full_name ?? "A staff member"}</strong> is requesting an out-of-zone clock-in.</p>
        <ul>
          <li>Location: ${loc?.name ?? "—"}</li>
          <li>Distance from perimeter: ${Math.round(parsed.data.distance_m)} m</li>
          <li>GPS accuracy: ±${Math.round(parsed.data.accuracy_m)} m</li>
        </ul>
        <p><a href="${appUrl}/admin/overrides">Review in ClockIn</a></p>
      `,
    });
  }

  return NextResponse.json({ ok: true, override_request_id: row.id }, { status: 200 });
}
