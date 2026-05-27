import "server-only";

type EmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ClockIn <no-reply@example.com>";

  if (!apiKey) {
    console.log("[email:stub] to=%s subject=%s", Array.isArray(to) ? to.join(", ") : to, subject);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] send failed (%d): %s", res.status, body);
    }
  } catch (err) {
    console.error("[email] network error:", err);
  }
}

export async function getManagerEmails(tenant_id: string): Promise<string[]> {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const sb = createServiceClient();
  const { data } = await sb
    .from("app_users")
    .select("email")
    .eq("tenant_id", tenant_id)
    .is("soft_deleted_at", null)
    .in("role", ["OWNER", "SUPERVISOR"]);
  return (data ?? []).map((r) => r.email as string);
}
