"use server";

import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { verifyEnrollmentToken, consumeEnrollmentToken } from "@/lib/auth/enrollment";

export async function setPasswordAndSignIn(formData: FormData): Promise<void> {
  const token = formData.get("token");
  const password = formData.get("password");

  if (typeof token !== "string" || typeof password !== "string") {
    redirect("/enroll?error=" + encodeURIComponent("Missing password."));
  }
  if (password.length < 12) {
    redirect(`/enroll?token=${token}&error=` + encodeURIComponent("Password must be at least 12 characters."));
  }

  const record = await verifyEnrollmentToken(token);
  if (!record) {
    redirect("/enroll?error=" + encodeURIComponent("Enrollment link expired or already used."));
  }

  const service = createServiceClient();
  const { data: userRow, error: getErr } = await service.auth.admin.getUserById(record.app_user_id);
  if (getErr || !userRow?.user?.email) {
    redirect("/enroll?error=" + encodeURIComponent("Owner account not found. Re-seed the database."));
  }
  const email = userRow.user.email;

  const { error: updErr } = await service.auth.admin.updateUserById(record.app_user_id, { password });
  if (updErr) {
    redirect(
      `/enroll?token=${token}&error=` +
        encodeURIComponent(`Could not set password: ${updErr.message}`),
    );
  }

  await consumeEnrollmentToken(record.id);

  const ssr = await createServerClient();
  const { error: signErr } = await ssr.auth.signInWithPassword({ email, password });
  if (signErr) {
    redirect("/admin/sign-in?error=" + encodeURIComponent("Password set. Please sign in to continue."));
  }

  redirect("/enroll/mfa");
}
