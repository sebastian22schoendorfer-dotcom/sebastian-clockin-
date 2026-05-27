import { requireAdmin } from "@/lib/auth/admin-context";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  return (
    <div className="flex min-h-dvh">
      <Sidebar fullName={ctx.full_name} role={ctx.role} email={ctx.email} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
