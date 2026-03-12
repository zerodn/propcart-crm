'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { MediaItem } from '@/hooks/use-project';

const ReactPhotoSphereViewer = dynamic(
  () => import('react-photo-sphere-viewer').then((mod) => mod.ReactPhotoSphereViewer),
  { ssr: false },
);

interface TowerCamera360ViewerProps {
  items: MediaItem[];
}

export function TowerCamera360Viewer({ items }: TowerCamera360ViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex >= items.length) {
      setActiveIndex(items.length - 1);
    }
  }, [items, activeIndex]);

  const activeItem = useMemo(() => {
    if (items.length === 0) return null;
    return items[activeIndex] ?? items[0];
  }, [items, activeIndex]);

  if (!activeItem) return null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
        <ReactPhotoSphereViewer
          key={activeItem.originalUrl}
          src={activeItem.originalUrl}
          height={'420px'}
          width={'100%'}
          navbar={[
            'zoom',
            'move',
            'download',
            'caption',
            'fullscreen',
          ]}
          caption={activeItem.fileName || 'Ảnh toàn cảnh 360'}
          defaultZoomLvl={0}
          moveInertia
          mousewheel
        />
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`${item.originalUrl}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`overflow-hidden rounded-lg border bg-white text-left transition ${
                  isActive ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl || item.originalUrl}
                  alt={item.fileName || `Ảnh 360 ${index + 1}`}
                  className="h-14 w-24 object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
