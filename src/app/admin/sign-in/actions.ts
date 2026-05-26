"use server";

import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export async function signInAdmin(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/admin/sign-in?error=" + encodeURIComponent("Missing credentials."));
  }

  const sb = await createServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    redirect("/admin/sign-in?error=" + encodeURIComponent("Invalid email or password."));
  }

  const { data: aalRes } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalRes?.nextLevel === "aal2" && aalRes.currentLevel !== "aal2") {
    redirect("/admin/sign-in/mfa");
  }

  await logAdminLogin(data.user.id, "LOGIN_OK");
  redirect("/admin");
}

async function logAdminLogin(userId: string, type: "LOGIN_OK" | "LOGIN_FAIL"): Promise<void> {
  const service = createServiceClient();
  const { data: u } = await service.from("app_users").select("tenant_id").eq("id", userId).maybeSingle();
  if (!u?.tenant_id) return;
  await service.from("login_events").insert({
    tenant_id: u.tenant_id,
    app_user_id: userId,
    event_type: type,
  });
}
