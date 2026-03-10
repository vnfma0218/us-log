"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"

import type { MarkerItem } from "@/lib/types"

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type MemoriesMapProps = {
  markers: MarkerItem[]
}

function getCenter(markers: MarkerItem[]) {
  if (markers.length === 0) return [37.5665, 126.978] as [number, number]
  const lat = markers.reduce((acc, marker) => acc + marker.latitude, 0) / markers.length
  const lng = markers.reduce((acc, marker) => acc + marker.longitude, 0) / markers.length
  return [lat, lng] as [number, number]
}

export function MemoriesMap({ markers }: MemoriesMapProps) {
  const center = getCenter(markers)

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border">
      <MapContainer center={center} zoom={10} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="space-y-2">
                <p className="font-semibold">{marker.title}</p>
                <p className="text-xs text-zinc-500">{marker.date}</p>
                {marker.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={marker.photoUrl}
                    alt={marker.title}
                    className="h-28 w-full rounded object-cover"
                  />
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
