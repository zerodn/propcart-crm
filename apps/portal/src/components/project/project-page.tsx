'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Loader2, Share2 } from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import SiteFooter from '@/components/layout/footer';
import { MediaItem } from '@/types';

interface Props { projectId: string; }

const SECTIONS = [
  { id: 'tong-quan', label: 'Tổng quan dự án' },
  { id: 'mat-bang', label: 'Mặt bằng' },
  { id: 'san-pham', label: 'Sản phẩm' },
  { id: 'tien-ich', label: 'Tiện ích' },
  { id: 'lien-he', label: 'Liên hệ tư vấn' },
  { id: 'tien-do', label: 'Tiến độ dự án' },
  { id: 'tai-lieu', label: 'Tài liệu' },
];

function getTypeLabel(t: string) {
  if (t === 'HIGH_RISE') return 'Cao tầng';
  if (t === 'LOW_RISE') return 'Thấp tầng';
  return t;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-gray-900 mb-5 pb-2 border-b border-gray-200 scroll-mt-20">
      {children}
    </h2>
  );
}

function extractUrls(items: MediaItem[] | null | undefined, fallback?: string | null): string[] {
  if (Array.isArray(items) && items.length > 0) return items.map((i) => i.originalUrl).filter(Boolean);
  if (fallback) return [fallback];
  return [];
}


export default function ProjectPage({ projectId }: Props) {
  const { project, loading, error } = useProject(projectId);
  const [idx, setIdx] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">{error || 'Dự án không tìm thấy'}</p>
        <Link href="/" className="text-blue-600 text-sm hover:underline">← Quay lại trang dự án</Link>
      </div>
    );
  }

  const banners = extractUrls(project.bannerUrls, project.bannerUrl);
  const zoneImgs = extractUrls(project.zoneImages, project.zoneImageUrl);
  const productImgs = extractUrls(project.productImages, project.productImageUrl);
  const amenityImgs = extractUrls(project.amenityImages, project.amenityImageUrl);
  const contacts = Array.isArray(project.contacts) ? project.contacts : [];
  const stats = Array.isArray(project.planningStats) ? project.planningStats : [];
  const progress = Array.isArray(project.progressUpdates) ? project.progressUpdates : [];
  const docs = Array.isArray(project.documentItems) ? project.documentItems : [];
  const loc = [project.ward, project.district, project.province].filter(Boolean).join(', ');

  const activeSections = SECTIONS.filter(({ id }) => {
    if (id === 'tong-quan') return true;
    if (id === 'mat-bang') return zoneImgs.length > 0;
    if (id === 'san-pham') return productImgs.length > 0;
    if (id === 'tien-ich') return amenityImgs.length > 0;
    if (id === 'lien-he') return contacts.length > 0;
    if (id === 'tien-do') return progress.length > 0;
    if (id === 'tai-lieu') return docs.length > 0;
    return false;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-gray-900">PropCart</Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />Quay lại trang dự án
            </Link>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: project.name, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href).catch(() => {});
                }
              }}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <Share2 className="w-4 h-4" />Chia sẻ
            </button>
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">Đăng nhập</Link>
          </div>
        </div>
      </header>

      {/* Hero carousel */}
      <div className="relative w-full bg-gray-900" style={{ height: '480px' }}>
        {banners.length > 0 ? (
          <>
            <Image src={banners[idx]} alt={project.name} fill className="object-cover" priority sizes="100vw" />
            <div className="absolute inset-0 bg-black/25" />
            {banners.length > 1 && (
              <>
                <button
                  onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full z-10"
                  aria-label="Prev"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-800" />
                </button>
                <button
                  onClick={() => setIdx((i) => (i + 1) % banners.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full z-10"
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`w-2 h-2 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/50'}`}
                      aria-label={`Ảnh ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <span className="text-8xl opacity-20">🏗️</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 z-10">
          <span className="inline-block text-xs bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded mb-2">
            {getTypeLabel(project.projectType)}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{project.name}</h1>
          {loc && <p className="text-sm text-gray-200 mt-1">{loc}</p>}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex gap-8">
          {/* Sticky sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <nav className="sticky top-20 space-y-1">
              {activeSections.map(({ id, label }) => (
                <a key={id} href={`#${id}`} className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-12">

            {/* Tổng quan */}
            <section>
              <H2 id="tong-quan">Tổng quan dự án</H2>
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  {project.overviewHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: project.overviewHtml }}
                    />
                  ) : (
                    <p className="text-gray-400 text-sm italic">Chưa có thông tin tổng quan.</p>
                  )}
                </div>
                {stats.length > 0 && (
                  <div className="lg:w-72 flex-shrink-0">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {stats.map((s, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                          {s.icon && <span className="text-2xl">{s.icon}</span>}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 truncate">{s.label}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Mặt bằng */}
            {zoneImgs.length > 0 && (
              <section>
                <H2 id="mat-bang">Mặt bằng</H2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {zoneImgs.map((u, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <Image src={u} alt={`Mặt bằng ${i + 1}`} fill className="object-cover" sizes="50vw" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sản phẩm */}
            {productImgs.length > 0 && (
              <section>
                <H2 id="san-pham">Sản phẩm</H2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {productImgs.map((u, i) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                      <div className="relative aspect-square">
                        <Image src={u} alt={`Sản phẩm ${i + 1}`} fill className="object-cover group-hover:scale-105 transition" sizes="25vw" />
                        <div className="absolute top-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">Mới</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tiện ích */}
            {amenityImgs.length > 0 && (
              <section>
                <H2 id="tien-ich">Tiện ích</H2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {amenityImgs.map((u, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <Image src={u} alt={`Tiện ích ${i + 1}`} fill className="object-cover" sizes="33vw" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Liên hệ tư vấn */}
            {contacts.length > 0 && (
              <section>
                <H2 id="lien-he">Liên hệ tư vấn</H2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {contacts.map((c, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-4 flex flex-col items-center text-center gap-3">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                        {c.imageUrl ? (
                          <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                        {c.title && <p className="text-xs text-gray-500 mt-0.5">{c.title}</p>}
                        {c.phone && <p className="text-sm text-gray-700 mt-1">{c.phone}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="w-full text-center text-sm font-medium text-blue-600 border border-blue-600 rounded py-1.5 hover:bg-blue-600 hover:text-white transition"
                          >
                            Liên hệ ngay
                          </a>
                        )}
                        {c.zaloPhone && (
                          <a
                            href={`https://zalo.me/${c.zaloPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-center text-sm font-medium text-sky-500 border border-sky-200 rounded py-1.5 hover:bg-sky-50 transition"
                          >
                            Zalo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tiến độ */}
            {progress.length > 0 && (
              <section>
                <H2 id="tien-do">Tiến độ dự án</H2>
                <div className="space-y-6">
                  {progress.map((u, i) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-5">
                      <h3 className="font-semibold text-gray-900 mb-2">{u.label}</h3>
                      {u.detailHtml && (
                        <div
                          className="prose prose-sm max-w-none text-gray-600 mb-3"
                          dangerouslySetInnerHTML={{ __html: u.detailHtml }}
                        />
                      )}
                      {u.videoUrl && (
                        <a
                          href={u.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-3"
                        >
                          🎬 Xem video tiến độ
                        </a>
                      )}
                      {u.images && u.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {u.images.map((img, j) => (
                            <div key={j} className="relative aspect-video rounded overflow-hidden bg-gray-100">
                              <Image src={img.originalUrl} alt={img.fileName || `Tiến độ ${i + 1}`} fill className="object-cover" sizes="25vw" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tài liệu */}
            {docs.length > 0 && (
              <section>
                <H2 id="tai-lieu">Tài liệu dự án</H2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docs.map((d, i) => (
                    <a
                      key={i}
                      href={d.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 hover:border-blue-300 transition group"
                    >
                      <span className="text-2xl">{d.icon || '📄'}</span>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 flex-1 truncate">{d.documentType}</span>
                      <span className="text-xs text-gray-400 group-hover:text-blue-500">↗</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Vị trí */}
            {(project.address || project.googleMapUrl) && (
              <section>
                <H2 id="vi-tri">Vị trí dự án</H2>
                {project.address && (
                  <p className="text-sm text-gray-700 mb-4">
                    📍 {[project.address, loc].filter(Boolean).join(', ')}
                  </p>
                )}
                {project.googleMapUrl && (
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      src={project.googleMapUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Bản đồ"
                    />
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

