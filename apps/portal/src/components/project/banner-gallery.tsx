'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';
import ImageLightbox from './image-lightbox';

const ANIM_CLASSES = [
  'animate-fade',
  'animate-slide-from-right',
  'animate-slide-from-left',
  'animate-zoom-in',
  'animate-zoom-out',
];

interface BannerGalleryProps {
  images: string[];
  projectName: string;
}

export default function BannerGallery({ images, projectName }: BannerGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [animClass, setAnimClass] = useState('animate-fade');

  // Auto-slide every 3 seconds with random animation
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setAnimClass(ANIM_CLASSES[Math.floor(Math.random() * ANIM_CLASSES.length)]);
      setSlideOffset((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length]);

  const handleImageClick = (idx: number) => {
    setLightboxImageIndex(idx);
    setLightboxOpen(true);
  };

  const getImg = (offset: number) => images[(slideOffset + offset) % images.length];
  const getIdx = (offset: number) => (slideOffset + offset) % images.length;

  if (images.length === 0) {
    return (
      <div className="w-full bg-black relative overflow-hidden" style={{ height: '50vh' }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <span className="text-5xl">🏗️</span>
            <p className="mt-3 text-sm text-gray-400">Chưa có ảnh</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-width black banner, max height 1/2 screen */}
      <div className="w-full bg-black relative overflow-hidden" style={{ height: '50vh' }}>
        <div className="flex h-full gap-1 p-1">
          {/* Left large image */}
          <div
            className="relative flex-1 overflow-hidden rounded-sm cursor-pointer group"
            onClick={() => handleImageClick(getIdx(0))}
          >
            <Image
              key={getImg(0)}
              src={getImg(0)}
              alt={`${projectName} - 1`}
              fill
              className={`object-cover ${animClass}`}
              priority
            />
            <div className="absolute inset-0 group-hover:bg-black/15 transition" />
          </div>

          {/* Center large image */}
          {images.length >= 2 && (
            <div
              className="relative flex-1 overflow-hidden rounded-sm cursor-pointer group"
              onClick={() => handleImageClick(getIdx(1))}
            >
              <Image
                key={getImg(1)}
                src={getImg(1)}
                alt={`${projectName} - 2`}
                fill
                className={`object-cover ${animClass}`}
              />
              <div className="absolute inset-0 group-hover:bg-black/15 transition" />
            </div>
          )}

          {/* Right column: 2 stacked small images */}
          {images.length >= 3 && (
            <div className="flex flex-col gap-1" style={{ width: '22%' }}>
              {/* Top-right image */}
              <div
                className="relative flex-1 overflow-hidden rounded-sm cursor-pointer group"
                onClick={() => handleImageClick(getIdx(2))}
              >
                <Image
                  key={getImg(2)}
                  src={getImg(2)}
                  alt={`${projectName} - 3`}
                  fill
                  className={`object-cover ${animClass}`}
                />
                <div className="absolute inset-0 group-hover:bg-black/15 transition" />
              </div>

              {/* Bottom-right image */}
              {images.length >= 4 && (
                <div
                  className="relative flex-1 overflow-hidden rounded-sm cursor-pointer group"
                  onClick={() => handleImageClick(getIdx(3))}
                >
                  <Image
                    key={getImg(3)}
                    src={getImg(3)}
                    alt={`${projectName} - 4`}
                    fill
                    className={`object-cover ${animClass}`}
                  />
                  <div className="absolute inset-0 group-hover:bg-black/15 transition" />

                  {/* View all badge */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleImageClick(0); }}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition z-10"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Xem tất cả ({images.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slide dots indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideOffset(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === slideOffset ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        images={images}
        currentIndex={lightboxImageIndex}
        onClose={() => setLightboxOpen(false)}
        onImageChange={(idx) => setLightboxImageIndex(idx)}
        title={projectName}
      />
    </>
  );
}
