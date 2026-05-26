import { requireAdmin } from "@/lib/auth/admin-context";

export default async function AdminDashboard() {
  const ctx = await requireAdmin();
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome back, {ctx.full_name}.</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Live activity, today's hours, and pending override requests land in Milestone 5.
      </p>
    </main>
  );
}
