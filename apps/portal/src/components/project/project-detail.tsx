'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProject } from '@/hooks/useProject';
import {
  LayoutDashboard, Navigation2, Building2, FolderOpen, HardHat,
  Phone, MessageCircle, Copy, FileText,
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

  useEffect(() => {
    if (project) {
      const images: string[] = [];
      if (project.bannerUrls?.length) images.push(...project.bannerUrls.map((m) => m.originalUrl));
      if (project.bannerUrl) images.push(project.bannerUrl);
      if (project.productImages?.length) images.push(...project.productImages.map((m) => m.originalUrl));
      setImageList(images.slice(0, 20));
    }
  }, [project]);

  const handleCopyCode = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.id.slice(0, 8));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const typeLabel = project.projectType === 'HIGH_RISE' ? 'Cao tầng' : project.projectType === 'LOW_RISE' ? 'Thấp tầng' : project.projectType;
  const location = [project.district, project.province].filter(Boolean).join(', ');
  const primaryContact = project.contacts?.[0];
  const shortCode = project.id.slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Section */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
        <BannerGallery images={imageList} projectName={project.name} />
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
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
            {/* Project Title */}
            <h1 className="text-2xl font-bold text-amber-800 uppercase tracking-wide mb-4">
              {project.name}
            </h1>

            {/* Planning Stats */}
            {project.planningStats && project.planningStats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {project.planningStats.map((stat, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                    {stat.icon ? (
                      <img src={stat.icon} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-base font-bold text-amber-700">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  {project.overviewHtml ? (
                    <div className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: project.overviewHtml }} />
                  ) : (
                    <p className="text-gray-500">Chưa có thông tin tổng quan.</p>
                  )}
                </div>
              )}

              {/* LOCATION */}
              {activeTab === 'location' && (
                <div className="space-y-4">
                  {location && <p className="text-sm text-gray-600">{location}</p>}
                  {project.address && <p className="text-sm text-gray-800">{project.address}</p>}
                  {project.locationDescriptionHtml ? (
                    <div className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: project.locationDescriptionHtml }} />
                  ) : (
                    <p className="text-gray-500">Chưa có thông tin vị trí.</p>
                  )}
                  {project.googleMapUrl && (
                    <a href={project.googleMapUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-amber-600 hover:underline text-sm font-medium">
                      Xem bản đồ
                    </a>
                  )}
                </div>
              )}

              {/* SUBDIVISIONS */}
              {activeTab === 'subdivisions' && (
                <div>
                  {project.subdivisions && project.subdivisions.length > 0 ? (
                    <div className="space-y-3">
                      {project.subdivisions.map((sub, i) => (
                        <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{sub.name}</p>
                              <div className="flex gap-4 text-xs text-gray-500 mt-0.5">
                                {sub.unitStandard && <span>Phân khu: <strong>{sub.unitStandard}</strong></span>}
                                {sub.unitCount && <span>Số căn: <strong>{sub.unitCount}</strong></span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có thông tin phân khu.</p>
                  )}
                </div>
              )}

              {/* DOCUMENTS */}
              {activeTab === 'documents' && (
                <div>
                  {project.documentItems && project.documentItems.length > 0 ? (
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
                  ) : (
                    <p className="text-gray-500">Chưa có tài liệu.</p>
                  )}
                </div>
              )}

              {/* PROGRESS */}
              {activeTab === 'progress' && (
                <div>
                  {project.progressUpdates && project.progressUpdates.length > 0 ? (
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
                  ) : (
                    <p className="text-gray-500">Chưa có cập nhật tiến độ.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Contact ── */}
          <div className="w-72 flex-shrink-0 sticky top-20 space-y-4">
            {/* Consultant card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-1">Liên hệ tư vấn</h3>
              <p className="text-xs text-gray-500 mb-4">Nhận tư vấn MIỄN PHÍ từ chuyên viên tư vấn</p>

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
                        Chat qua zalo
                      </a>
                    )}
                    {primaryContact.phone && (
                      <a href={`tel:${primaryContact.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium py-2 rounded-lg transition">
                        <Phone className="w-4 h-4" />
                        {primaryContact.phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2')}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-4">Chưa có thông tin chuyên viên.</p>
              )}

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1.5">Vui lòng để cập mã tin BĐS cho Chuyên viên tư vấn</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Mã tin:</span>
                  <span className="text-xs font-semibold text-gray-900">{shortCode}</span>
                  <button onClick={handleCopyCode} className="text-gray-400 hover:text-amber-600 transition" title="Sao chép mã">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copied && <span className="text-xs text-green-600">Đã sao chép!</span>}
                </div>
              </div>
            </div>

            {/* Extra contacts */}
            {project.contacts && project.contacts.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Đại lý bán hàng</h3>
                <div className="space-y-3">
                  {project.contacts.slice(1).map((contact, idx) => (
                    <div key={idx} className="flex items-center gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                      {contact.imageUrl ? (
                        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                          <Image src={contact.imageUrl} alt={contact.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-500 font-bold text-sm">{contact.name[0]}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{contact.name}</p>
                        {contact.title && <p className="text-xs text-gray-500">{contact.title}</p>}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 mt-0.5 text-xs text-amber-600 hover:underline">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
