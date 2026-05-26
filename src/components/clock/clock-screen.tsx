"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getCurrentFix, isFix, type Fix, type FixError } from "@/lib/clock/geolocation";
import { enqueue, drain, count as queueCount } from "@/lib/clock/queue";
import { NEXT_ACTIONS } from "@/lib/clock/types";
import type {
  AssignedLocation,
  ClockAttemptInput,
  ClockEventType,
  ClockSnapshot,
  RecentEvent,
} from "@/lib/clock/types";

type Props = {
  initialSnapshot: ClockSnapshot;
  locations: AssignedLocation[];
  recent: RecentEvent[];
};

const ACTION_LABEL: Record<ClockEventType, string> = {
  IN: "Clock In",
  OUT: "Clock Out",
  BREAK_START: "Start Break",
  BREAK_END: "End Break",
};

type Status =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "low_accuracy"; accuracy_m: number }
  | { kind: "out_of_zone"; distance_m: number; radius_m: number; fix: Fix }
  | { kind: "permission_denied" }
  | { kind: "position_unavailable" }
  | { kind: "success"; type: ClockEventType }
  | { kind: "queued" }
  | { kind: "error"; message: string };

export function ClockScreen({ initialSnapshot, locations, recent }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [recentEvents, setRecentEvents] = useState(recent);
  const [selectedLocationId, setSelectedLocationId] = useState(
    snapshot.last_location_id ?? locations.find((l) => l.is_primary)?.id ?? locations[0]?.id ?? "",
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState(0);
  const [, startTransition] = useTransition();

  const refreshPendingCount = useCallback(async () => {
    setPending(await queueCount());
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const drainNow = () => {
      drain().then(({ sent }) => {
        if (sent > 0) refreshPendingCount();
      });
    };
    drainNow();
    window.addEventListener("online", drainNow);
    return () => window.removeEventListener("online", drainNow);
  }, [refreshPendingCount]);

  const actions = NEXT_ACTIONS[snapshot.state];

  async function attempt(type: ClockEventType) {
    if (!selectedLocationId) {
      setStatus({ kind: "error", message: "Pick a location first." });
      return;
    }

    setStatus({ kind: "locating" });
    const fix = await getCurrentFix();
    if (!isFix(fix)) {
      handleFixError(fix);
      return;
    }

    const input: ClockAttemptInput = {
      type,
      location_id: selectedLocationId,
      lat: fix.lat,
      lng: fix.lng,
      accuracy_m: fix.accuracy_m,
      captured_at: fix.captured_at,
    };

    if (!navigator.onLine) {
      await enqueue(input);
      await refreshPendingCount();
      setStatus({ kind: "queued" });
      return;
    }

    try {
      const res = await fetch("/api/clock-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        setStatus({ kind: "success", type });
        startTransition(() => {
          refreshSnapshot();
        });
        return;
      }
      const body = (await res.json()) as
        | { ok: false; reason: "LOW_ACCURACY"; accuracy_m: number }
        | { ok: false; reason: "OUT_OF_ZONE"; distance_m: number; radius_m: number }
        | { ok: false; reason: string; message?: string };

      if (body.reason === "LOW_ACCURACY") {
        setStatus({ kind: "low_accuracy", accuracy_m: body.accuracy_m });
      } else if (body.reason === "OUT_OF_ZONE") {
        setStatus({
          kind: "out_of_zone",
          distance_m: body.distance_m,
          radius_m: body.radius_m,
          fix,
        });
      } else {
        setStatus({ kind: "error", message: body.message ?? body.reason });
      }
    } catch {
      await enqueue(input);
      await refreshPendingCount();
      setStatus({ kind: "queued" });
    }
  }

  function handleFixError(err: FixError) {
    switch (err.kind) {
      case "PERMISSION_DENIED":
        setStatus({ kind: "permission_denied" });
        break;
      case "POSITION_UNAVAILABLE":
        setStatus({ kind: "position_unavailable" });
        break;
      case "TIMEOUT":
        setStatus({ kind: "error", message: "GPS request timed out. Try again." });
        break;
      case "UNSUPPORTED":
        setStatus({ kind: "error", message: "Geolocation isn't supported on this device." });
        break;
    }
  }

  async function refreshSnapshot() {
    const res = await fetch("/api/clock-snapshot");
    if (!res.ok) return;
    const data = (await res.json()) as {
      snapshot: ClockSnapshot;
      recent: RecentEvent[];
    };
    setSnapshot(data.snapshot);
    setRecentEvents(data.recent);
  }

  async function requestOverride() {
    if (status.kind !== "out_of_zone") return;
    const fix = status.fix;
    const res = await fetch("/api/override-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        location_id: selectedLocationId,
        lat: fix.lat,
        lng: fix.lng,
        accuracy_m: fix.accuracy_m,
        distance_m: status.distance_m,
      }),
    });
    if (res.ok) {
      setStatus({
        kind: "error",
        message: "Override request sent. A manager will review it shortly.",
      });
    } else {
      setStatus({ kind: "error", message: "Couldn't submit the override request. Try again." });
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{stateHeading(snapshot)}</CardTitle>
          <CardDescription>{stateSubheading(snapshot)}</CardDescription>
        </CardHeader>
      </Card>

      {locations.length > 1 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="loc" className="text-sm font-medium">Location</label>
          <Select id="loc" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}{l.is_primary ? " (primary)" : ""}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {actions.map((act) => (
          <Button
            key={act}
            size="lg"
            variant={act === "IN" ? "primary" : act === "OUT" ? "destructive" : "secondary"}
            disabled={status.kind === "locating"}
            onClick={() => attempt(act)}
            className="h-16 text-lg"
          >
            {status.kind === "locating" ? "Getting GPS…" : ACTION_LABEL[act]}
          </Button>
        ))}
      </div>

      <StatusBanner status={status} onOverride={requestOverride} onRetry={() => setStatus({ kind: "idle" })} />

      {pending > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {pending} event{pending === 1 ? "" : "s"} pending sync.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span className="font-medium">{e.type}</span>
                  <span className="text-muted-foreground">{new Date(e.event_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <form action="/api/sign-out" method="post" className="text-center">
        <button type="submit" className="text-sm underline">Sign out</button>
      </form>
    </div>
  );
}

function stateHeading(s: ClockSnapshot): string {
  switch (s.state) {
    case "CLOCKED_OUT": return "Clocked out";
    case "CLOCKED_IN":  return "Clocked in";
    case "ON_BREAK":    return "On break";
  }
}

function stateSubheading(s: ClockSnapshot): string {
  if (!s.last_event_at) return "No activity yet.";
  const when = new Date(s.last_event_at).toLocaleString();
  const where = s.last_location_name ? ` at ${s.last_location_name}` : "";
  return `Since ${when}${where}.`;
}

function StatusBanner({
  status, onOverride, onRetry,
}: { status: Status; onOverride: () => void; onRetry: () => void }) {
  if (status.kind === "idle" || status.kind === "locating") return null;

  if (status.kind === "low_accuracy") {
    return (
      <Card>
        <CardContent>
          <p className="font-medium">GPS accuracy too low.</p>
          <p className="text-sm text-muted-foreground">
            Your fix was &plusmn;{Math.round(status.accuracy_m)} m. Step outside, wait a moment, then try again.
          </p>
          <Button onClick={onRetry} variant="secondary" className="mt-3">OK</Button>
        </CardContent>
      </Card>
    );
  }

  if (status.kind === "out_of_zone") {
    return (
      <Card>
        <CardContent>
          <p className="font-medium">Out of zone.</p>
          <p className="text-sm text-muted-foreground">
            You're {Math.round(status.distance_m)} m from the location (radius {status.radius_m} m).
            Request manager approval to clock in anyway.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={onOverride}>Request override</Button>
            <Button onClick={onRetry} variant="ghost">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.kind === "permission_denied") {
    return (
      <Card>
        <CardContent>
          <p className="font-medium">Location permission denied.</p>
          <p className="text-sm text-muted-foreground">
            Enable location access for this site in your browser settings, then try again.
          </p>
          <Button onClick={onRetry} variant="secondary" className="mt-3">OK</Button>
        </CardContent>
      </Card>
    );
  }

  if (status.kind === "position_unavailable") {
    return (
      <Card>
        <CardContent>
          <p className="font-medium">Couldn't determine your location.</p>
          <p className="text-sm text-muted-foreground">
            Make sure Wi-Fi and location services are on, then try again.
          </p>
          <Button onClick={onRetry} variant="secondary" className="mt-3">OK</Button>
        </CardContent>
      </Card>
    );
  }

  if (status.kind === "queued") {
    return (
      <Card>
        <CardContent>
          <p className="font-medium">Saved offline.</p>
          <p className="text-sm text-muted-foreground">
            Will sync to the server when you're back online.
          </p>
          <Button onClick={onRetry} variant="secondary" className="mt-3">OK</Button>
        </CardContent>
      </Card>
    );
  }

  if (status.kind === "success") {
    return (
      <Card>
        <CardContent>
          <p className="font-medium">Recorded: {ACTION_LABEL[status.type]}.</p>
          <Button onClick={onRetry} variant="secondary" className="mt-3">OK</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <p className="text-sm text-destructive">{status.message}</p>
        <Button onClick={onRetry} variant="secondary" className="mt-3">OK</Button>
      </CardContent>
    </Card>
  );
}
