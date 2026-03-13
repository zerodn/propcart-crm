'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onImageChange: (index: number) => void;
  title?: string;
}

export default function ImageLightbox({
  isOpen,
  images,
  currentIndex,
  onClose,
  onImageChange,
  title,
}: ImageLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [use360View, setUse360View] = useState(true);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen || !containerRef.current || images.length === 0) return;

    const validIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
    const imageUrl = images[validIndex];

    // Only load Photo Sphere Viewer if 360 mode is enabled
    if (use360View) {
      import('@photo-sphere-viewer/core').then((PSV) => {
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        if (containerRef.current) {
          try {
            viewerRef.current = new PSV.Viewer({
              container: containerRef.current,
              panorama: imageUrl,
              caption: title || '',
              navbar: 'bottom',
            });
          } catch (err) {
            console.error('Error creating Photo Sphere Viewer:', err);
            setUse360View(false);
          }
        }
      }).catch((err) => {
        console.error('Error loading Photo Sphere Viewer:', err);
        setUse360View(false);
      });
    }

    return () => {
      if (viewerRef.current && use360View) {
        try {
          viewerRef.current.destroy();
        } catch (err) {
          console.error('Error destroying viewer:', err);
        }
        viewerRef.current = null;
      }
    };
  }, [isOpen, images, currentIndex, title, use360View]);

  const handlePrevImage = () => {
    const newIndex = (currentIndex - 1 + images.length) % images.length;
    setRotation(0);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    onImageChange(newIndex);
  };

  const handleNextImage = () => {
    const newIndex = (currentIndex + 1) % images.length;
    setRotation(0);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    onImageChange(newIndex);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 1));
  };

  // Mouse wheel zoom
  const handleMouseWheel = (e: WheelEvent) => {
    if (use360View || !imageWrapperRef.current) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(1, Math.min(prev + delta, 3)));
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (use360View || zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageWrapperRef.current) return;
    
    const maxPanX = (imageWrapperRef.current.offsetWidth * zoom) / 2 - imageWrapperRef.current.offsetWidth / 2;
    const maxPanY = (imageWrapperRef.current.offsetHeight * zoom) / 2 - imageWrapperRef.current.offsetHeight / 2;

    let newPanX = e.clientX - dragStart.x;
    let newPanY = e.clientY - dragStart.y;

    newPanX = Math.max(-maxPanX, Math.min(newPanX, maxPanX));
    newPanY = Math.max(-maxPanY, Math.min(newPanY, maxPanY));

    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  useEffect(() => {
    if (!imageWrapperRef.current) return;
    
    const wheelHandler = (e: WheelEvent) => handleMouseWheel(e);
    imageWrapperRef.current.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      imageWrapperRef.current?.removeEventListener('wheel', wheelHandler);
    };
  }, [use360View, zoom]);

  if (!isOpen || images.length === 0) return null;

  const validIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const currentImage = images[validIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm h-16">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-white font-semibold text-sm">{title || 'Xem ảnh'}</h2>
          <span className="text-white/60 text-sm">
            {validIndex + 1} / {images.length}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* 360 View Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition cursor-pointer">
            <input
              type="checkbox"
              checked={use360View}
              onChange={(e) => {
                setUse360View(e.target.checked);
                setRotation(0);
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-white text-xs font-medium">View 360</span>
          </label>

          {/* Zoom buttons - only show in 2D mode */}
          {!use360View && (
            <>
              <button
                onClick={handleZoomOut}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition disabled:opacity-50"
                title="Thu nhỏ ảnh"
                disabled={zoom <= 1}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white text-xs px-2 bg-white/20 rounded-lg py-1.5 min-w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition disabled:opacity-50"
                title="Phóng to ảnh"
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Rotate button - only show in 2D mode */}
          {!use360View && (
            <button
              onClick={handleRotate}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition relative"
              title="Xoay hình (0°, 90°, 180°, 270°)"
            >
              <RotateCw className="w-5 h-5" />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-xs rounded px-1 font-medium min-w-max">
                {rotation}°
              </span>
            </button>
          )}

          {/* Previous image */}
          {images.length > 1 && (
            <button
              onClick={handlePrevImage}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              title="Ảnh trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next image */}
          {images.length > 1 && (
            <button
              onClick={handleNextImage}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              title="Ảnh tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            title="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Viewer Container */}
      <div className="flex-1 bg-black overflow-hidden flex items-center justify-center">
        {use360View ? (
          // 360 Panoramic Viewer
          <div ref={containerRef} className="w-full h-full" />
        ) : (
          // 2D Flat Image Viewer with Zoom and Pan
          <div 
            ref={imageWrapperRef}
            className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
            onMouseDown={handleMouseDown}
          >
            <div
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom}) translate(${panX}px, ${panY}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                transformOrigin: 'center',
                position: 'relative',
                width: '80%',
                height: '80%',
              }}
            >
              <Image
                src={currentImage}
                alt={title || 'Image'}
                fill
                className="object-contain select-none pointer-events-none"
                priority
                draggable={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
