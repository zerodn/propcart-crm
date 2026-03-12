'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type * as LeafletType from 'leaflet';
import { X, MapPin, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { FloorPlanImage, FloorPlanMarker, TowerFundProduct } from '@/hooks/use-project';

interface TowerFloorPlanEditorProps {
  isOpen: boolean;
  image: FloorPlanImage;
  fundProducts: TowerFundProduct[];
  onSave: (updated: FloorPlanImage) => void;
  onClose: () => void;
}

interface ImageSize {
  width: number;
  height: number;
}

const MIN_ZOOM = -5;
const MAX_ZOOM = 5;
const VIEW_PADDING_RATIO = 0.04;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function TowerFloorPlanEditor({
  isOpen,
  image,
  fundProducts,
  onSave,
  onClose,
}: TowerFloorPlanEditorProps) {
  const [markers, setMarkers] = useState<FloorPlanMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [zoomLabel, setZoomLabel] = useState('1.00x');
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const overlayRef = useRef<LeafletType.ImageOverlay | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  // Reset local marker state when opening editor for an image
  useEffect(() => {
    if (!isOpen) return;
    setMarkers(image.markers ? image.markers.map((m) => ({ ...m })) : []);
    setSelectedMarkerId(null);
  }, [isOpen, image.originalUrl]);

  // Load image natural dimensions once, then use those as map coordinate bounds
  useEffect(() => {
    if (!isOpen) return;
    setLoadingMap(true);
    setImageSize(null);
    setMapReady(false);

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setLoadingMap(false);
    };
    img.src = image.originalUrl;
  }, [isOpen, image.originalUrl]);

  const markerToLatLng = useCallback(
    (marker: FloorPlanMarker) => {
      if (!imageSize) return { lat: 0, lng: 0 };
      return {
        lat: (marker.y / 100) * imageSize.height,
        lng: (marker.x / 100) * imageSize.width,
      };
    },
    [imageSize],
  );

  const latLngToMarkerPct = useCallback(
    (lat: number, lng: number) => {
      if (!imageSize) return { x: 0, y: 0 };
      return {
        x: clamp((lng / imageSize.width) * 100, 0, 100),
        y: clamp((lat / imageSize.height) * 100, 0, 100),
      };
    },
    [imageSize],
  );

  // Init Leaflet map (CRS.Simple) and mount image overlay at origin [0, 0]
  useEffect(() => {
    if (!isOpen || !imageSize || !mapContainerRef.current) return;

    let mounted = true;

    const initMap = async () => {
      const L = leafletRef.current ?? (await import('leaflet'));
      leafletRef.current = L;

      if (!mounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        crs: L.CRS.Simple,
        zoomControl: false,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        attributionControl: false,
        // Smoother wheel/pinch zoom on Mac trackpad
        scrollWheelZoom: 'center',
        zoomSnap: 0,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 180,
        maxBoundsViscosity: 1,
        bounceAtZoomLimits: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });

      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);

      const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(imageSize.height, imageSize.width));
      const viewBounds = bounds.pad(VIEW_PADDING_RATIO);

      overlayRef.current = L.imageOverlay(image.originalUrl, bounds).addTo(map);

      // Enforce strict bounds so image corners cannot drift outside viewport.
      const enforceViewportWithinImage = () => {
        const strictMinZoom = map.getBoundsZoom(viewBounds, true);
        map.setMinZoom(strictMinZoom);
        if (map.getZoom() < strictMinZoom) {
          map.setZoom(strictMinZoom, { animate: false });
        }
        map.panInsideBounds(viewBounds, { animate: false });
      };

      map.setMaxBounds(viewBounds);
      map.fitBounds(viewBounds, { animate: false });
      enforceViewportWithinImage();

      const updateZoomLabel = () => {
        const scale = map.getZoomScale(map.getZoom(), 0);
        setZoomLabel(`${scale.toFixed(2)}x`);
      };
      updateZoomLabel();
      map.on('zoomend', updateZoomLabel);
      map.on('zoomend', enforceViewportWithinImage);
      map.on('moveend', enforceViewportWithinImage);
      map.on('resize', enforceViewportWithinImage);

      map.on('click', (e: LeafletType.LeafletMouseEvent) => {
        const coords = latLngToMarkerPct(e.latlng.lat, e.latlng.lng);
        const newMarker: FloorPlanMarker = {
          id: crypto.randomUUID(),
          x: coords.x,
          y: coords.y,
        };
        setMarkers((prev) => [...prev, newMarker]);
        setSelectedMarkerId(newMarker.id);
      });

      setMapReady(true);
      setLoadingMap(false);
    };

    initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
      overlayRef.current = null;
      setMapReady(false);
    };
  }, [isOpen, image.originalUrl, imageSize, latLngToMarkerPct]);

  // Render / re-render marker layer from state
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    const L = leafletRef.current;
    if (!mapReady || !map || !layer || !L || !imageSize) return;

    layer.clearLayers();

    markers.forEach((marker, index) => {
      const latLng = markerToLatLng(marker);
      const isSelected = selectedMarkerId === marker.id;
      const markerColor = marker.productId ? '#16a34a' : isSelected ? '#d97706' : '#3b82f6';

      const icon = L.divIcon({
        className: 'floor-plan-marker-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:${markerColor};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25)">${index + 1}</div>`,
      });

      const leafletMarker = L.marker([latLng.lat, latLng.lng], {
        icon,
        draggable: true,
      }).addTo(layer);

      leafletMarker.on('click', () => setSelectedMarkerId(marker.id));
      leafletMarker.on('dragend', () => {
        const pos = leafletMarker.getLatLng();
        const coords = latLngToMarkerPct(pos.lat, pos.lng);
        setMarkers((prev) =>
          prev.map((m) => (m.id === marker.id ? { ...m, x: coords.x, y: coords.y } : m)),
        );
      });
    });
  }, [mapReady, markers, selectedMarkerId, imageSize, markerToLatLng, latLngToMarkerPct]);

  const updateMarkerProduct = (markerId: string, product: TowerFundProduct | null) => {
    setMarkers((prev) =>
      prev.map((m) =>
        m.id === markerId
          ? {
              ...m,
              productId: product?.productId,
              productUnitCode: product?.unitCode,
              productName: product?.name,
            }
          : m,
      ),
    );
  };

  const removeMarker = (markerId: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
    if (selectedMarkerId === markerId) setSelectedMarkerId(null);
  };

  const fitToImage = () => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !imageSize) return;
    const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(imageSize.height, imageSize.width));
    map.fitBounds(bounds, { padding: [24, 24] });
  };

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[10025] flex flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Đặt vị trí sản phẩm</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {image.fileName || 'Mặt bằng'} · Click map để thêm marker · Kéo marker để di chuyển
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center divide-x divide-gray-300 overflow-hidden rounded-lg border border-gray-300">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut(0.5)}
              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[58px] px-2.5 py-1.5 text-center text-xs font-medium tabular-nums text-gray-700">
              {zoomLabel}
            </span>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn(0.5)}
              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
              aria-label="Phóng to"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={fitToImage}
              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
              aria-label="Khớp màn hình"
              title="Khớp màn hình"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({ ...image, markers });
              onClose();
            }}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Lưu vị trí
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 flex-1 bg-gray-900">
          <div ref={mapContainerRef} className="h-full w-full" />

          {loadingMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            </div>
          )}
        </div>

        <div className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">Marker trên hình</p>
            <p className="mt-0.5 text-xs text-gray-500">{markers.length} điểm đã đặt</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {markers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                <MapPin className="h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">Click vào map để thêm marker</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {markers.map((marker, index) => {
                  const isSelected = selectedMarkerId === marker.id;
                  return (
                    <div
                      key={marker.id}
                      className={`cursor-pointer px-4 py-3 transition-colors ${
                        isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedMarkerId(marker.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                              marker.productId ? 'bg-green-600' : 'bg-blue-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            {marker.productId ? (
                              <>
                                <p className="truncate text-xs font-medium text-gray-800">
                                  {marker.productUnitCode}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {marker.productName}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs italic text-gray-400">Chưa gán sản phẩm</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMarker(marker.id);
                          }}
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          aria-label="Xoá marker"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isSelected && (
                        <div className="mt-2">
                          <select
                            value={marker.productId || ''}
                            onChange={(e) => {
                              const product =
                                fundProducts.find((p) => p.productId === e.target.value) ?? null;
                              updateMarkerProduct(marker.id, product);
                            }}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">— Chọn sản phẩm —</option>
                            {fundProducts.map((p) => (
                              <option key={p.productId} value={p.productId}>
                                {p.unitCode} - {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-green-700">●</span> Đã gán sản phẩm &nbsp;
              <span className="font-medium text-blue-500">●</span> Chưa gán
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
