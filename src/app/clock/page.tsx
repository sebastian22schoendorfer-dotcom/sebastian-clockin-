import { redirect } from "next/navigation";
import { readStaffSession } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function ClockHome() {
  const session = await readStaffSession();
  if (!session) redirect("/sign-in");

  const sb = createServiceClient();
  const { data: staff } = await sb
    .from("staff")
    .select("full_name, job_role")
    .eq("id", session.staff_id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Clock</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome {staff?.full_name ?? "—"} ({staff?.job_role ?? "—"}).
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Clock in/out, breaks, perimeter check, and override request land in Milestone 4.
      </p>
      <form action="/api/sign-out" method="post" className="mt-6">
        <button type="submit" className="text-sm underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
