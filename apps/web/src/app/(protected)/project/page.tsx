'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Plus,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Building2,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { usePageSetup } from '@/hooks/use-page-setup';
import { getAccessToken } from '@/lib/auth';
import { useProject, Project, CreateProjectPayload } from '@/hooks/use-project';
import { useCatalog } from '@/hooks/use-catalog';
import { ProjectTypeDialog } from '@/components/project/project-type-dialog';
import { ProjectForm } from '@/components/project/project-form';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

const SALE_STATUS_COLOR: Record<string, string> = {
  COMING_SOON: 'bg-blue-100 text-blue-700',
  ON_SALE: 'bg-green-100 text-green-700',
  SOLD_OUT: 'bg-gray-100 text-gray-600',
};

const DISPLAY_STATUS_COLOR: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  HIDDEN: 'bg-red-100 text-red-700',
};

function SaleStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label: Record<string, string> = {
    COMING_SOON: t('project.status.comingSoon'),
    ON_SALE: t('project.status.onSale'),
    SOLD_OUT: t('project.status.soldOut'),
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${SALE_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {label[status] ?? status}
    </span>
  );
}

function ProjectTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const label: Record<string, string> = {
    LOW_RISE: t('project.type.lowRise'),
    HIGH_RISE: t('project.type.highRise'),
  };
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
      {label[type] ?? type}
    </span>
  );
}

function DisplayStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label: Record<string, string> = {
    PUBLISHED: t('project.displayStatus.published'),
    DRAFT: t('project.displayStatus.draft'),
    HIDDEN: t('project.displayStatus.hidden'),
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${DISPLAY_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {label[status] ?? status}
    </span>
  );
}

function CardMenu({
  onView,
  onEdit,
  onCopy,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/80 transition-colors"
        aria-label={t('common.options')}
      >
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-36">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4 text-gray-400" /> {t('common.viewDetails')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4 text-gray-400" /> {t('common.editInfo')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCopy();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4 text-gray-400" /> {t('common.copy')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> {t('common.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Pagination({
  total,
  page,
  limit,
  onPageChange,
}: {
  total: number;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  const { t } = useI18n();
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (page > 4) pages.push('...');
      if (page > 3 && page < totalPages - 2) pages.push(page);
      if (page < totalPages - 3) pages.push('...');
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    }
    return [...new Set(pages)];
  };

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={t('common.pagePrev')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="w-8 h-8 flex items-center justify-center text-sm text-gray-400"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors border ${
              p === page
                ? 'bg-amber-600 text-white border-amber-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={t('common.pageNext')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

const PAGE_LIMIT = 9;

export default function ProjectPage() {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const workspaceId = workspace?.id ?? '';

  const { projects, total, isLoading, list, create, update, remove, uploadImage } =
    useProject(workspaceId);
  const { items: ownerCatalogItems } = useCatalog('PROJECT_OWNER');
  const { items: saleStatusCatalogItems } = useCatalog('PROJECT_SALE_STATUS');

  const [currentPage, setCurrentPage] = useState(1);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<'LOW_RISE' | 'HIGH_RISE' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [draftByType, setDraftByType] = useState<
    Partial<Record<'LOW_RISE' | 'HIGH_RISE', Project>>
  >({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const ownerOptions = useMemo(() => {
    const catalog =
      ownerCatalogItems.find((c) => c.type === 'PROJECT_OWNER') ?? ownerCatalogItems[0];
    return catalog?.values?.map((v) => ({ value: v.value, label: v.label })) ?? [];
  }, [ownerCatalogItems]);

  const saleStatusOptions = useMemo(() => {
    const catalog =
      saleStatusCatalogItems.find((c) => c.type === 'PROJECT_SALE_STATUS') ??
      saleStatusCatalogItems[0];
    return catalog?.values?.map((v) => ({ value: v.value, label: v.label })) ?? [];
  }, [saleStatusCatalogItems]);

  useEffect(() => {
    if (!workspaceId) return;
    list({ page: currentPage, limit: PAGE_LIMIT });
  }, [workspaceId, currentPage, list]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setSelectedType(null);
    setShowTypeDialog(true);
  };

  usePageSetup({
    title: t('project.title'),
    subtitle: t('project.subtitle'),
    actions: (
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <Filter className="w-3.5 h-3.5" /> {t('project.action.filter')}
        </button>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('common.addNew')}
        </button>
      </div>
    ),
  });

  const handleTypeConfirm = (type: 'LOW_RISE' | 'HIGH_RISE') => {
    setEditingProject(draftByType[type] ?? null);
    setSelectedType(type);
    setShowTypeDialog(false);
    setShowForm(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setSelectedType(project.projectType);
    setShowForm(true);
  };

  const handleFormSubmit = async (
    payload: Partial<CreateProjectPayload>,
    options?: { closeAfterSave?: boolean; projectId?: string; silent?: boolean },
  ): Promise<Project | null> => {
    setIsSubmitting(true);

    const shouldClose = options?.closeAfterSave ?? true;
    const targetId = options?.projectId ?? editingProject?.id;

    let saved: Project | null = null;
    if (targetId) {
      saved = await update(targetId, payload, { silent: options?.silent });
    } else {
      saved = await create(payload as CreateProjectPayload, { silent: options?.silent });
    }

    setIsSubmitting(false);

    if (saved) {
      setDraftByType((prev) => ({ ...prev, [saved.projectType]: saved }));
      if (editingProject && editingProject.id === saved.id) {
        setEditingProject(saved);
      }
      if (shouldClose) {
        setShowForm(false);
      }
      list({ page: currentPage, limit: PAGE_LIMIT });
    }

    return saved;
  };

  const handleFormClose = () => {
    setEditingProject(null);
    setSelectedType(null);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const ok = await remove(deleteId);
    setIsDeleting(false);
    if (ok) {
      setDeleteId(null);
      list({ page: currentPage, limit: PAGE_LIMIT });
    }
  };

  const handleCopyProject = async () => {
    if (!copyId) return;
    const sourceProject = projects.find((p) => p.id === copyId);
    if (!sourceProject) return;

    setIsCopying(true);

    // Extract base name and find the highest sequential number
    const baseName = sourceProject.name || t('project.title');
    const projectNames = projects.map((p) => p.name || '');

    // Regex to match name + number at the end
    const regex = new RegExp(`^${baseName}\\s*(\\d+)?$`);
    let highestNum = 0;

    projectNames.forEach((name) => {
      const match = name.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highestNum) highestNum = num;
      }
    });

    // Create new project with incremented name
    const newProjectName = `${baseName} ${highestNum + 1}`;

    // Deep copy all project data
    const payload: CreateProjectPayload = {
      projectType: sourceProject.projectType,
      ownerId: sourceProject.ownerId ?? undefined,
      saleStatus: sourceProject.saleStatus,
      displayStatus: sourceProject.displayStatus,
      name: newProjectName,
      address: sourceProject.address ?? undefined,
      province: sourceProject.province ?? undefined,
      district: sourceProject.district ?? undefined,
      ward: sourceProject.ward ?? undefined,
      latitude: sourceProject.latitude ?? undefined,
      longitude: sourceProject.longitude ?? undefined,
      googleMapUrl: sourceProject.googleMapUrl ?? undefined,
      locationDescriptionHtml: sourceProject.locationDescriptionHtml ?? undefined,
      videoUrl: sourceProject.videoUrl ?? undefined,
      overviewHtml: sourceProject.overviewHtml ?? undefined,
      videoDescription: sourceProject.videoDescription ?? undefined,
      bannerUrl: sourceProject.bannerUrl ?? undefined,
      // Deep copy arrays
      amenityImages: sourceProject.amenityImages
        ? sourceProject.amenityImages.map((item) => ({ ...item }))
        : undefined,
      // Deep copy subdivisions and all nested data
      subdivisions: sourceProject.subdivisions
        ? sourceProject.subdivisions.map((subdivision) => ({
            name: subdivision.name,
            imageUrl: subdivision.imageUrl,
            towerCount: subdivision.towerCount,
            unitCount: subdivision.unitCount,
            unitStandard: subdivision.unitStandard,
            handoverDate: subdivision.handoverDate,
            area: subdivision.area,
            constructionStyle: subdivision.constructionStyle,
            ownershipType: subdivision.ownershipType,
            descriptionHtml: subdivision.descriptionHtml,
            // Deep copy towers and all nested arrays
            towers: Array.isArray(subdivision.towers)
              ? subdivision.towers.map((tower) => ({
                  name: tower.name,
                  floorCount: tower.floorCount,
                  unitCount: tower.unitCount,
                  elevatorCount: tower.elevatorCount,
                  ownershipType: tower.ownershipType,
                  handoverStandard: tower.handoverStandard,
                  constructionStartDate: tower.constructionStartDate,
                  completionDate: tower.completionDate,
                  latitude: tower.latitude,
                  longitude: tower.longitude,
                  googleMapUrl: tower.googleMapUrl,
                  locationDescriptionHtml: tower.locationDescriptionHtml,
                  camera360Url: tower.camera360Url,
                  descriptionHtml: tower.descriptionHtml,
                  // Deep copy all nested arrays
                  camera360Images: Array.isArray(tower.camera360Images)
                    ? [...tower.camera360Images]
                    : tower.camera360Images,
                  salesPolicyImages: Array.isArray(tower.salesPolicyImages)
                    ? [...tower.salesPolicyImages]
                    : tower.salesPolicyImages,
                  fundProducts: Array.isArray(tower.fundProducts)
                    ? [...tower.fundProducts]
                    : tower.fundProducts,
                  floorPlanImages: Array.isArray(tower.floorPlanImages)
                    ? [...tower.floorPlanImages]
                    : tower.floorPlanImages,
                }))
              : subdivision.towers,
          }))
        : undefined,
      planningStats: sourceProject.planningStats
        ? sourceProject.planningStats.map((item) => ({ ...item }))
        : undefined,
      progressUpdates: sourceProject.progressUpdates
        ? sourceProject.progressUpdates.map((item) => ({
            label: item.label,
            detailHtml: item.detailHtml,
            videos: Array.isArray(item.videos)
              ? [...item.videos]
              : item.videoUrl
                ? [{ url: item.videoUrl }]
                : undefined,
            images: Array.isArray(item.images) ? [...item.images] : item.images,
          }))
        : undefined,
      documentItems: sourceProject.documentItems
        ? sourceProject.documentItems.map((item) => ({
            documentType: item.documentType || '',
            documentUrl: item.documentUrl || '',
          }))
        : undefined,
      contacts: sourceProject.contacts
        ? sourceProject.contacts.map((item) => ({ ...item }))
        : undefined,
    };

    const saved = await create(payload, { silent: false });

    setIsCopying(false);
    if (saved) {
      setCopyId(null);
      list({ page: currentPage, limit: PAGE_LIMIT });
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center h-60">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
          <FolderOpen className="w-12 h-12 text-gray-300" />
          <p className="text-sm font-medium">{t('project.empty.title')}</p>
            <p className="text-xs">{t('project.empty.hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 bg-gray-100">
                {project.bannerUrl ? (
                  <img
                    src={project.bannerUrl}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-300" />
                  </div>
                )}

                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <SaleStatusBadge status={project.saleStatus} />
                  <ProjectTypeBadge type={project.projectType} />
                  <DisplayStatusBadge status={project.displayStatus} />
                </div>

                <div className="absolute top-2 right-2">
                  <CardMenu
                    onView={() => {}}
                    onEdit={() => handleOpenEdit(project)}
                    onCopy={() => setCopyId(project.id)}
                    onDelete={() => setDeleteId(project.id)}
                  />
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{project.name}</h3>
                {(project.ward || project.district || project.province) && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {[project.ward, project.district, project.province].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 flex-shrink-0">
          <span className="text-sm text-gray-500">{t('project.title')}: {total.toLocaleString('vi-VN')}</span>
          <Pagination
            total={total}
            page={currentPage}
            limit={PAGE_LIMIT}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      <ProjectTypeDialog
        isOpen={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        onConfirm={handleTypeConfirm}
      />

      {showForm && selectedType && (
        <ProjectForm
          isOpen={showForm}
          onClose={handleFormClose}
          editingProject={editingProject}
          projectType={selectedType}
          ownerOptions={ownerOptions}
          saleStatusOptions={saleStatusOptions}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          uploadImage={uploadImage}
          accessToken={getAccessToken() || ''}
          workspaceId={workspaceId}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('project.action.deleteTitle')}
        message={t('project.confirm.deleteText')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={!!copyId}
        onCancel={() => setCopyId(null)}
        onConfirm={handleCopyProject}
        title={t('project.action.copyTitle')}
        message={t('project.confirm.copyText')}
        confirmText={t('project.action.copy')}
        cancelText={t('common.cancel')}
        isLoading={isCopying}
      />
    </div>
  );
}
