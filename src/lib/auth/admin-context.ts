import "server-only";
import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export type AdminContext = {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: "OWNER" | "SUPERVISOR";
};

export async function requireAdmin(): Promise<AdminContext> {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/admin/sign-in");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("app_users")
    .select("tenant_id, email, full_name, role")
    .eq("id", user.id)
    .is("soft_deleted_at", null)
    .maybeSingle();

  if (!profile) redirect("/admin/sign-in");

  return {
    user_id: user.id,
    tenant_id: profile.tenant_id as string,
    email: profile.email as string,
    full_name: profile.full_name as string,
    role: profile.role as "OWNER" | "SUPERVISOR",
  };
}

export async function requireOwner(): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.role !== "OWNER") {
    redirect("/admin?error=" + encodeURIComponent("Owner role required."));
  }
  return ctx;
}
