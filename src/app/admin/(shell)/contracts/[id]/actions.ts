"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin-context";
import { signContract } from "@/lib/contracts/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function submitSignature(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = formData.get("id");
  const dataUrl = formData.get("signature_data_url");
  if (typeof id !== "string" || typeof dataUrl !== "string" || dataUrl.length < 100) {
    redirect("/admin/contracts?error=" + encodeURIComponent("Signature missing or invalid."));
  }

  const result = await signContract(ctx.tenant_id, id, dataUrl);
  if (!result.ok) {
    redirect(`/admin/contracts/${id}/sign?error=` + encodeURIComponent(result.reason));
  }

  const sb = createServiceClient();
  await sb.from("audit_log").insert({
    tenant_id: ctx.tenant_id,
    actor_user_id: ctx.user_id,
    action: "contract.sign",
    target_table: "contracts",
    target_id: id,
  });

  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${id}`);
}
