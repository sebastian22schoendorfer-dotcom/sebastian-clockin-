import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, getManagerEmails } from "@/lib/notifications/email";

const TWELVE_H = 12;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request): Promise<NextResponse> {
  const token = req.headers.get("x-cron-token");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }

  const sb = createServiceClient();
  const { data: tenants } = await sb.from("tenants").select("id").is("soft_deleted_at", null);
  let pendingCreated = 0;
  let autoClosed = 0;

  for (const t of (tenants ?? []) as { id: string }[]) {
    const { data: openShifts } = await sb.rpc("open_shifts_over_threshold", {
      p_tenant_id: t.id,
      p_hours: TWELVE_H,
    });

    for (const s of (openShifts ?? []) as Array<{
      staff_id: string;
      full_name: string;
      open_in_event_id: string;
      opened_at: string;
      location_id: string;
      location_name: string;
    }>) {
      const { data: existing } = await sb.from("pending_close_requests")
        .select("id").eq("opened_clock_event_id", s.open_in_event_id).maybeSingle();
      if (existing) continue;

      const opened = new Date(s.opened_at);
      const suggested = new Date(opened.getTime() + TWELVE_H * 60 * 60 * 1000);

      await sb.from("pending_close_requests").insert({
        tenant_id: t.id,
        staff_id: s.staff_id,
        opened_clock_event_id: s.open_in_event_id,
        opened_at: s.opened_at,
        suggested_close_at: suggested.toISOString(),
      });
      pendingCreated++;

      const managers = await getManagerEmails(t.id);
      if (managers.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        void sendEmail({
          to: managers,
          subject: `Shift > 12h open: ${s.full_name}`,
          html: `
            <p><strong>${s.full_name}</strong> has been clocked in for over 12 hours at ${s.location_name}.</p>
            <p>Opened at ${new Date(s.opened_at).toLocaleString()}.</p>
            <p><a href="${appUrl}/admin/closes">Confirm close in ClockIn</a></p>
          `,
        });
      }
    }

    const cutoff = new Date(Date.now() - TWENTY_FOUR_H_MS).toISOString();
    const { data: stale } = await sb.from("pending_close_requests")
      .select("id, staff_id, opened_clock_event_id, suggested_close_at")
      .eq("tenant_id", t.id).eq("status", "PENDING").lt("created_at", cutoff);

    for (const row of (stale ?? []) as Array<{
      id: string;
      staff_id: string;
      opened_clock_event_id: string;
      suggested_close_at: string;
    }>) {
      const { data: openEv } = await sb.from("clock_events").select("location_id")
        .eq("id", row.opened_clock_event_id).maybeSingle();
      if (!openEv) continue;

      const { data: outEv } = await sb.from("clock_events").insert({
        tenant_id: t.id,
        staff_id: row.staff_id,
        location_id: openEv.location_id,
        type: "OUT",
        event_at: row.suggested_close_at,
        flags: ["AUTO_CLOSED"],
      }).select("id").single();

      if (outEv) {
        await sb.from("pending_close_requests").update({
          status: "EXPIRED",
          closed_at: new Date().toISOString(),
          resolution_clock_event_id: outEv.id,
        }).eq("id", row.id);
        autoClosed++;
      }
    }
  }

  return NextResponse.json({ ok: true, pending_created: pendingCreated, auto_closed: autoClosed });
}
