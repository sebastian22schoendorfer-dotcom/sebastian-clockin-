"use server";

import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export async function verifyEnrolledFactor(formData: FormData): Promise<void> {
  const factorId = formData.get("factor_id");
  const code = formData.get("code");
  if (typeof factorId !== "string" || typeof code !== "string") {
    redirect("/enroll/mfa?error=" + encodeURIComponent("Missing code."));
  }

  const sb = await createServerClient();
  const { data: challenge, error: chErr } = await sb.auth.mfa.challenge({ factorId });
  if (chErr || !challenge) {
    redirect(
      `/enroll/mfa?factor_id=${factorId}&error=` +
        encodeURIComponent(chErr?.message ?? "Could not start challenge."),
    );
  }

  const { error: verErr } = await sb.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verErr) {
    redirect(
      `/enroll/mfa?factor_id=${factorId}&error=` +
        encodeURIComponent(verErr.message || "Invalid code. Try again."),
    );
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) {
    const service = createServiceClient();
    await service
      .from("app_users")
      .update({ totp_enrolled_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  redirect("/admin");
}
