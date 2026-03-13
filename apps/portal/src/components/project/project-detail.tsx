'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProject } from '@/hooks/useProject';
import {
  LayoutDashboard, Navigation2, Building2, FolderOpen, HardHat,
  Phone, MessageCircle, Copy, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import BannerGallery from './banner-gallery';

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
  const [copied, setCopied] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);


  useEffect(() => {
    if (project) {
      const images: string[] = [];
      if (project.bannerUrls?.length) images.push(...project.bannerUrls.map((m) => m.originalUrl));
      if (project.bannerUrl) images.push(project.bannerUrl);
      if (project.productImages?.length) images.push(...project.productImages.map((m) => m.originalUrl));
      setImageList(images.slice(0, 20));
    }
  }, [project]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [activeTab]);

  const handleCopyCode = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.id.slice(0, 8));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const primaryContact = project.contacts?.[0];
  const shortCode = project.id.slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-width Banner */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
        <BannerGallery images={imageList} projectName={project.name} />
      </div>

      <main className="w-full py-6 px-[10px]">
        <div className="flex gap-6 items-start">

          {/* ── Left Tab Nav ── */}
          <div className="w-52 flex-shrink-0 sticky top-20">
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
                <section className="space-y-6">
                  {/* Planning Stats */}
                  {project.planningStats && project.planningStats.length > 0 && (
                    <div>
                      <h3 className="font-bold text-amber-900 mb-4 text-lg">{project.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  {/* Overview HTML */}
                  {project.overviewHtml && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Giới thiệu dự án</h3>
                      <div className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: project.overviewHtml }} />
                    </div>
                  )}

                  {/* Zone Images */}
                  {project.zoneImages && project.zoneImages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Hình ảnh dự án</h3>
                      <div className="relative h-80 bg-gray-300 rounded-lg overflow-hidden">
                        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                          {project.zoneImages.map((img, i) => (
                            <div key={i} className="min-w-full h-full relative">
                              <Image src={img.originalUrl} alt={img.description || `Image ${i}`} fill className="object-cover" />
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
                      <div className="relative h-80 bg-gray-300 rounded-lg overflow-hidden">
                        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                          {project.zoneImages.map((img, i) => (
                            <div key={i} className="min-w-full h-full relative">
                              <Image src={img.originalUrl} alt={img.description || `Zone ${i}`} fill className="object-cover" />
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

          {/* ── Right Contact ── */}
          <div className="w-72 flex-shrink-0 sticky top-20">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Liên hệ tư vấn</h3>
                <p className="text-xs text-gray-500">Nhận tư vấn MIỄN PHÍ từ chuyên viên tư vấn</p>
              </div>

              {primaryContact ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {primaryContact.imageUrl ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image src={primaryContact.imageUrl} alt={primaryContact.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-700 font-bold text-lg">{primaryContact.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{primaryContact.name}</p>
                      {primaryContact.title && <p className="text-xs text-gray-500">{primaryContact.title}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {primaryContact.zaloPhone && (
                      <a href={`https://zalo.me/${primaryContact.zaloPhone}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 text-xs font-medium py-2 rounded-lg transition">
                        <MessageCircle className="w-4 h-4" />
                        Chat Zalo
                      </a>
                    )}
                    {primaryContact.phone && (
                      <a href={`tel:${primaryContact.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium py-2 rounded-lg transition">
                        <Phone className="w-4 h-4" />
                        Gọi
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Chưa có thông tin chuyên viên.</p>
              )}

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1.5">Mã tin BĐS</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900">{shortCode}</span>
                  <button onClick={handleCopyCode} className="text-gray-400 hover:text-amber-600 transition" title="Sao chép">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copied && <span className="text-xs text-green-600">Đã sao chép!</span>}
                </div>
              </div>

              {project.contacts && project.contacts.length > 1 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-900 mb-2">Liên hệ khác</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {project.contacts.slice(1).map((contact, idx) => (
                      <div key={idx} className="text-xs">
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-amber-600 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
