'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import type { SubdivisionItem, TowerItem, FloorPlanImage, FloorPlanMarker, TowerFundProduct, PortalProduct, PortalProductImage, PortalProductDocument } from '@/types/project';
import { FloorPlanViewer } from './floor-plan-viewer';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID || '';

const ReactPhotoSphereViewer = dynamic(
  () => import('react-photo-sphere-viewer').then((m) => m.ReactPhotoSphereViewer),
  { ssr: false },
);

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l.75 18H3.75L4.5 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V9h6v12M9 9h6M9 13.5h.008M14.992 13.5H15M9 17.5h.008M14.992 17.5H15" />
    </svg>
  );
}

function IconTower({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M5.25 21V5.25A2.25 2.25 0 017.5 3h9a2.25 2.25 0 012.25 2.25V21" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9M9 8.25h.375M14.625 8.25H15M9 12h.375M14.625 12H15M9 15.75h.375M14.625 15.75H15" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  );
}

// ─── SafeImg ─────────────────────────────────────────────────────────────────

function SafeImg({ src, alt, className, onClick }: { src?: string; alt: string; className?: string; onClick?: () => void }) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className ?? ''}`}
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : undefined}
      >
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${className ?? ''}`}
      onError={() => setErrored(true)}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    />
  );
}

// ─── Tower Detail — 6 Tabs ───────────────────────────────────────────────────

type TowerTabId = 'overview' | 'location' | 'camera360' | 'inventory' | 'floorplan' | 'policy';

const TOWER_TABS: { id: TowerTabId; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'location', label: 'Vị trí' },
  { id: 'camera360', label: 'Camera 360' },
  { id: 'inventory', label: 'Quỹ hàng' },
  { id: 'floorplan', label: 'Vị trí quỹ hàng' },
  { id: 'policy', label: 'Chính sách bán' },
];

function TowerDetail({ tower, subdivisionName }: { tower: TowerItem; subdivisionName: string }) {
  const [activeTab, setActiveTab] = useState<TowerTabId>('overview');
  const [cam360Index, setCam360Index] = useState(0);
  const [fpIndex, setFpIndex] = useState(0);
  const [policyIndex, setPolicyIndex] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState<FloorPlanMarker | null>(null);

  const overviewFields: { label: string; value?: string }[] = [
    { label: 'Số tầng', value: tower.floorCount },
    { label: 'Số căn', value: tower.unitCount },
    { label: 'Số thang máy', value: tower.elevatorCount },
    { label: 'Loại hình sở hữu', value: tower.ownershipType },
    { label: 'Tiêu chuẩn bàn giao', value: tower.handoverStandard },
    { label: 'Khởi công', value: tower.constructionStartDate },
    { label: 'Hoàn thành', value: tower.completionDate },
  ].filter((f) => f.value);

  const activeFpImage: FloorPlanImage | undefined = tower.floorPlanImages?.[fpIndex];

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {TOWER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ── Tổng quan ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {tower.descriptionHtml && (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: tower.descriptionHtml }}
              />
            )}
            {overviewFields.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {overviewFields.map((f) => (
                  <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{f.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
            {!tower.descriptionHtml && overviewFields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có thông tin tổng quan</p>
            )}
          </div>
        )}

        {/* ── Vị trí ── */}
        {activeTab === 'location' && (
          <div className="space-y-4">
            {(tower.latitude && tower.longitude) && (
              <div className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: '320px' }}>
                <iframe
                  title={`Vị trí ${tower.name}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(tower.longitude!) - 0.006},${parseFloat(tower.latitude!) - 0.004},${parseFloat(tower.longitude!) + 0.006},${parseFloat(tower.latitude!) + 0.004}&layer=mapnik&marker=${tower.latitude},${tower.longitude}`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            )}
            {tower.googleMapUrl && (
              <div className="space-y-2">
                <div className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: '320px' }}>
                  <iframe
                    title={`Bản đồ ${tower.name}`}
                    src={tower.googleMapUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <a
                  href={tower.googleMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-700 hover:underline text-sm font-medium"
                >
                  <IconMapPin className="w-4 h-4" />
                  Xem trên Google Maps →
                </a>
              </div>
            )}
            {tower.locationDescriptionHtml && (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: tower.locationDescriptionHtml }}
              />
            )}
            {!tower.latitude && !tower.googleMapUrl && !tower.locationDescriptionHtml && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có thông tin vị trí</p>
            )}
          </div>
        )}

        {/* ── Camera 360 ── */}
        {activeTab === 'camera360' && (
          <div className="space-y-4">
            {tower.camera360Url && (
              <div className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: '420px' }}>
                <iframe
                  title={`Camera 360 ${tower.name}`}
                  src={tower.camera360Url}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
            {tower.camera360Images && tower.camera360Images.length > 0 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-black" style={{ height: '420px' }}>
                  <ReactPhotoSphereViewer
                    key={tower.camera360Images[cam360Index]?.originalUrl}
                    src={tower.camera360Images[cam360Index]?.originalUrl ?? ''}
                    height="420px"
                    width="100%"
                    navbar={['zoom', 'move', 'caption', 'fullscreen']}
                    caption={tower.camera360Images[cam360Index]?.description || tower.camera360Images[cam360Index]?.fileName || 'Ảnh 360°'}
                    defaultZoomLvl={0}
                    moveInertia
                    mousewheel
                  />
                </div>
                {tower.camera360Images.length > 1 && (
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 pb-1">
                      {tower.camera360Images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setCam360Index(i)}
                          className={`flex-shrink-0 overflow-hidden rounded-lg border transition w-24 h-14 ${
                            i === cam360Index ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <SafeImg src={img.thumbnailUrl || img.originalUrl} alt={img.fileName || `360 ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!tower.camera360Url && (!tower.camera360Images || tower.camera360Images.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu Camera 360</p>
            )}
          </div>
        )}

        {/* ── Quỹ hàng ── */}
        {activeTab === 'inventory' && (
          <div>
            {tower.fundProducts && tower.fundProducts.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 px-3 pb-1 border-b border-gray-100">
                  <span>Mã căn</span>
                  <span>Tên căn</span>
                  <span>Kho</span>
                </div>
                {tower.fundProducts.map((p, i) => (
                  <div
                    key={`${p.productId}-${i}`}
                    className="grid grid-cols-3 gap-2 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className="font-medium text-amber-700">{p.unitCode}</span>
                    <span className="text-gray-800 truncate">{p.name}</span>
                    <span className="text-gray-500 truncate">{p.warehouseName || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có thông tin quỹ hàng</p>
            )}
          </div>
        )}

        {/* ── Vị trí quỹ hàng (Floor Plan) ── */}
        {activeTab === 'floorplan' && (
          <div className="space-y-4">
            {tower.floorPlanImages && tower.floorPlanImages.length > 0 ? (
              <>
                {/* Floor selector */}
                {tower.floorPlanImages.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {tower.floorPlanImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => { setFpIndex(i); setSelectedMarker(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          i === fpIndex
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {img.description || img.fileName || `Tầng ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {/* Floor plan map with markers */}
                {activeFpImage && (
                  <FloorPlanViewer
                    image={activeFpImage}
                    onMarkerClick={(marker) => setSelectedMarker(marker)}
                  />
                )}
                {/* Product detail dialog */}
                {selectedMarker && (
                  <ProductDialog
                    marker={selectedMarker}
                    productId={selectedMarker.productId}
                    fallbackUnitCode={selectedMarker.productUnitCode}
                    fallbackName={selectedMarker.productName}
                    subdivisionName={subdivisionName}
                    towerName={tower.name}
                    onClose={() => setSelectedMarker(null)}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có mặt bằng quỹ hàng</p>
            )}
          </div>
        )}

        {/* ── Chính sách bán ── */}
        {activeTab === 'policy' && (
          <div className="space-y-4">
            {tower.salesPolicyImages && tower.salesPolicyImages.length > 0 ? (
              <>
                <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ minHeight: '200px' }}>
                  <img
                    src={tower.salesPolicyImages[policyIndex]?.originalUrl}
                    alt={tower.salesPolicyImages[policyIndex]?.description || `Chính sách ${policyIndex + 1}`}
                    className="w-full"
                  />
                </div>
                {tower.salesPolicyImages.length > 1 && (
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 pb-1">
                      {tower.salesPolicyImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setPolicyIndex(i)}
                          className={`flex-shrink-0 overflow-hidden rounded-lg border transition w-20 h-14 ${
                            i === policyIndex ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <SafeImg src={img.thumbnailUrl || img.originalUrl} alt={`Chính sách ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có chính sách bán hàng</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Share Modal ────────────────────────────────────────────────────────────

function ShareModal({
  product,
  unitCode,
  name,
  subdivisionName,
  onClose,
}: {
  product: PortalProduct | null;
  unitCode?: string;
  name?: string;
  subdivisionName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const fp = (val?: number | null) => {
    if (!val) return 'Liên hệ';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(3).replace(/\.?0+$/, '')} tỷ`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} triệu`;
    return val.toLocaleString('vi-VN');
  };

  const lines: string[] = [
    `Chia sẻ căn hộ`,
    `Kính gửi Anh/Chị,`,
    ``,
    `Em xin phép được gửi tới Anh/Chị thông tin chi tiết về căn hộ đang được quan tâm. Nếu Anh/Chị cần thêm hình ảnh thực tế, bản vẽ mặt bằng hoặc hỗ trợ tư vấn thêm về phương thức thanh toán, em luôn sẵn sàng hỗ trợ.`,
    ``,
    `🏠 THÔNG TIN CĂN HỘ`,
    `◆ Mã căn: ${unitCode || '—'}`,
  ];

  if (product?.isContactForPrice) lines.push(`◆ Giá niêm yết: 🔴 Liên hệ`);
  else if (product?.priceWithoutVat) lines.push(`◆ Giá niêm yết: 🔴 ${fp(product.priceWithoutVat)}`);
  if (product?.area) lines.push(`◆ Diện tích thông thủy: ${product.area} m²`);
  if (product?.direction) lines.push(`◆ Hướng: ${product.direction}`);
  if (product?.propertyType) lines.push(`◆ Loại hình: ${product.propertyType}`);
  if (product?.zone || subdivisionName) lines.push(`◆ Phân khu: ${product?.zone || subdivisionName}`);
  if (product?.block) lines.push(`◆ Dãy: ${product.block}`);
  if (product?.warehouse?.name) lines.push(`◆ Kho hàng: ${product.warehouse.name}`);

  const docs = product?.productDocuments ?? [];
  if (docs.length > 0) {
    lines.push(``);
    lines.push(`📋 CHÍNH SÁCH BÁN HÀNG`);
    docs.forEach((d) => lines.push(`${d.documentType}: ${d.fileUrl}`));
  }

  if (product?.callPhone || product?.zaloPhone) {
    lines.push(``);
    if (product?.callPhone) lines.push(`📞 Liên hệ: ${product.callPhone}`);
    if (product?.zaloPhone) lines.push(`💬 Zalo: ${product.zaloPhone}`);
  }

  const shareText = lines.join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const el = document.createElement('textarea');
      el.value = shareText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const content = (
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      style={{ zIndex: 100000 }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-900">Chia sẻ thông tin sản phẩm</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                copied ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {copied ? (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Đã sao chép</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Sao chép</>
              )}
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" aria-label="Đóng">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800 bg-gray-50 rounded-xl p-4 select-all border border-gray-200">{shareText}</pre>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Product Detail Dialog ────────────────────────────────────────────────────

function formatPrice(val?: number | null): string {
  if (!val) return 'Liên hệ';
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(3).replace(/\.?0+$/, '')} tỷ VNĐ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} triệu VNĐ`;
  return val.toLocaleString('vi-VN') + ' VNĐ';
}

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  );
}

type ProductMediaTab = 'images' | 'video';

function ProductDialog({
  marker,
  productId,
  fallbackUnitCode,
  fallbackName,
  subdivisionName,
  towerName,
  onClose,
}: {
  marker: FloorPlanMarker;
  productId?: string;
  fallbackUnitCode?: string;
  fallbackName?: string;
  subdivisionName: string;
  towerName: string;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [product, setProduct] = useState<PortalProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaTab, setMediaTab] = useState<ProductMediaTab>('images');
  const [imgIndex, setImgIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const { user } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch product details
  useEffect(() => {
    if (!productId || !WORKSPACE_ID) return;
    setLoading(true);
    apiClient
      .get<{ data: PortalProduct }>(`/portal/${WORKSPACE_ID}/products/${productId}`)
      .then((res) => setProduct(res.data.data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  // Wishlist state
  useEffect(() => {
    if (user && productId) {
      const key = `wishlist_${user.workspaceId || 'portal'}`;
      const list = JSON.parse(localStorage.getItem(key) || '[]') as string[];
      setIsWishlisted(list.includes(productId));
    }
  }, [user, productId]);

  const handleWishlist = useCallback(() => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!productId) return;
    const key = `wishlist_${user.workspaceId || 'portal'}`;
    const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (isWishlisted) {
      localStorage.setItem(key, JSON.stringify(list.filter((id) => id !== productId)));
      setIsWishlisted(false);
    } else {
      if (!list.includes(productId)) list.push(productId);
      localStorage.setItem(key, JSON.stringify(list));
      setIsWishlisted(true);
    }
  }, [user, productId, isWishlisted]);

  const unitCode = product?.unitCode || fallbackUnitCode;
  const name = product?.name || fallbackName;
  const policyImages: PortalProductImage[] = product?.policyImageUrls ?? [];
  const docs: PortalProductDocument[] = product?.productDocuments ?? [];

  const dialogContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-full sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Thông tin sản phẩm</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleWishlist}
              aria-label="Quan tâm"
              className={`flex items-center gap-1.5 text-xs font-medium transition ${
                isWishlisted ? 'text-rose-500' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Quan tâm
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Chia sẻ
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" aria-label="Đóng">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Two columns — fixed height so thumbnails & promo row align at same level */}
            <div className="flex overflow-hidden shrink-0" style={{ height: '460px' }}>

              {/* LEFT: Media */}
              <div className="w-[52%] flex flex-col border-r border-gray-100 min-w-0">
                {/* Tab switcher */}
                <div className="flex border-b border-gray-100 shrink-0">
                  {(['images', 'video'] as ProductMediaTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMediaTab(tab)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition border-b-2 -mb-px ${
                        mediaTab === tab ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'images' ? (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Hình ảnh</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Video</>
                      )}
                    </button>
                  ))}
                </div>

                {/* Images */}
                {mediaTab === 'images' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Main image — stretches to fill */}
                    <div className="flex-1 relative bg-gray-100 min-h-0 overflow-hidden">
                      {policyImages.length > 0 ? (
                        <>
                          <img
                            src={policyImages[imgIndex]?.originalUrl}
                            alt={`Ảnh ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {policyImages.length > 1 && (
                            <>
                              <button onClick={() => setImgIndex((i) => (i - 1 + policyImages.length) % policyImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <button onClick={() => setImgIndex((i) => (i + 1) % policyImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                              <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{imgIndex + 1}/{policyImages.length}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Chưa có hình ảnh</div>
                      )}
                    </div>
                    {/* Thumbnails — pinned at column bottom */}
                    {policyImages.length > 1 && (
                      <div className="flex gap-1.5 p-2 overflow-x-auto shrink-0 border-t border-gray-100 bg-white">
                        {policyImages.map((img, i) => (
                          <button key={i} onClick={() => setImgIndex(i)} className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition ${
                            i === imgIndex ? 'border-amber-500' : 'border-transparent hover:border-gray-300'
                          }`}>
                            <img src={img.thumbnailUrl || img.originalUrl} alt={`thumb ${i}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Video */}
                {mediaTab === 'video' && (
                  <div className="flex-1 p-4 min-h-0">
                    {product?.promotionProgram ? (
                      <div className="w-full h-full rounded-xl overflow-hidden bg-black">
                        <iframe src={product.promotionProgram} className="w-full h-full border-0" allowFullScreen />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <p className="text-sm">Chưa có video</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Info */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Scrollable info */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {unitCode && (
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">MÃ SẢN PHẨM: {unitCode}</p>
                  )}
                  {product?.transactionStatus === 'BOOKED' && (
                    <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">ĐÃ GIỮ CHỖ</span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">{name || 'Sản phẩm'}</h3>

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">GIÁ BÁN (CHƯA VAT)</p>
                      <p className="text-sm font-bold text-gray-900">
                        {product?.isContactForPrice ? 'Liên hệ' : formatPrice(product?.priceWithoutVat)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">GIÁ BÁN (GỒM VAT)</p>
                      <p className="text-sm font-bold text-gray-900">
                        {product?.isContactForPrice ? 'Liên hệ' : formatPrice(product?.priceWithVat)}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoCell label="LOẠI HÌNH" value={product?.propertyType} />
                    <InfoCell label="KHO HÀNG" value={product?.warehouse?.name} />
                    <InfoCell label="DIỆN TÍCH (M²)" value={product?.area ? `${product.area} m²` : undefined} />
                    <InfoCell label="HƯỚNG" value={product?.direction} />
                    <InfoCell label="PHÂN KHU" value={product?.zone || subdivisionName} />
                    <InfoCell label="DÃY" value={product?.block ?? undefined} />
                  </div>
                </div>

                {/* Chương trình khuyến mãi — pinned at column bottom, aligns with thumbnails */}
                {policyImages.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2.5 shrink-0">
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">Chương trình khuyến mãi</p>
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {policyImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => { setImgIndex(i); setMediaTab('images'); }}
                          className={`flex-shrink-0 w-20 h-[52px] rounded-lg overflow-hidden border-2 transition ${
                            mediaTab === 'images' && i === imgIndex ? 'border-amber-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img src={img.thumbnailUrl || img.originalUrl} alt={`KM ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents — full width row */}
            {docs.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 shrink-0">
                <p className="text-xs font-semibold text-gray-700 mb-2">Tài liệu</p>
                <div className="flex flex-wrap gap-2">
                  {docs.map((doc, i) => (
                    <a
                      key={i}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 hover:bg-amber-100 transition min-w-0"
                    >
                      <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-amber-800 uppercase leading-none mb-0.5">{doc.documentType}</p>
                        <p className="text-xs text-amber-700 truncate max-w-[180px]">{doc.fileName || 'Tải xuống'}</p>
                      </div>
                      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-3 shrink-0">
          <a
            href={product?.callPhone ? `tel:${product.callPhone}` : '#'}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            Liên hệ tư vấn
          </a>
          <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Book căn
          </button>
        </div>
      </div>

      {/* Share overlay */}
      {showShare && (
        <ShareModal
          product={product}
          unitCode={unitCode}
          name={name}
          subdivisionName={subdivisionName}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );

  if (!mounted) return null;
  return createPortal(dialogContent, document.body);
}

// ─── Tower Row ────────────────────────────────────────────────────────────────

function TowerRow({ tower, subdivisionName }: { tower: TowerItem; subdivisionName: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Tower header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
          <IconTower className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-700 text-sm">{tower.name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
            <span>Phân khu: <strong className="text-gray-700">{subdivisionName}</strong></span>
            {tower.floorCount && <span>Số tầng: <strong className="text-gray-700">{tower.floorCount}</strong></span>}
            {tower.unitCount && <span>Số căn: <strong className="text-gray-700">{tower.unitCount}</strong></span>}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition flex-shrink-0"
        >
          {expanded ? (
            <>Thu gọn <span className="w-4 h-4 rounded-full border border-amber-400 flex items-center justify-center text-[10px]">−</span></>
          ) : (
            <>Chi tiết <span className="w-4 h-4 rounded-full border border-amber-400 flex items-center justify-center text-[10px]">+</span></>
          )}
        </button>
      </div>

      {/* Tower detail */}
      {expanded && (
        <div className="px-4 pb-4">
          <TowerDetail tower={tower} subdivisionName={subdivisionName} />
        </div>
      )}
    </div>
  );
}

// ─── Subdivision Card ─────────────────────────────────────────────────────────

function SubdivisionCard({ sub, index }: { sub: SubdivisionItem; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  const towers = sub.towers ?? [];
  const totalUnits = sub.unitCount;

  return (
    <div className="rounded-xl border border-amber-100 overflow-hidden shadow-sm">
      {/* Subdivision header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-lg bg-white border border-amber-200 flex items-center justify-center flex-shrink-0">
          <IconBuilding className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-700 text-sm">{sub.name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-0.5">
            {totalUnits !== undefined && <span>Tổng căn hộ: <strong>{totalUnits}</strong></span>}
            {sub.towerCount && <span>Số toà: <strong>{sub.towerCount}</strong></span>}
            {sub.area && <span>Diện tích: <strong>{sub.area}</strong></span>}
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-medium transition hover:bg-amber-50 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? (
            <>Thu gọn <span className="text-base leading-none">∧</span></>
          ) : (
            <>Xem <span className="text-base leading-none">∨</span></>
          )}
        </button>
      </div>

      {/* Tower list */}
      {expanded && (
        <div className="bg-white px-4 pt-3 pb-4 space-y-3">
          {towers.length > 0 ? (
            towers.map((tower, ti) => (
              <TowerRow key={`${sub.name}-${ti}`} tower={tower} subdivisionName={sub.name} />
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có thông tin toà nhà</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface SubdivisionsTabProps {
  subdivisions: SubdivisionItem[];
}

export function SubdivisionsTab({ subdivisions }: SubdivisionsTabProps) {
  if (subdivisions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-10">Chưa có thông tin phân khu</p>
    );
  }

  return (
    <div className="space-y-4">
      {subdivisions.map((sub, i) => (
        <SubdivisionCard key={`${sub.name}-${i}`} sub={sub} index={i} />
      ))}
    </div>
  );
}
