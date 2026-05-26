import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/admin/sign-in");

  const { data: profile } = await sb
    .from("app_users")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {profile?.full_name ?? user.email} ({profile?.role ?? "—"}).
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Dashboard, staff CRUD, contracts, payroll, and live activity feed land in Milestones 3–6.
      </p>
      <form action="/api/sign-out" method="post" className="mt-6">
        <button type="submit" className="text-sm underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
