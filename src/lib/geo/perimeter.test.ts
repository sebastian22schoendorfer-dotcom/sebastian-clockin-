import { describe, expect, it } from "vitest";
import { evaluateGate } from "./perimeter";

const waterfront = { lat: 12.1456, lng: -68.2693, radius_m: 75 };

describe("evaluateGate", () => {
  it("allows a clean fix inside the perimeter", () => {
    const r = evaluateGate({ lat: 12.1456, lng: -68.2693, accuracy_m: 10 }, waterfront);
    expect(r.kind).toBe("OK");
  });

  it("rejects sub-50m accuracy", () => {
    const r = evaluateGate({ lat: 12.1456, lng: -68.2693, accuracy_m: 75 }, waterfront);
    expect(r.kind).toBe("LOW_ACCURACY");
  });

  it("returns OUT_OF_ZONE for points beyond the radius", () => {
    const r = evaluateGate({ lat: 12.1733, lng: -68.2778, accuracy_m: 10 }, waterfront);
    expect(r.kind).toBe("OUT_OF_ZONE");
    if (r.kind === "OUT_OF_ZONE") expect(r.distance_m).toBeGreaterThan(2900);
  });

  it("LOW_ACCURACY takes precedence over OUT_OF_ZONE", () => {
    const r = evaluateGate({ lat: 12.1733, lng: -68.2778, accuracy_m: 100 }, waterfront);
    expect(r.kind).toBe("LOW_ACCURACY");
  });
});
