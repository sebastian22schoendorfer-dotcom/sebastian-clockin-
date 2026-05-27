export type Fix = { lat: number; lng: number; accuracy_m: number; captured_at: string };

export type FixError =
  | { kind: "PERMISSION_DENIED" }
  | { kind: "POSITION_UNAVAILABLE" }
  | { kind: "TIMEOUT" }
  | { kind: "UNSUPPORTED" };

export async function getCurrentFix(timeoutMs = 15_000): Promise<Fix | FixError> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { kind: "UNSUPPORTED" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          captured_at: new Date().toISOString(),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ kind: "PERMISSION_DENIED" });
        else if (err.code === err.TIMEOUT) resolve({ kind: "TIMEOUT" });
        else resolve({ kind: "POSITION_UNAVAILABLE" });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

export function isFix(value: Fix | FixError): value is Fix {
  return typeof (value as Fix).lat === "number";
}
