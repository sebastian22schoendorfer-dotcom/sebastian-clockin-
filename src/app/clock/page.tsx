import { redirect } from "next/navigation";
import { readStaffSession } from "@/lib/auth/staff-session";
import { getAssignedLocations, getClockSnapshot, getRecentEvents } from "@/lib/clock/server";
import { ClockScreen } from "@/components/clock/clock-screen";

export const dynamic = "force-dynamic";

export default async function ClockHome() {
  const session = await readStaffSession();
  if (!session) redirect("/sign-in");

  const [snapshot, locations, recent] = await Promise.all([
    getClockSnapshot(session.tenant_id, session.staff_id),
    getAssignedLocations(session.tenant_id, session.staff_id),
    getRecentEvents(session.tenant_id, session.staff_id, 10),
  ]);

  if (locations.length === 0) {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-2xl font-semibold">No location assigned</h1>
        <p className="mt-2 text-muted-foreground">
          Ask your supervisor to assign you to a location before clocking in.
        </p>
        <form action="/api/sign-out" method="post" className="mt-6">
          <button type="submit" className="text-sm underline">Sign out</button>
        </form>
      </main>
    );
  }

  return <ClockScreen initialSnapshot={snapshot} locations={locations} recent={recent} />;
}
