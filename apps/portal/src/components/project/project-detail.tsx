'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProject } from '@/hooks/useProject';
import {
  LayoutDashboard, Navigation2, Building2, FolderOpen, HardHat,
  Phone, MessageCircle, FileText, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import BannerGallery from './banner-gallery';
import ImageLightbox from './image-lightbox';
import { SubdivisionsTab } from './subdivisions-tab';

function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // YouTube watch & shorts
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}?rel=0`;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}?rel=0`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('?')[0];
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    // Google Drive
    if (u.hostname === 'drive.google.com') {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
      const openId = u.searchParams.get('id');
      if (openId) return `https://drive.google.com/file/d/${openId}/preview`;
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch {}
  return url;
}

function isEmbeddable(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h.includes('youtube.com') || h.includes('youtube-nocookie.com') ||
           h === 'youtu.be' || h === 'drive.google.com' || h.includes('vimeo.com');
  } catch {}
  return false;
}

function VideoCard({ url, title }: { url: string; title?: string }) {
  const embeddable = isEmbeddable(url);
  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9' }}>
      {embeddable ? (
        <iframe
          src={getEmbedUrl(url)}
          title={title || 'Video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          {title && <p className="text-white/70 text-sm line-clamp-2">{title}</p>}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-4 py-2 rounded-xl transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở trong tab mới
          </a>
        </div>
      )}
      {/* Always-visible escape hatch */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-lg transition"
        aria-label="Mở trong tab mới"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function getGoogleMapEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const isGoogleMaps = host.includes('google.com') || host.includes('maps.google');

    // Already an embed URL
    if (u.pathname.includes('/maps/d/embed') || u.pathname.includes('/maps/embed')) return url;
    if (u.searchParams.get('output') === 'embed') return url;

    // MyMaps custom map (/maps/d/)
    if (u.pathname.includes('/maps/d/')) {
      const mid = u.searchParams.get('mid');
      if (mid) return `https://www.google.com/maps/d/embed?mid=${mid}`;
    }

    if (!isGoogleMaps) return null;

    // google.com/maps URLs with @lat,lng,zoom in path
    const coordMatch = url.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+),(\d+(?:\.\d+)?z?)/);
    if (coordMatch) {
      const zoom = coordMatch[3].replace('z', '');
      return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=${zoom}&output=embed`;
    }

    // ?q= or &q= query parameter
    const q = u.searchParams.get('q');
    if (q) {
      const params = new URLSearchParams({ q, output: 'embed' });
      return `https://maps.google.com/maps?${params.toString()}`;
    }

    // Fallback: just append output=embed to the original URL
    const fallback = new URL(url);
    fallback.searchParams.set('output', 'embed');
    return fallback.toString();
  } catch {}
  return null;
}

const IMAGE_URL_RE = /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i;
function isImageUrl(url: string) { return IMAGE_URL_RE.test(url.split('?')[0]); }

function SafeImg({ src, alt, className, onClick }: {
  src?: string; alt: string; className?: string; onClick?: () => void;
}) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${className ?? ''}`}
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : undefined}
      >
        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      onError={() => setErrored(true)}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    />
  );
}

interface CarouselItem { originalUrl: string; fileName?: string; description?: string; }

function InfiniteCarousel({
  items, label, onOpen,
}: {
  items: CarouselItem[];
  label: string;
  onOpen: (images: string[], index: number) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [order, setOrder] = useState<CarouselItem[]>(() => [...items]);
  const [activeIdx, setActiveIdx] = useState(0);

  if (items.length === 0) return null;

  const allUrls = items.map((img) => img.originalUrl);

  // Static grid for <= 3 items (nothing to loop)
  if (items.length <= 3) {
    return (
      <div className="flex gap-3">
        {items.map((img, i) => (
          <div key={i} className="flex-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            <div className="relative w-full aspect-[4/3] bg-gray-200">
              <SafeImg
                src={img.originalUrl}
                alt={img.description || img.fileName || `${label} ${i + 1}`}
                className="object-cover"
                onClick={() => onOpen(allUrls, i)}
              />
            </div>
            {(img.description || img.fileName) && (
              <p className="text-xs text-gray-700 font-medium px-3 py-2 text-center line-clamp-2">
                {img.description || img.fileName}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  const getItemW = () => (outerRef.current?.offsetWidth ?? 300) / 3;

  const next = () => {
    if (busyRef.current || !trackRef.current) return;
    busyRef.current = true;
    const track = trackRef.current;
    const w = getItemW();
    track.style.transition = 'transform 400ms ease-in-out';
    track.style.transform = `translateX(-${w}px)`;
    track.addEventListener('transitionend', () => {
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      setOrder((prev) => { const a = [...prev]; a.push(a.shift()!); return a; });
      setActiveIdx((prev) => (prev + 1) % items.length);
      busyRef.current = false;
    }, { once: true });
  };

  const prev = () => {
    if (busyRef.current || !trackRef.current) return;
    busyRef.current = true;
    const w = getItemW();
    setOrder((prev) => { const a = [...prev]; a.unshift(a.pop()!); return a; });
    setActiveIdx((prev) => (prev - 1 + items.length) % items.length);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) { busyRef.current = false; return; }
      track.style.transition = 'none';
      track.style.transform = `translateX(-${w}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        track.style.transition = 'transform 400ms ease-in-out';
        track.style.transform = 'translateX(0)';
        track.addEventListener('transitionend', () => { busyRef.current = false; }, { once: true });
      }));
    }));
  };

  return (
    <div>
      <div ref={outerRef} className="relative overflow-hidden rounded-xl">
        <div ref={trackRef} className="flex">
          {order.map((img, i) => {
            const origIdx = items.findIndex((it) => it.originalUrl === img.originalUrl);
            return (
              <div key={i} className="flex-shrink-0 w-1/3 px-1.5">
                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                  <div className="relative w-full aspect-[4/3] bg-gray-200">
                    <SafeImg
                      src={img.originalUrl}
                      alt={img.description || img.fileName || `${label} ${i + 1}`}
                      className="object-cover"
                      onClick={() => onOpen(allUrls, origIdx >= 0 ? origIdx : i)}
                    />
                  </div>
                  {(img.description || img.fileName) && (
                    <p className="text-xs text-gray-700 font-medium px-3 py-2 text-center line-clamp-2">
                      {img.description || img.fileName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={prev} className="absolute left-1 top-[40%] -translate-y-1/2 bg-white/90 hover:bg-white shadow-md text-gray-800 p-2 rounded-full z-10 transition" aria-label="Trước">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={next} className="absolute right-1 top-[40%] -translate-y-1/2 bg-white/90 hover:bg-white shadow-md text-gray-800 p-2 rounded-full z-10 transition" aria-label="Tiếp">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Ảnh ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              activeIdx === i ? 'bg-amber-700 w-5 h-2' : 'bg-gray-300 w-2 h-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type TabId = 'overview' | 'location' | 'subdivisions' | 'documents' | 'progress';

const TABS: { id: TabId; label: string; Icon: any }[] = [
  { id: 'overview',     label: 'Tổng quan',          Icon: LayoutDashboard },
  { id: 'location',     label: 'Vị trí',              Icon: Navigation2 },
  { id: 'subdivisions', label: 'Các phân khu',        Icon: Building2 },
  { id: 'documents',    label: 'Kho tài liệu',        Icon: FolderOpen },
  { id: 'progress',     label: 'Tiến độ thi công',    Icon: HardHat },
];

interface ProjectDetailProps {
  projectId: string;
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { project, loading, error } = useProject(projectId);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [imageList, setImageList] = useState<string[]>([]);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbImages, setLbImages] = useState<string[]>([]);
  const [lbIndex, setLbIndex] = useState(0);
  const openLb = (images: string[], index: number) => { setLbImages(images); setLbIndex(index); setLbOpen(true); };
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(0);
  const [selectedAmenity, setSelectedAmenity] = useState(0);
  const [docSearch, setDocSearch] = useState('');
  const [selectedProgressIndex, setSelectedProgressIndex] = useState(0);
  const [progressVideoIndex, setProgressVideoIndex] = useState(0);
  const planningStatsRef = useRef<HTMLDivElement>(null);
  const [sidebarTop, setSidebarTop] = useState(80);


  useEffect(() => {
    if (project) {
      document.title = `${project.name} - PropCart Portal`;
    }
    return () => { document.title = 'PropCart Portal - Dự án Bất động sản'; };
  }, [project]);

  useEffect(() => {
    function updateSidebarTop() {
      if (planningStatsRef.current) {
        setSidebarTop(planningStatsRef.current.offsetHeight + 8);
      } else {
        setSidebarTop(80);
      }
    }
    updateSidebarTop();
    window.addEventListener('resize', updateSidebarTop);
    return () => window.removeEventListener('resize', updateSidebarTop);
  }, [project?.planningStats]);

  useEffect(() => {
    if (project) {
      const images: string[] = [];
      if (project.bannerUrls?.length) images.push(...project.bannerUrls.map((m) => m.originalUrl));
      if (project.bannerUrl) images.push(project.bannerUrl);
      setImageList(images.slice(0, 20));
    }
  }, [project]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [activeTab]);

  useEffect(() => {
    setProgressVideoIndex(0);
  }, [selectedProgressIndex]);

  const rotateCarousel = (direction: 'next' | 'prev', length: number) => {
    let next = direction === 'next' ? carouselIndex + 1 : carouselIndex - 1;
    if (next < 0) next = length - 1;
    if (next >= length) next = 0;
    setCarouselIndex(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
          <p className="mt-4 text-gray-600">Đang tải dự án...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy dự án</h1>
          <p className="text-gray-600 mb-6">{error || 'Dự án không tồn tại hoặc đã bị xóa'}</p>
          <Link href="/du-an" className="inline-block bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition">
            Quay lại danh sách dự án
          </Link>
        </div>
      </div>
    );
  }

  const contacts = project.contacts ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-width Banner */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
        <BannerGallery images={imageList} projectName={project.name} />
      </div>

      <main className="w-full py-4 lg:py-6 px-[10px]">

        {/* ── Mobile horizontal tab strip (hidden on lg+) ── */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition ${
                activeTab === id
                  ? 'bg-amber-700 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div>
          {/* ── Sticky Header with Planning Stats ── */}
          {project.planningStats && project.planningStats.length > 0 && (
            <div ref={planningStatsRef} className="sticky top-0 z-50 bg-white rounded-xl border border-gray-100 shadow-md p-5 mb-4 lg:mb-6 w-full">
              <h3 className="font-bold text-amber-900 mb-4 text-lg">{project.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.planningStats.map((stat, i) => (
                  <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                      {stat.icon ? (
                        <span className="text-3xl leading-none select-none">{stat.icon}</span>
                      ) : (
                        <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 mb-1 font-medium">{stat.label}</p>
                      <p className="text-xl font-bold text-amber-800">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 items-start">

          {/* ── Left Tab Nav (desktop only) ── */}
          <div className="hidden lg:block w-52 flex-shrink-0 sticky z-10" style={{ top: sidebarTop }}>
            <nav className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition text-left ${
                    activeTab === id
                      ? 'bg-amber-700 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Center Content ── */}
          <div className="flex-1 min-w-0">
            <div className="z-0 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-6 relative">

              {/* TỔNG QUAN */}
              {activeTab === 'overview' && (
                <section className="space-y-8">

                  {/* 1. Tổng quan dự án — HTML content from editor */}
                  {project.overviewHtml && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-base border-b border-gray-100 pb-2">Tổng quan</h3>
                      <div
                        className="prose prose-sm max-w-none text-gray-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:text-sm [&_li]:mb-1"
                        dangerouslySetInnerHTML={{ __html: project.overviewHtml }}
                      />
                    </div>
                  )}

                  {/* 2. Mặt bằng — list of names, click to show image */}
                  {project.zoneImages && project.zoneImages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-base border-b border-gray-100 pb-2">Mặt bằng</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.zoneImages.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedFloorPlan(i)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                              selectedFloorPlan === i
                                ? 'bg-amber-700 text-white border-amber-700'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:text-amber-700'
                            }`}
                          >
                            {img.description || img.fileName || `Mặt bằng ${i + 1}`}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full h-64 sm:h-80 lg:h-96 bg-gray-100 rounded-xl overflow-hidden">
                        <div
                          className="flex h-full transition-transform duration-500 ease-in-out"
                          style={{ transform: `translateX(-${selectedFloorPlan * 100}%)` }}
                        >
                          {project.zoneImages.map((img, i) => (
                            <div key={i} className="min-w-full h-full relative flex-shrink-0">
                              <SafeImg
                                src={img.originalUrl}
                                alt={img.description || img.fileName || `Mặt bằng ${i + 1}`}
                                className="object-contain"
                                onClick={() => openLb(project.zoneImages!.map(z => z.originalUrl), i)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Sản phẩm — infinite item-rotation carousel */}
                  {project.productImages && project.productImages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-base border-b border-gray-100 pb-2">Sản phẩm</h3>
                      <InfiniteCarousel
                        items={project.productImages}
                        label="Sản phẩm"
                        onOpen={(imgs, idx) => openLb(imgs, idx)}
                      />
                    </div>
                  )}

                  {/* 4. Tiện ích — same list style as Mặt bằng */}
                  {project.amenityImages && project.amenityImages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-base border-b border-gray-100 pb-2">Tiện ích</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.amenityImages.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedAmenity(i)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                              selectedAmenity === i
                                ? 'bg-amber-700 text-white border-amber-700'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:text-amber-700'
                            }`}
                          >
                            {img.description || img.fileName || `Tiện ích ${i + 1}`}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full h-64 sm:h-80 lg:h-96 bg-gray-100 rounded-xl overflow-hidden">
                        <div
                          className="flex h-full transition-transform duration-500 ease-in-out"
                          style={{ transform: `translateX(-${selectedAmenity * 100}%)` }}
                        >
                          {project.amenityImages.map((img, i) => (
                            <div key={i} className="min-w-full h-full relative flex-shrink-0">
                              <SafeImg
                                src={img.originalUrl}
                                alt={img.description || img.fileName || `Tiện ích ${i + 1}`}
                                className="object-contain"
                                onClick={() => openLb(project.amenityImages!.map(z => z.originalUrl), i)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Giới thiệu dự án — video player (left) + videoDescription text (right) */}
                  {(project.videoUrl || project.videoDescription) && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 text-base border-b border-gray-100 pb-2">Giới thiệu dự án</h3>
                      <div className="flex flex-col lg:flex-row gap-5">
                        {project.videoUrl && (
                          <div className="lg:w-1/2 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                            <iframe
                              src={getEmbedUrl(project.videoUrl)}
                              className="w-full h-full"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              title="Video giới thiệu dự án"
                            />
                          </div>
                        )}
                        {project.videoDescription && (
                          <div className="lg:w-1/2 prose prose-sm max-w-none text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: project.videoDescription }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                </section>
              )}

              {/* VỊ TRỊ */}
              {activeTab === 'location' && (
                <section className="space-y-6">

                  {/* Section 1: Địa chỉ + bản đồ OSM */}
                  {(project.address || project.latitude) && (
                    <div>
                      {project.address && (
                        <div className="flex items-start gap-2 mb-4">
                          <svg className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <div className="text-sm text-gray-800">
                            <p>{project.address}</p>
                            {[project.ward, project.district, project.province].filter(Boolean).length > 0 && (
                              <p className="text-gray-500 mt-0.5">{[project.ward, project.district, project.province].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {project.latitude && project.longitude && (
                        <div className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: '360px' }}>
                          <iframe
                            title="Vị trí dự án trên bản đồ"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(project.longitude) - 0.006},${parseFloat(project.latitude) - 0.004},${parseFloat(project.longitude) + 0.006},${parseFloat(project.latitude) + 0.004}&layer=mapnik&marker=${project.latitude},${project.longitude}`}
                            className="w-full h-full border-0"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 2: Mô tả vị trí */}
                  {project.locationDescriptionHtml && (
                    <div>
                      <div
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: project.locationDescriptionHtml }}
                      />
                    </div>
                  )}

                  {/* Section 3: Google MyMap */}
                  {project.googleMapUrl && (
                    <div>
                      <div className="w-full rounded-xl overflow-hidden border border-gray-200 mb-3" style={{ height: '480px' }}>
                        <iframe
                          title="Bản đồ Google Maps"
                          src={project.googleMapUrl}
                          className="w-full h-full border-0"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                      <a
                        href={project.googleMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-amber-700 hover:underline text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Xem trên Google Maps →
                      </a>
                    </div>
                  )}

                </section>
              )}

              {/* PHÂN KHU */}
              {activeTab === 'subdivisions' && (
                <section>
                  <SubdivisionsTab subdivisions={project.subdivisions ?? []} progressUpdates={project.progressUpdates} />
                </section>
              )}

              {/* KHO TÀI LIỆU */}
              {activeTab === 'documents' && (
                <section className="space-y-4">
                  {/* Search bar */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Tìm tài liệu..."
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 placeholder-gray-400"
                    />
                  </div>
                  {project.documentItems && project.documentItems.length > 0 ? (() => {
                    const filtered = project.documentItems!.filter(d =>
                      !docSearch || d.documentType.toLowerCase().includes(docSearch.toLowerCase())
                    );
                    const imageDocUrls = filtered.filter(d => isImageUrl(d.documentUrl)).map(d => d.documentUrl);
                    return filtered.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filtered.map((doc, i) => {
                          const isImg = isImageUrl(doc.documentUrl);
                          const imgIdx = isImg ? imageDocUrls.indexOf(doc.documentUrl) : -1;
                          const cardClass = 'group relative flex flex-col justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 hover:border-amber-400 hover:shadow-md transition overflow-hidden text-left w-full';
                          const cardStyle = { clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' };
                          const cardContent = (
                            <>
                              {/* Folded corner */}
                              <div className="absolute top-0 right-0 w-5 h-5 bg-amber-300 group-hover:bg-amber-400 transition"
                                style={{ clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }} />
                              {/* Icon */}
                              <div className="flex flex-col gap-2 min-h-[80px]">
                                {doc.icon ? (
                                  /^https?:\/\/|^\//.test(doc.icon) ? (
                                    <img src={doc.icon} alt="" className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
                                  ) : (
                                    <span className="text-3xl leading-none select-none">{doc.icon}</span>
                                  )
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-amber-200 group-hover:bg-amber-300 flex items-center justify-center transition flex-shrink-0">
                                    <FileText className="w-5 h-5 text-amber-700" />
                                  </div>
                                )}
                                <p className="text-xs font-semibold text-amber-900 leading-snug line-clamp-3">{doc.documentType}</p>
                              </div>
                              {/* Arrow */}
                              <div className="flex justify-end mt-3">
                                <span className="text-amber-600 group-hover:text-amber-800 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </span>
                              </div>
                            </>
                          );
                          return isImg ? (
                            <button key={i} onClick={() => openLb(imageDocUrls, imgIdx)} className={cardClass} style={cardStyle} aria-label={doc.documentType}>
                              {cardContent}
                            </button>
                          ) : (
                            <a key={i} href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className={cardClass} style={cardStyle}>
                              {cardContent}
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-10">Không tìm thấy tài liệu phù hợp.</p>
                    );
                  })() : (
                    <p className="text-sm text-gray-400 text-center py-10">Chưa có tài liệu.</p>
                  )}
                </section>
              )}

              {/* TIẾN ĐỘ THI CÔNG */}
              {activeTab === 'progress' && (
                <section className="space-y-5">
                  {project.progressUpdates && project.progressUpdates.length > 0 ? (() => {
                    const updates = project.progressUpdates!;
                    const active = updates[selectedProgressIndex] ?? updates[0];
                    return (
                      <>
                        {/* Timeline ribbon */}
                        <div className="overflow-x-auto -mx-1 pb-1">
                          <div className="flex gap-2 px-1 min-w-max">
                            {updates.map((u, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedProgressIndex(i)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                                  i === selectedProgressIndex
                                    ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-300'
                                }`}
                              >
                                {u.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Active milestone content */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/60">
                            <p className="font-semibold text-amber-900 text-sm">{active.label}</p>
                          </div>
                          <div className="p-4 space-y-5">
                            {/* ── Images — reuse InfiniteCarousel (same as overview) ── */}
                            {active.images && active.images.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hình ảnh</p>
                                <InfiniteCarousel
                                  items={active.images}
                                  label="Tiến độ"
                                  onOpen={openLb}
                                />
                              </div>
                            )}
                            {/* ── Description ── */}
                            {active.detailHtml && (
                              <div
                                className="prose prose-sm max-w-none text-gray-700"
                                dangerouslySetInnerHTML={{ __html: active.detailHtml }}
                              />
                            )}
                            {/* ── Videos ── */}
                            {(() => {
                              const videos = active.videos?.filter(v => v.url) ??
                                (active.videoUrl ? [{ url: active.videoUrl, description: undefined }] : []);
                              if (videos.length === 0) return null;
                              if (videos.length === 1) {
                                // Single video – full player at bottom
                                return (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Video</p>
                                    <VideoCard url={videos[0].url} title={videos[0].description || active.label} />
                                    {videos[0].description && (
                                      <p className="text-xs text-gray-500 mt-1.5 px-1">{videos[0].description}</p>
                                    )}
                                  </div>
                                );
                              }
                              // Multiple videos – slide view
                              const activeVid = videos[progressVideoIndex] ?? videos[0];
                              return (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Video</p>
                                  {/* Player */}
                                  <div className="relative">
                                    <VideoCard key={progressVideoIndex} url={activeVid.url} title={activeVid.description || `Video ${progressVideoIndex + 1}`} />
                                    {/* Prev / Next arrows — ORANGE/AMBER COLORED */}
                                    <button
                                      onClick={() => setProgressVideoIndex(p => Math.max(0, p - 1))}
                                      disabled={progressVideoIndex === 0}
                                      className="absolute left-2 top-[40%] -translate-y-1/2 bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-full transition disabled:opacity-20 disabled:bg-amber-400"
                                      aria-label="Video trước"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setProgressVideoIndex(p => Math.min(videos.length - 1, p + 1))}
                                      disabled={progressVideoIndex >= videos.length - 1}
                                      className="absolute right-2 top-[40%] -translate-y-1/2 bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-full transition disabled:opacity-20 disabled:bg-amber-400"
                                      aria-label="Video tiếp"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                    {/* Counter badge */}
                                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                                      {progressVideoIndex + 1}/{videos.length}
                                    </span>
                                  </div>
                                  {/* Description */}
                                  {activeVid.description && (
                                    <p className="text-xs text-gray-500 mt-1.5 px-1">{activeVid.description}</p>
                                  )}
                                  {/* Dot indicators */}
                                  <div className="flex justify-center gap-1.5 mt-3">
                                    {videos.map((_, vi) => (
                                      <button
                                        key={vi}
                                        onClick={() => setProgressVideoIndex(vi)}
                                        aria-label={`Video ${vi + 1}`}
                                        className={`rounded-full transition-all duration-300 ${
                                          vi === progressVideoIndex ? 'bg-amber-700 w-5 h-2' : 'bg-gray-300 w-2 h-2'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {!active.images?.length && !active.detailHtml && !active.videos?.length && !active.videoUrl && (
                              <p className="text-sm text-gray-400 text-center py-4">Chưa có nội dung chi tiết cho mốc này.</p>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })() : (
                    <p className="text-sm text-gray-400 text-center py-10">Chưa có cập nhật tiến độ.</p>
                  )}
                </section>
              )}
            </div>
          </div>

          {/* ── Right Contact (desktop only) ── */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky z-10" style={{ top: sidebarTop }}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <div className="pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 mb-0.5">Liên hệ tư vấn</h3>
                <p className="text-xs text-gray-500">Nhận tư vấn MIỄN PHÍ từ chuyên viên tư vấn</p>
              </div>
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.map((contact, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-3">
                        {contact.imageUrl ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            <SafeImg src={contact.imageUrl} alt={contact.name} className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-amber-700 font-bold text-sm">{contact.name?.[0] ?? '?'}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
                          {contact.title && <p className="text-xs text-gray-500 truncate">{contact.title}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {contact.zaloPhone && (
                          <a href={`https://zalo.me/${contact.zaloPhone}`} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 text-xs font-medium py-2 rounded-lg transition">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Zalo
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium py-2 rounded-lg transition">
                            <Phone className="w-3.5 h-3.5" />
                            Gọi
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Chưa có thông tin chuyên viên.</p>
              )}
            </div>
          </div>

        </div>

        {/* ── Mobile Contact Card (hidden on lg+) ── */}
        <div className="lg:hidden mt-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 mb-0.5">Liên hệ tư vấn</h3>
              <p className="text-xs text-gray-500">Nhận tư vấn MIỄN PHÍ từ chuyên viên tư vấn</p>
            </div>
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-3 mb-3">
                      {contact.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          <SafeImg src={contact.imageUrl} alt={contact.name} className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-700 font-bold text-sm">{contact.name?.[0] ?? '?'}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
                        {contact.title && <p className="text-xs text-gray-500 truncate">{contact.title}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {contact.zaloPhone && (
                        <a href={`https://zalo.me/${contact.zaloPhone}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-medium py-2.5 rounded-lg transition">
                          <MessageCircle className="w-4 h-4" />
                          Zalo
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium py-2.5 rounded-lg transition">
                          <Phone className="w-4 h-4" />
                          Gọi
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Chưa có thông tin chuyên viên.</p>
            )}
          </div>
        </div>

        </div>

      </main>

      <ImageLightbox
        isOpen={lbOpen}
        images={lbImages}
        currentIndex={lbIndex}
        onClose={() => setLbOpen(false)}
        onImageChange={(idx) => setLbIndex(idx)}
      />
    </div>
  );
}
