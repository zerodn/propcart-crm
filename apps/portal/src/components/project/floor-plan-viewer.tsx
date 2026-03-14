'use client';

import { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';
import type { FloorPlanImage, FloorPlanMarker } from '@/types/project';

interface FloorPlanViewerProps {
  image: FloorPlanImage;
  onMarkerClick: (marker: FloorPlanMarker) => void;
}

const MIN_ZOOM = -5;
const MAX_ZOOM = 3;

export function FloorPlanViewer({ image, onMarkerClick }: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const init = async () => {
      // Measure natural image dimensions first
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = image.originalUrl;
      }).catch(() => null);

      if (!mounted || !containerRef.current) return;

      const W = img.naturalWidth || 1200;
      const H = img.naturalHeight || 800;

      const L = await import('leaflet');
      if (!mounted || !containerRef.current) return;

      // Destroy existing map if any
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Import Leaflet CSS dynamically
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        zoomControl: false,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        attributionControl: false,
        scrollWheelZoom: true,
        zoomSnap: 0,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 180,
        maxBoundsViscosity: 1,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      mapRef.current = map;

      const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(H, W));
      const viewBounds = bounds.pad(0.05);

      L.imageOverlay(image.originalUrl, bounds).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      const enforceView = () => {
        const minZ = map.getBoundsZoom(viewBounds, true);
        map.setMinZoom(minZ);
        if (map.getZoom() < minZ) map.setZoom(minZ, { animate: false });
        map.panInsideBounds(viewBounds, { animate: false });
      };

      map.setMaxBounds(viewBounds);
      map.fitBounds(viewBounds, { animate: false });
      enforceView();
      map.on('zoomend moveend resize', enforceView);

      // Render markers
      const markers = image.markers ?? [];
      markers.forEach((marker) => {
        const lat = (marker.y / 100) * H;
        const lng = (marker.x / 100) * W;
        const label = marker.productUnitCode || '';
        const hasProduct = !!marker.productId;

        const icon = L.divIcon({
          className: '',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          html: `
            <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              ${label ? `<div style="background:${hasProduct ? '#d97706' : '#6b7280'};color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;margin-bottom:2px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${label}</div>` : ''}
              <div style="width:18px;height:18px;border-radius:50%;background:${hasProduct ? '#d97706' : '#6b7280'};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>
              <div style="width:2px;height:6px;background:${hasProduct ? '#d97706' : '#6b7280'}"></div>
            </div>`,
        });

        const m = L.marker([lat, lng], { icon, interactive: true }).addTo(markersLayerRef.current!);
        m.on('click', () => onMarkerClick(marker));
      });

      setLoading(false);
    };

    setLoading(true);
    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.originalUrl, image.markers]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100" style={{ height: '480px' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-[999] flex flex-col gap-1">
        <button
          onClick={() => mapRef.current?.zoomIn(0.5)}
          className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 text-lg font-light transition"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => mapRef.current?.zoomOut(0.5)}
          className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 text-lg font-light transition"
          aria-label="Zoom out"
        >−</button>
        <button
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            map.fitBounds(map.options.maxBounds as LeafletType.LatLngBounds, { animate: true });
          }}
          className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 transition"
          aria-label="Reset view"
          title="Fit toàn ảnh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
          </svg>
        </button>
      </div>
      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-[999] bg-white/80 text-gray-500 text-[10px] px-2 py-1 rounded-lg border border-gray-200">
        Cuộn để zoom · Kéo để di chuyển
      </div>
    </div>
  );
}
