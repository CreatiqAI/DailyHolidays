"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

export type MapStop = { id: string; name: string; lat: number; lng: number; day: number };

function pin(day: number, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="day-pin" style="background:${active ? "#e8841a" : "#222d6c"}">${day}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ stops, activeDay }: { stops: MapStop[]; activeDay: number | null }) {
  const map = useMap();
  useEffect(() => {
    const focus = activeDay != null ? stops.filter((s) => s.day === activeDay) : [];
    const target = focus.length ? focus : stops;
    if (!target.length) return;
    if (target.length === 1) {
      map.flyTo([target[0].lat, target[0].lng], 12, { duration: 0.8 });
    } else {
      map.flyToBounds(L.latLngBounds(target.map((s) => [s.lat, s.lng])), { padding: [40, 40], maxZoom: 13, duration: 0.8 });
    }
  }, [map, stops, activeDay]);
  return null;
}

export default function RouteMap({
  stops,
  activeDay,
  onSelectDay,
}: {
  stops: MapStop[];
  activeDay: number | null;
  onSelectDay: (day: number) => void;
}) {
  const line = useMemo(() => stops.map((s) => [s.lat, s.lng] as [number, number]), [stops]);
  const center: [number, number] = stops.length ? [stops[0].lat, stops[0].lng] : [3.14, 101.69];

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Polyline positions={line} pathOptions={{ color: "#36479c", weight: 3, opacity: 0.6, dashArray: "6 8" }} />
      {stops.map((s) => (
        <Marker
          key={`${s.id}-${s.day}`}
          position={[s.lat, s.lng]}
          icon={pin(s.day, s.day === activeDay)}
          zIndexOffset={s.day === activeDay ? 1000 : 0}
          eventHandlers={{ click: () => onSelectDay(s.day) }}
        >
          <Popup>
            <strong>Day {s.day}</strong>
            <br />
            {s.name}
          </Popup>
        </Marker>
      ))}
      <FitBounds stops={stops} activeDay={activeDay} />
    </MapContainer>
  );
}
