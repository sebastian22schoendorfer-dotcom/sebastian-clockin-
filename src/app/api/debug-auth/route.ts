import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const result: Record<string, unknown> = {};
  try {
    const sb = await createServerClient();
    const { data: { user }, error } = await sb.auth.getUser();
    result.user_id = user?.id ?? null;
    result.user_email = user?.email ?? null;
    result.user_app_metadata = user?.app_metadata ?? null;
    result.get_user_error = error?.message ?? null;

    if (user) {
      const svc = createServiceClient();
      const { data, error: pErr } = await svc
        .from("app_users")
        .select("id, tenant_id, email, role, soft_deleted_at")
        .eq("id", user.id)
        .maybeSingle();
      result.profile = data ?? null;
      result.profile_error = pErr?.message ?? null;
    }

    result.env = {
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 15) ?? null,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    };
  } catch (err) {
    result.exception = String(err);
  }
  return NextResponse.json(result, { status: 200 });
}
