export type ClockState = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
export type ClockEventType = "IN" | "OUT" | "BREAK_START" | "BREAK_END";

export const NEXT_ACTIONS: Record<ClockState, ClockEventType[]> = {
  CLOCKED_OUT: ["IN"],
  CLOCKED_IN: ["OUT", "BREAK_START"],
  ON_BREAK: ["BREAK_END"],
};

export type ClockSnapshot = {
  state: ClockState;
  last_event_id: string | null;
  last_event_type: ClockEventType | null;
  last_event_at: string | null;
  last_location_id: string | null;
  last_location_name: string | null;
};

export type RecentEvent = {
  id: string;
  type: ClockEventType;
  event_at: string;
  location_id: string;
  location_name: string;
  flags: string[];
};

export type AssignedLocation = {
  id: string;
  name: string;
  is_primary: boolean;
  lat: number;
  lng: number;
  radius_m: number;
};

export type ClockAttemptInput = {
  type: ClockEventType;
  location_id: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  captured_at: string;
};

export type ClockAttemptResult =
  | { ok: true; event_id: string }
  | { ok: false; reason: "LOW_ACCURACY"; accuracy_m: number }
  | { ok: false; reason: "OUT_OF_ZONE"; distance_m: number; radius_m: number }
  | { ok: false; reason: "NOT_ASSIGNED" }
  | { ok: false; reason: "INVALID_TRANSITION"; current_state: ClockState }
  | { ok: false; reason: "INVALID_STATE" }
  | { ok: false; reason: "INTERNAL"; message?: string };
