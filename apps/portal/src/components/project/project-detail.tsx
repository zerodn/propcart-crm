'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProject } from '@/hooks/useProject';
import {
  LayoutDashboard, Navigation2, Building2, FolderOpen, HardHat,
  Phone, MessageCircle, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import BannerGallery from './banner-gallery';
import ImageLightbox from './image-lightbox';

function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch {}
  return url;
}

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

        <div className="flex gap-6 items-start">

          {/* ── Left Tab Nav (desktop only) ── */}
          <div className="hidden lg:block w-52 flex-shrink-0 sticky top-20">
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-6">

              {/* TỔNG QUAN */}
              {activeTab === 'overview' && (
                <section className="space-y-8">

                  {/* 1. Tổng quan dự án — planning stats */}
                  {project.planningStats && project.planningStats.length > 0 && (
                    <div>
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
                <section className="space-y-4">
                  {project.address && <p className="text-sm text-gray-800">{project.address}</p>}
                  {[project.district, project.province].filter(Boolean).join(', ') && (
                    <p className="text-xs text-gray-500">{[project.district, project.province].filter(Boolean).join(', ')}</p>
                  )}
                  {project.locationDescriptionHtml && (
                    <div className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: project.locationDescriptionHtml }} />
                  )}
                  {project.googleMapUrl && (
                    <a href={project.googleMapUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-amber-600 hover:underline text-sm font-medium">
                      Xem bản đồ →
                    </a>
                  )}
                </section>
              )}

              {/* PHÂN KHU */}
              {activeTab === 'subdivisions' && (
                <section className="space-y-6">
                  {project.subdivisions && project.subdivisions.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Danh sách phân khu</h3>
                      <div className="space-y-3">
                        {project.subdivisions.map((sub, i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-amber-700 font-bold text-sm">{i + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{sub.name}</p>
                                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                  {sub.unitStandard && <span>Phân khu: <strong>{sub.unitStandard}</strong></span>}
                                  {sub.unitCount && <span>Số căn: <strong>{sub.unitCount}</strong></span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Zone Images */}
                  {project.zoneImages && project.zoneImages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Hình ảnh phân khu</h3>
                      <div className="relative h-52 sm:h-72 lg:h-80 bg-gray-300 rounded-lg overflow-hidden">
                        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                          {project.zoneImages.map((img, i) => (
                            <div key={i} className="min-w-full h-full relative">
                              <SafeImg src={img.originalUrl} alt={img.description || `Zone ${i}`} className="object-cover" onClick={() => openLb(project.zoneImages!.map(z => z.originalUrl), i)} />
                            </div>
                          ))}
                        </div>
                        {project.zoneImages.length > 1 && (
                          <>
                            <button
                              onClick={() => rotateCarousel('prev', project.zoneImages!.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-900 p-2 rounded-full z-10 transition"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => rotateCarousel('next', project.zoneImages!.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-900 p-2 rounded-full z-10 transition"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* KHO TÀI LIỆU */}
              {activeTab === 'documents' && (
                <section>
                  {project.documentItems && project.documentItems.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Tài liệu dự án</h3>
                      <ul className="space-y-2">
                        {project.documentItems.map((doc, i) => (
                          <li key={i}>
                            <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-amber-50 hover:border-amber-200 transition group">
                              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                              <span className="text-sm text-gray-700 group-hover:text-amber-700">{doc.documentType}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có tài liệu.</p>
                  )}
                </section>
              )}

              {/* TIẾN ĐỘ THI CÔNG */}
              {activeTab === 'progress' && (
                <section>
                  {project.progressUpdates && project.progressUpdates.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Tiến độ thi công</h3>
                      <div className="space-y-4">
                        {project.progressUpdates.map((update, i) => (
                          <div key={i} className="border-l-4 border-amber-400 pl-4">
                            <p className="font-semibold text-gray-900 text-sm mb-1">{update.label}</p>
                            {update.detailHtml && (
                              <div className="prose prose-sm max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: update.detailHtml }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có cập nhật tiến độ.</p>
                  )}
                </section>
              )}
            </div>
          </div>

          {/* ── Right Contact (desktop only) ── */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-20">
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
