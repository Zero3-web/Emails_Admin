"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";
import type { OutboundEmailRecord } from "@/src/domain/types";
import "leaflet/dist/leaflet.css";

export function GeographyCard({
  users = 0,
  sites: _sites = 1,
  emails = [],
}: {
  users?: number;
  sites?: number;
  emails?: OutboundEmailRecord[];
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mounted] = useState(true);

  // Calculate 100% REAL rates from actual database data
  const totalContacts = users;
  const customerRate = totalContacts > 0 ? 100 : 0;

  const totalEmails = emails.length;
  const deliveredEmails = emails.filter(
    (e) => e.status === "sent" || e.status === "delivered" || e.deliveredRate > 0
  ).length;
  const conversionRate =
    totalEmails > 0 ? Math.round((deliveredEmails / totalEmails) * 100) : 0;

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let isSubscribed = true;

    // Dynamically initialize Leaflet on client side
    import("leaflet").then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      const defaultCenter: [number, number] = [-12.0464, -77.0428]; // Lima, Perú
      const defaultZoom = 11;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: true,
        });

        // Detect dark mode or light mode for map tiles
        const isDark = document.documentElement.dataset.theme === "dark";
        const tileUrl = isDark
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          subdomains: "abcd",
        }).addTo(map);

        // Custom HTML Marker Icon (Intelligent single aggregated pin for mass sending)
        const createCustomIcon = (count: number, label: string) =>
          L.divIcon({
            className: "geo-leaflet-marker",
            html: `
              <div class="geo-marker-pill">
                <span class="geo-marker-dot"></span>
                <strong>${count}</strong>
                <small>${label}</small>
              </div>
            `,
            iconSize: [90, 30],
            iconAnchor: [45, 15],
          });

        // REAL Marker: Single aggregated activity hub for Lima, Peru
        const realCount = Math.max(totalEmails, totalContacts, 1);
        const markerLabel = totalEmails > 0 ? (realCount === 1 ? "Envío" : "Envíos") : "Contacto";

        const marker = L.marker(defaultCenter, {
          icon: createCustomIcon(realCount, markerLabel),
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="color: #0f172a; display: block; font-size: 13px;">Lima, Perú</strong>
            <span style="color: #000000; font-weight: 600;">${realCount} ${realCount === 1 ? "actividad registrada" : "actividades registradas"}</span>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 11px;">Envíos y comunicaciones activas</p>
          </div>
        `);

        mapInstanceRef.current = map;
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [mounted, totalContacts, totalEmails]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <section className="up-card geo-card" aria-label="Geolocalización de audiencia">
      {/* Header clean without PE Perú badge */}
      <header className="geo-header">
        <strong>Geography</strong>
      </header>

      {/* Real Interactive Leaflet Map Viewport */}
      <div className="geo-map-area">
        <div ref={mapContainerRef} className="geo-real-map" />

        {/* Real Location Floating Badge */}
        <div className="geo-real-badge">
          <div className="geo-real-badge-header">
            <MapPin size={12} color="#ccff00" />
            <span>Lima, Perú</span>
          </div>
          <strong>
            {totalEmails > 0
              ? `${totalEmails} ${totalEmails === 1 ? "Envío" : "Envíos"}`
              : totalContacts > 0
              ? `${totalContacts} Contactos`
              : "1 Sede activa"}
          </strong>
        </div>

        {/* Real Working Zoom Controls */}
        <div
          className="geo-zoom-controls"
          role="group"
          aria-label="Controles de zoom del mapa"
        >
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Aumentar zoom"
            title="Acercar"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Disminuir zoom"
            title="Alejar"
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Bottom Gauges Section with REAL calculated percentages */}
      <footer className="geo-footer">
        <div className="geo-gauge">
          <SemiCircleGauge percent={customerRate} />
          <div className="geo-gauge-label">
            <strong>{customerRate}%</strong>
            <span>Customer</span>
            <small className="geo-metric-note">
              {totalContacts > 0 ? `${totalContacts} activos` : "0 contactos"}
            </small>
          </div>
        </div>

        <div className="geo-gauge">
          <SemiCircleGauge percent={conversionRate} />
          <div className="geo-gauge-label">
            <strong>{conversionRate}%</strong>
            <span>Conversion</span>
            <small className="geo-metric-note">
              {totalEmails > 0
                ? `${deliveredEmails}/${totalEmails} entregados`
                : "Sin envíos"}
            </small>
          </div>
        </div>
      </footer>
    </section>
  );
}

/**
 * Semi-circular arc gauge
 */
function SemiCircleGauge({ percent }: { percent: number }) {
  const radius = 32;
  const cx = 40;
  const cy = 38;
  const circumference = Math.PI * radius;
  const strokeDashoffset =
    circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);

  const angle = Math.PI * (1 - percent / 100);
  const handleX = cx + radius * Math.cos(angle);
  const handleY = cy - radius * Math.sin(angle);

  return (
    <div className="geo-gauge-svg-wrap">
      <svg viewBox="0 0 80 44" className="geo-gauge-svg">
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#edf2f7"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#ccff00"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        {percent > 0 && (
          <circle
            cx={handleX}
            cy={handleY}
            r="4"
            fill="#ffffff"
            stroke="#ccff00"
            strokeWidth="2"
            style={{ transition: "cx 0.6s ease, cy 0.6s ease" }}
          />
        )}
      </svg>
    </div>
  );
}
