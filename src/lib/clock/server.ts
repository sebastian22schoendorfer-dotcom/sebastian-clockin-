import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { NEXT_ACTIONS } from "./types";
import type {
  AssignedLocation,
  ClockAttemptInput,
  ClockAttemptResult,
  ClockSnapshot,
  ClockState,
  RecentEvent,
} from "./types";

export async function getClockSnapshot(
  tenant_id: string,
  staff_id: string,
): Promise<ClockSnapshot> {
  const sb = createServiceClient();
  const { data } = await sb.rpc("current_clock_state", {
    p_tenant_id: tenant_id,
    p_staff_id: staff_id,
  });
  const row = (data?.[0] ?? null) as ClockSnapshot | null;
  return (
    row ?? {
      state: "CLOCKED_OUT",
      last_event_id: null,
      last_event_type: null,
      last_event_at: null,
      last_location_id: null,
      last_location_name: null,
    }
  );
}

export async function getRecentEvents(
  tenant_id: string,
  staff_id: string,
  limit = 10,
): Promise<RecentEvent[]> {
  const sb = createServiceClient();
  const { data } = await sb.rpc("recent_clock_events", {
    p_tenant_id: tenant_id,
    p_staff_id: staff_id,
    p_limit: limit,
  });
  return (data ?? []) as RecentEvent[];
}

export async function getAssignedLocations(
  tenant_id: string,
  staff_id: string,
): Promise<AssignedLocation[]> {
  const sb = createServiceClient();
  const { data } = await sb.rpc("staff_assigned_locations", {
    p_tenant_id: tenant_id,
    p_staff_id: staff_id,
  });
  return (data ?? []) as AssignedLocation[];
}

export async function recordClockAttempt(
  tenant_id: string,
  staff_id: string,
  input: ClockAttemptInput,
  current_state: ClockState,
): Promise<ClockAttemptResult> {
  const sb = createServiceClient();

  if (!NEXT_ACTIONS[current_state].includes(input.type)) {
    return { ok: false, reason: "INVALID_TRANSITION", current_state };
  }

  const { data: gate } = await sb.rpc("check_clock_perimeter", {
    p_tenant_id: tenant_id,
    p_staff_id: staff_id,
    p_location_id: input.location_id,
    p_lat: input.lat,
    p_lng: input.lng,
    p_accuracy_m: input.accuracy_m,
  });
  const verdict = (gate?.[0] ?? null) as
    | { verdict: string; distance_m: number | null; radius_m: number | null }
    | null;
  if (!verdict) return { ok: false, reason: "INTERNAL", message: "perimeter check failed" };

  if (verdict.verdict === "LOW_ACCURACY") {
    return { ok: false, reason: "LOW_ACCURACY", accuracy_m: input.accuracy_m };
  }
  if (verdict.verdict === "NOT_ASSIGNED") {
    return { ok: false, reason: "NOT_ASSIGNED" };
  }
  if (verdict.verdict === "OUT_OF_ZONE") {
    return {
      ok: false,
      reason: "OUT_OF_ZONE",
      distance_m: verdict.distance_m ?? 0,
      radius_m: verdict.radius_m ?? 0,
    };
  }

  const { data: row, error } = await sb
    .from("clock_events")
    .insert({
      tenant_id,
      staff_id,
      location_id: input.location_id,
      type: input.type,
      event_at: input.captured_at,
      lat: input.lat,
      lng: input.lng,
      accuracy_m: input.accuracy_m,
      distance_m: verdict.distance_m,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, reason: "INTERNAL", message: error?.message };
  }
  return { ok: true, event_id: row.id };
}
