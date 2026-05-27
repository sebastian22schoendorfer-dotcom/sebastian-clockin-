"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ActiveRow = {
  staff_id: string;
  full_name: string;
  job_role: "KITCHEN" | "SERVICE";
  location_name: string;
  state: "CLOCKED_IN" | "ON_BREAK";
  since: string;
};

type Snapshot = {
  active: ActiveRow[];
  hours_today: number;
  pending_overrides: number;
  pending_closes: number;
};

const POLL_MS = 10_000;

export function DashboardLive({ initial }: { initial: Snapshot }) {
  const [snap, setSnap] = useState(initial);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/dashboard-snapshot", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Snapshot;
        setSnap(data);
        setLastFetch(new Date());
      } catch {}
    };
    const id = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Active now" value={snap.active.length} />
        <Stat title="Hours today" value={snap.hours_today.toFixed(1)} />
        <StatLink title="Pending overrides" value={snap.pending_overrides} href="/admin/overrides"
          highlight={snap.pending_overrides > 0} />
        <StatLink title="Pending closes" value={snap.pending_closes} href="/admin/closes"
          highlight={snap.pending_closes > 0} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Currently clocked in</CardTitle>
          <CardDescription>
            Updates every {POLL_MS / 1000}s. Last refresh: {lastFetch.toLocaleTimeString()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snap.active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is clocked in.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.active.map((r) => (
                  <TableRow key={r.staff_id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.job_role === "KITCHEN" ? "Kitchen" : "Service"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.location_name}</TableCell>
                    <TableCell>{r.state === "ON_BREAK" ? "On break" : "Working"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.since).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function StatLink({ title, value, href, highlight }:
  { title: string; value: number; href: string; highlight: boolean }) {
  return (
    <Link href={href} className="rounded-lg">
      <Card className={highlight ? "border-destructive/60" : ""}>
        <CardHeader>
          <CardDescription>{title}</CardDescription>
          <CardTitle className={`text-3xl ${highlight ? "text-destructive" : ""}`}>{value}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}
