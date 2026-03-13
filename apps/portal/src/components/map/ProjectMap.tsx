'use client';

import { useEffect, useRef, useState } from 'react';

export interface MapProject {
  id: string;
  name: string;
  latitude?: string | null;
  longitude?: string | null;
  projectType?: string;
  district?: string | null;
  province?: string | null;
  bannerUrl?: string | null;
  slug?: string;
}

interface Props {
  projects: MapProject[];
  flyTo?: { id: string; ts: number } | null;
}

// Vietnam default center
const DEFAULT_CENTER: [number, number] = [16.0, 106.0];
const DEFAULT_ZOOM = 5;

export default function ProjectMap({ projects, flyTo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // ── Init map ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, { zoomControl: false }).setView(
        DEFAULT_CENTER,
        DEFAULT_ZOOM,
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Zoom control bottom-right to leave top-right for our buttons
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 250);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // ── Update markers whenever projects list or map readiness changes ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const valid = projects.filter((p) => {
        const lat = parseFloat(p.latitude ?? '');
        const lng = parseFloat(p.longitude ?? '');
        return !isNaN(lat) && !isNaN(lng);
      });

      const bounds: [number, number][] = [];

      valid.forEach((p) => {
        const lat = parseFloat(p.latitude!);
        const lng = parseFloat(p.longitude!);
        bounds.push([lat, lng]);

        const typeLabel =
          p.projectType === 'HIGH_RISE' ? 'Cao tầng'
          : p.projectType === 'LOW_RISE' ? 'Thấp tầng'
          : p.projectType ?? '';

        const loc = [p.district, p.province].filter(Boolean).join(', ');
        const href = p.slug ? `/du-an/${p.slug}` : '#';
        const img = p.bannerUrl ?? '';

        const popupHtml = `
          <div style="width:260px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:-1px">
            <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit">
              ${
                img
                  ? `<div style="position:relative;height:155px;overflow:hidden;background:#e5e7eb;border-radius:8px 8px 0 0">
                       <img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.background='#94a3b8'" />
                       ${typeLabel ? `<span style="position:absolute;top:8px;left:8px;background:#2563eb;color:#fff;font-size:10px;padding:3px 8px;border-radius:9999px;font-weight:600">${typeLabel}</span>` : ''}
                     </div>`
                  : `<div style="height:70px;background:linear-gradient(135deg,#64748b,#94a3b8);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:28px">🏗️</div>`
              }
              <div style="padding:10px 12px 12px">
                <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:3px;line-height:1.35">${p.name}</div>
                ${loc ? `<div style="font-size:11px;color:#6b7280">${loc}</div>` : ''}
              </div>
            </a>
          </div>`;

        const marker = L.marker([lat, lng])
          .bindPopup(popupHtml, { maxWidth: 280, minWidth: 260, className: 'propcart-popup' })
          .addTo(map);

        // Store id for flyTo lookup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (marker as any)._projectId = p.id;
        markersRef.current.push(marker);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [60, 60] });
      }
    });
  }, [projects, mapReady]);

  // ── Fly to a specific project ──────────────────────────────
  useEffect(() => {
    if (!flyTo || !mapReady || !mapRef.current) return;

    const project = projects.find((p) => p.id === flyTo.id);
    if (!project) return;

    const lat = parseFloat(project.latitude ?? '');
    const lng = parseFloat(project.longitude ?? '');
    if (isNaN(lat) || isNaN(lng)) return;

    mapRef.current.flyTo([lat, lng], 14, { duration: 1.2 });

    const marker = markersRef.current.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m) => (m as any)._projectId === flyTo.id,
    );
    if (marker) {
      setTimeout(() => marker.openPopup(), 1300);
    }
  }, [flyTo, mapReady, projects]);

  return <div ref={containerRef} className="w-full h-full" />;
}
