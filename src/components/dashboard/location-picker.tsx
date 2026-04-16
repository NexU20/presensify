"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Default: UIN Syarif Hidayatullah Jakarta */
const DEFAULT_LAT = -6.3005;
const DEFAULT_LNG = 106.7488;
const DEFAULT_ZOOM = 17;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

type NominatimResponse = {
  display_name?: string;
};

type LocationPickerProps = {
  disabled?: boolean;
  onLocationSelect: (displayName: string) => void;
};

/* Fix Leaflet default marker icon paths broken by bundlers */
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Presensify/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as NominatimResponse;
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export default function LocationPicker({
  disabled = false,
  onLocationSelect,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [coordsLabel, setCoordsLabel] = useState<string | null>(null);

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      if (disabled) return;

      setCoordsLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setGeocoding(true);

      const displayName = await reverseGeocode(lat, lng);

      if (displayName) {
        onLocationSelect(displayName);
      } else {
        onLocationSelect(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }

      setGeocoding(false);
    },
    [disabled, onLocationSelect],
  );

  /* Initialise map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    fixLeafletIcons();

    const map = L.map(containerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([DEFAULT_LAT, DEFAULT_LNG], {
      draggable: true,
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    /* Use ResizeObserver to auto-invalidate when the container size changes */
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only initialise once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Bind click + drag events — re-bind when handleMapClick reference changes */
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      void handleMapClick(e.latlng.lat, e.latlng.lng);
    };

    const onMarkerDragEnd = () => {
      const pos = marker.getLatLng();
      void handleMapClick(pos.lat, pos.lng);
    };

    map.on("click", onMapClick);
    marker.on("dragend", onMarkerDragEnd);

    return () => {
      map.off("click", onMapClick);
      marker.off("dragend", onMarkerDragEnd);
    };
  }, [handleMapClick]);

  /* Update marker draggable state */
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    if (disabled) {
      marker.dragging?.disable();
    } else {
      marker.dragging?.enable();
    }
  }, [disabled]);

  return (
    <div className="grid gap-2">
      {/*
        Wrapper isolates the map's stacking context.
        Disabled state uses filter instead of opacity to avoid
        creating a new stacking context that breaks Leaflet tiles.
      */}
      <div
        className={`relative rounded-[20px] border border-white/10 ${
          disabled ? "pointer-events-none grayscale" : ""
        }`}
      >
        <div
          ref={containerRef}
          className="h-56 w-full rounded-[20px] sm:h-64"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-dim)]">
        <span>
          {coordsLabel
            ? `📍 ${coordsLabel}`
            : "Tap peta untuk pilih lokasi"}
        </span>
        {geocoding && (
          <span className="text-[var(--accent)]">Mengambil alamat...</span>
        )}
      </div>
    </div>
  );
}
