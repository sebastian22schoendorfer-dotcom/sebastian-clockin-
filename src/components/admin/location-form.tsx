"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocation, updateLocation } from "@/app/admin/(shell)/locations/actions";

const MapPinPicker = dynamic(() => import("./map-pin-picker"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-md bg-secondary" />,
});

export type LocationFormInitial = {
  id?: string;
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  radius_m?: number;
  business_day_starts_at?: string;
  timezone?: string;
};

export function LocationForm({ initial, error }: { initial?: LocationFormInitial; error?: string }) {
  const isEdit = !!initial?.id;
  return (
    <form action={isEdit ? updateLocation : createLocation} className="flex max-w-2xl flex-col gap-6">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={initial?.name ?? ""} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" defaultValue={initial?.address ?? ""} />
      </div>

      <MapPinPicker
        initialLat={initial?.lat}
        initialLng={initial?.lng}
        initialRadiusM={initial?.radius_m}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="business_day_starts_at">Business day starts at</Label>
          <Input
            id="business_day_starts_at"
            name="business_day_starts_at"
            type="time"
            defaultValue={initial?.business_day_starts_at ?? "04:00"}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={initial?.timezone ?? "America/Kralendijk"} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}

      <div className="flex gap-3">
        <Button type="submit">{isEdit ? "Save changes" : "Create location"}</Button>
        <Link
          href="/admin/locations"
          className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm hover:bg-secondary"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
