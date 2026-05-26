import { haversineMeters } from "./haversine";

export const MAX_ACCURACY_M = 50;

export type LocationFix = { lat: number; lng: number; accuracy_m: number };
export type Perimeter = { lat: number; lng: number; radius_m: number };

export type GateResult =
  | { kind: "OK"; distance_m: number }
  | { kind: "LOW_ACCURACY"; accuracy_m: number }
  | { kind: "OUT_OF_ZONE"; distance_m: number };

export function evaluateGate(fix: LocationFix, p: Perimeter): GateResult {
  if (fix.accuracy_m > MAX_ACCURACY_M) {
    return { kind: "LOW_ACCURACY", accuracy_m: fix.accuracy_m };
  }
  const distance_m = haversineMeters(fix, { lat: p.lat, lng: p.lng });
  if (distance_m > p.radius_m) {
    return { kind: "OUT_OF_ZONE", distance_m };
  }
  return { kind: "OK", distance_m };
}
