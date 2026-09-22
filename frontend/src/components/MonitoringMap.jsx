import { useMemo, useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const markerIcon = (risk) => {
  const riskStr = String(risk || 'SAFE').toUpperCase();
  const isHighRisk = riskStr.includes("HIGH") || riskStr.includes("DANGER");
  return L.divIcon({
    className: "custom-marker",
    html: `<span class="marker-pin ${riskStr.toLowerCase()} ${isHighRisk ? "high-risk-pulse" : ""}"><i></i></span>`,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
  });
};

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.lat != null && coords.lng != null) {
      map.setView([coords.lat, coords.lng], 12, { animate: true });
    }
  }, [coords, map]);
  return null;
}

export default function MonitoringMap({ sites = [], filter = "ALL", onSelect, onMapClick, clickedCoords }) {
  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? sites
        : sites.filter((site) => site.riskLevel === filter || site.risk === filter),
    [sites, filter],
  );

  const initialCenter = clickedCoords
    ? [clickedCoords.lat, clickedCoords.lng]
    : sites.length > 0 && sites[0].latitude
      ? [sites[0].latitude, sites[0].longitude]
      : [11.353, 76.795];

  return (
    <div className="map-shell">
      <MapContainer
        center={initialCenter}
        zoom={8}
        scrollWheelZoom
        className="command-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <RecenterMap coords={clickedCoords} />

        {clickedCoords && (
          <Marker
            position={[clickedCoords.lat, clickedCoords.lng]}
            icon={L.divIcon({
              className: "custom-marker",
              html: `<span class="marker-pin new-location" style="background:#3b82f6;"><i></i></span>`,
              iconSize: [28, 34],
              iconAnchor: [14, 34],
            })}
          >
            <Popup>
              <strong>Selected Point</strong>
              <br />
              Lat: {clickedCoords.lat.toFixed(5)}, Lng: {clickedCoords.lng.toFixed(5)}
            </Popup>
          </Marker>
        )}

        {filtered.map((site) => (
          <Marker
            key={site.id}
            position={[site.latitude, site.longitude]}
            icon={markerIcon(site.riskLevel || site.risk)}
            eventHandlers={{ click: () => onSelect && onSelect(site) }}
          >
            <Popup>
              <strong>{site.name || site.siteName}</strong>
              <br />
              {site.location}
              <br />
              <b>{site.risk || site.riskLevel}</b>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-overlay-label">
        GIS MONITORING MAP <span>USER LOCATIONS</span>
      </div>
      <div className="map-coordinates">
        {clickedCoords
          ? `SELECTED: ${clickedCoords.lat.toFixed(4)}°N, ${clickedCoords.lng.toFixed(4)}°E`
          : 'CLICK ANY POINT ON MAP OR SEARCH TO ANALYZE'}
      </div>
    </div>
  );
}
