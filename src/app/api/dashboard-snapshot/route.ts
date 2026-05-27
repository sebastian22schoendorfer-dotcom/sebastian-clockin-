import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const [{ data: active }, { data: hoursData }, { count: pendingOverrides }, { count: pendingCloses }] =
    await Promise.all([
      sb.rpc("currently_clocked_in", { p_tenant_id: ctx.tenant_id }),
      sb.rpc("todays_hours", { p_tenant_id: ctx.tenant_id }),
      sb.from("override_requests").select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenant_id).eq("status", "PENDING").is("soft_deleted_at", null),
      sb.from("pending_close_requests").select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenant_id).eq("status", "PENDING"),
    ]);

  return NextResponse.json({
    active: active ?? [],
    hours_today: Number(hoursData ?? 0),
    pending_overrides: pendingOverrides ?? 0,
    pending_closes: pendingCloses ?? 0,
  });
}
