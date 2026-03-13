'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  Search, ChevronDown, Map, MapPin, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useProjects, useCatalogOptions, CatalogOption } from '@/hooks/useProject';
import type { MapProject } from '@/components/map/ProjectMap';

const ProjectMap = dynamic(() => import('@/components/map/ProjectMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
      Đang tải bản đồ…
    </div>
  ),
});

const PAGE_SIZE = 15;

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Combobox ──────────────────────────────────────────────────────────────────

interface ComboboxProps {
  placeholder: string;
  value: string;
  options: CatalogOption[];
  onChange: (v: string) => void;
  searchable?: boolean;
}

function Combobox({ placeholder, value, options, onChange, searchable }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [options, q],
  );

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm whitespace-nowrap text-gray-700 hover:text-gray-900"
      >
        <span className={selectedLabel ? 'text-amber-700 font-medium' : ''}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-56 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-amber-400"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setQ(''); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${!value ? 'text-amber-700 font-medium' : 'text-gray-700'}`}
            >
              Tất cả
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${value === o.value ? 'text-amber-700 font-medium bg-amber-50' : 'text-gray-700'}`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">Không tìm thấy</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [projectType, setProjectType] = useState('');
  const [province, setProvince] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showMap, setShowMap] = useState(false);
  const [page, setPage] = useState(1);
  const [flyTo, setFlyTo] = useState<{ id: string; ts: number } | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const mapPanelRef = useRef<HTMLDivElement>(null);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setMapFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && mapPanelRef.current) {
      mapPanelRef.current.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const { projects, loading, error } = useProjects({ limit: 200 });
  const { options: typeOptions } = useCatalogOptions('project-types');
  const { options: rawProvinces } = useCatalogOptions('provinces');

  const provinceOptions: CatalogOption[] = useMemo(
    () => (rawProvinces as unknown as string[]).map((p) => ({ value: p, label: p })),
    [rawProvinces],
  );

  const handleSearch = useCallback(() => {
    setActiveSearch(search);
    setPage(1);
  }, [search]);

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (activeSearch) {
      const s = activeSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.address?.toLowerCase().includes(s) ||
          p.district?.toLowerCase().includes(s) ||
          p.province?.toLowerCase().includes(s),
      );
    }
    if (projectType) list = list.filter((p) => p.projectType === projectType);
    if (province) list = list.filter((p) => p.province === province);
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'oldest')
      list.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    else
      list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return list;
  }, [projects, activeSearch, projectType, province, sortBy]);

  // Prepare map-compatible project list (includes image + slug)
  const mapProjects: MapProject[] = useMemo(
    () =>
      filteredProjects.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        projectType: p.projectType,
        district: p.district,
        province: p.province,
        bannerUrl: p.bannerUrls?.[0]?.originalUrl ?? p.bannerUrl ?? null,
        slug: `${toSlug(p.name)}-${p.id}`,
      })),
    [filteredProjects],
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const paginatedProjects = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getTypeLabel = (v: string) =>
    typeOptions.find((o) => o.value === v)?.label ??
    (v === 'HIGH_RISE' ? 'Cao tầng' : v === 'LOW_RISE' ? 'Thấp tầng' : v);

  const pagesToShow = useMemo(() => {
    const list: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) list.push(i);
    return list;
  }, [page, totalPages]);

  return (
    <div>
      {/* ── Hero ── */}
      <section
        className="text-white py-16 px-4"
        style={{ background: 'linear-gradient(135deg, #1a0d06 0%, #2d1507 60%, #1a0d06 100%)' }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h1
            className="text-4xl md:text-5xl font-bold italic mb-3"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Khám phá không gian sống lý tưởng
          </h1>
          <p className="text-gray-300 text-base mb-8">
            Hơn 500+ bất động sản cao cấp đang chờ bạn khám phá
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-xl flex items-center p-1.5 gap-0 max-w-4xl mx-auto">
            <div className="flex-1 flex items-center gap-2 px-4 py-2 min-w-0">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Nhập thông tin tìm kiếm"
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent min-w-0"
              />
            </div>
            <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
            <Combobox
              placeholder="Loại dự án"
              value={projectType}
              options={typeOptions}
              onChange={(v) => { setProjectType(v); setPage(1); }}
            />
            <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
            <Combobox
              placeholder="Khu vực"
              value={province}
              options={provinceOptions}
              onChange={(v) => { setProvince(v); setPage(1); }}
              searchable
            />
            <button
              onClick={handleSearch}
              className="ml-1.5 bg-amber-700 hover:bg-amber-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap"
            >
              Tìm kiếm
            </button>
            <button
              onClick={() => { setShowMap((v) => !v); setFlyTo(null); }}
              className={`flex items-center gap-1.5 ml-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition whitespace-nowrap ${
                showMap
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'border-amber-600 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Map className="w-4 h-4" />
              Bản đồ
            </button>
          </div>
        </div>
      </section>

      {/* ── Main ── */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Two-column layout: left = heading+grid, right = map */}
          <div className="flex gap-6 items-start">

            {/* ── Left column ── */}
            <div className={showMap ? 'w-[48%] flex-shrink-0' : 'flex-1'}>

              {/* Heading row + sort (same line) */}
              <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dự án bất động sản</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {loading ? 'Đang tải...' : `${filteredProjects.length} kết quả`}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 flex-shrink-0">
                  <span className="whitespace-nowrap">Sắp xếp theo:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="border-none bg-transparent font-semibold text-amber-700 cursor-pointer outline-none text-sm"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                </div>
              </div>

              {/* Project grid */}
              {loading ? (
                <div className={`grid gap-4 ${showMap ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden animate-pulse h-44 bg-gray-200" />
                  ))}
                </div>
              ) : paginatedProjects.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy dự án</h3>
                  <p className="text-gray-500 text-sm">Hãy thay đổi bộ lọc để tìm kết quả phù hợp</p>
                </div>
              ) : (
                <div className={`grid gap-4 ${showMap ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {paginatedProjects.map((project) => {
                    const slug = `${toSlug(project.name)}-${project.id}`;
                    const imgSrc = project.bannerUrls?.[0]?.originalUrl ?? project.bannerUrl;
                    const loc = [project.district, project.province].filter(Boolean).join(', ');
                    const hasCoords = !!(project.latitude && project.longitude);
                    return (
                      /* Wrapper — pin button is OUTSIDE Link to avoid navigating on click */
                      <div key={project.id} className="relative">
                        <a
                          href={`/du-an/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative rounded-xl overflow-hidden block bg-gray-200 h-52 hover:shadow-lg transition-shadow cursor-pointer"
                        >
                          {imgSrc ? (
                            <Image
                              src={imgSrc}
                              alt={project.name}
                              fill
                              className="object-cover group-hover:scale-105 transition duration-300"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
                              <span className="text-5xl opacity-30">🏗️</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                          {/* Type badge */}
                          <div className="absolute top-2 left-2">
                            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                              {getTypeLabel(project.projectType)}
                            </span>
                          </div>
                          {/* Name + location */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="text-white font-semibold text-sm line-clamp-1">{project.name}</h3>
                            {loc && <p className="text-gray-300 text-xs mt-0.5 line-clamp-1">{loc}</p>}
                          </div>
                        </a>

                        {/* Pin button — outside Link: in map mode it scrolls map; otherwise decorative */}
                        {showMap && hasCoords ? (
                          <button
                            className="absolute top-2 right-2 z-10 w-7 h-7 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center shadow transition cursor-pointer"
                            onClick={() => setFlyTo({ id: project.id, ts: Date.now() })}
                            title="Xem trên bản đồ"
                          >
                            <MapPin className="w-3.5 h-3.5 text-white" />
                          </button>
                        ) : (
                          <span className="absolute top-2 right-2 z-10 w-7 h-7 bg-amber-500/80 rounded-full flex items-center justify-center shadow pointer-events-none">
                            <MapPin className="w-3.5 h-3.5 text-white" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 flex-wrap gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" /> Trang trước
                  </button>
                  <div className="flex items-center gap-1">
                    {pagesToShow.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                          p === page ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Trang sau <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Map column ── sticky, starts at same level as heading */}
            {showMap && (
              <div
                ref={mapPanelRef}
                className="flex-1 sticky top-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                style={{ height: 'calc(100vh - 4rem)' }}
              >
                {/* Top-right controls */}
                <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-white border border-gray-200 shadow rounded-lg p-2 text-gray-700 hover:bg-gray-50 transition"
                    title={mapFullscreen ? 'Thu nhỏ' : 'Phóng to toàn màn hình'}
                  >
                    {mapFullscreen
                      ? <Minimize2 className="w-4 h-4" />
                      : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowMap(false)}
                    className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 shadow transition"
                  >
                    <X className="w-3.5 h-3.5" /> Đóng bản đồ
                  </button>
                </div>

                <ProjectMap projects={mapProjects} flyTo={flyTo} />

                {/* Result count bottom-left */}
                <div className="absolute bottom-3 left-3 z-[500] bg-gray-900/90 text-white text-xs px-3 py-1.5 rounded-lg select-none">
                  {Math.min((page - 1) * PAGE_SIZE + 1, filteredProjects.length)}–{Math.min(page * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} kết quả
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
