import "server-only";
import argon2 from "argon2";
import { createServiceClient } from "../supabase/server";

export type EnrollmentTokenRecord = {
  id: string;
  tenant_id: string;
  app_user_id: string;
};

export async function verifyEnrollmentToken(raw: string): Promise<EnrollmentTokenRecord | null> {
  if (!raw || raw.length < 16) return null;
  const sb = createServiceClient();

  const { data, error } = await sb
    .from("enrollment_tokens")
    .select("id, tenant_id, app_user_id, token_hash, consumed_at, expires_at")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());
  if (error || !data) return null;

  for (const row of data as Array<{
    id: string;
    tenant_id: string;
    app_user_id: string;
    token_hash: string;
  }>) {
    try {
      if (await argon2.verify(row.token_hash, raw)) {
        return { id: row.id, tenant_id: row.tenant_id, app_user_id: row.app_user_id };
      }
    } catch {
      // continue
    }
  }
  return null;
}

export async function consumeEnrollmentToken(tokenId: string): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from("enrollment_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", tokenId);
}
