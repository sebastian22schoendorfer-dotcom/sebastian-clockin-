"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function challengeAndVerify(formData: FormData): Promise<void> {
  const factorId = formData.get("factor_id");
  const code = formData.get("code");
  if (typeof factorId !== "string" || typeof code !== "string") {
    redirect("/admin/sign-in/mfa?error=" + encodeURIComponent("Missing code."));
  }

  const sb = await createServerClient();
  const { data: challenge, error: chErr } = await sb.auth.mfa.challenge({ factorId });
  if (chErr || !challenge) {
    redirect("/admin/sign-in/mfa?error=" + encodeURIComponent(chErr?.message ?? "Challenge failed."));
  }

  const { error: verErr } = await sb.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verErr) {
    redirect("/admin/sign-in/mfa?error=" + encodeURIComponent("Invalid code. Try again."));
  }

  redirect("/admin");
}
