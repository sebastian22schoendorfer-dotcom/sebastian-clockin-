"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

type Props = {
  initialLat?: number;
  initialLng?: number;
  initialRadiusM?: number;
};

const DEFAULT_LAT = 12.1456;
const DEFAULT_LNG = -68.2693;

export default function MapPinPicker({
  initialLat = DEFAULT_LAT,
  initialLng = DEFAULT_LNG,
  initialRadiusM = 75,
}: Props) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radius, setRadius] = useState(initialRadiusM);

  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);

  return (
    <div className="flex flex-col gap-3">
      <div className="h-80 overflow-hidden rounded-md border border-border">
        <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={center}
            icon={defaultIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                setLat(p.lat);
                setLng(p.lng);
              },
            }}
          />
          <Circle center={center} radius={radius} pathOptions={{ color: "#2563eb", weight: 2 }} />
          <ClickHandler onMove={(la, ln) => { setLat(la); setLng(ln); }} />
          <RecenterOnChange lat={lat} lng={lng} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Latitude</span>
          <input
            name="lat"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
            className="h-10 rounded-md border border-input bg-background px-2"
            type="number"
            step="any"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Longitude</span>
          <input
            name="lng"
            value={lng}
            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
            className="h-10 rounded-md border border-input bg-background px-2"
            type="number"
            step="any"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Radius (m)</span>
          <input
            name="radius_m"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10) || 0)}
            className="h-10 rounded-md border border-input bg-background px-2"
            type="number"
            min={25}
            max={1000}
            step={5}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Click the map or drag the pin to set the location. Radius is the geofence used at clock-in.
      </p>
    </div>
  );
}
