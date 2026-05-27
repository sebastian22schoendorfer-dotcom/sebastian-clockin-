import { describe, expect, it } from "vitest";
import { haversineMeters } from "./haversine";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    const p = { lat: 12.15, lng: -68.27 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it("computes ~3 km between two Bonaire fixtures", () => {
    const waterfront = { lat: 12.1456, lng: -68.2693 };
    const hato = { lat: 12.1733, lng: -68.2778 };
    const d = haversineMeters(waterfront, hato);
    expect(d).toBeGreaterThan(2950);
    expect(d).toBeLessThan(3250);
  });

  it("is symmetric", () => {
    const a = { lat: 12.15, lng: -68.27 };
    const b = { lat: 12.16, lng: -68.26 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 5);
  });
});
