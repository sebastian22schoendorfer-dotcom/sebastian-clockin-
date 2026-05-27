import Link from "next/link";

type NavItem = { href: string; label: string; ownerOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/overrides", label: "Overrides" },
  { href: "/admin/closes", label: "Pending closes" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/contracts", label: "Contracts", ownerOnly: true },
  { href: "/admin/payroll", label: "Payroll", ownerOnly: true },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

export function Sidebar({
  fullName, role, email,
}: { fullName: string; role: "OWNER" | "SUPERVISOR"; email: string }) {
  const items = NAV.filter((item) => !item.ownerOnly || role === "OWNER");
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-6 py-5">
        <p className="text-lg font-semibold tracking-tight">ClockIn</p>
        <p className="text-xs text-muted-foreground">Bonaire</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border px-6 py-4 text-xs">
        <p className="font-medium">{fullName}</p>
        <p className="text-muted-foreground">{email}</p>
        <p className="mt-1 text-muted-foreground">{role}</p>
        <form action="/api/sign-out" method="post" className="mt-3">
          <button type="submit" className="text-sm underline">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
