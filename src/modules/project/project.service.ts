import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';
import { CreateProjectDto, UpdateProjectDto, ListProjectDto } from './dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { sanitizeRichText } from '../../common/utils/html-sanitizer.util';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return toJsonValue(value);
}

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly esService: ElasticsearchService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(workspaceId: string, dto: CreateProjectDto, user: JwtPayload) {
    const bannerItems =
      dto.bannerUrls ??
      (dto.bannerUrl ? [{ originalUrl: dto.bannerUrl, fileName: 'Banner 1' }] : []);
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        projectType: dto.projectType,
        ownerId: dto.ownerId ?? null,
        displayStatus: dto.displayStatus ?? 'DRAFT',
        saleStatus: dto.saleStatus ?? 'COMING_SOON',
        bannerUrl: bannerItems[0]?.originalUrl ?? null,
        bannerUrls: toNullableJsonInput(bannerItems.length > 0 ? bannerItems : null),
        overviewHtml: sanitizeRichText(dto.overviewHtml),
        address: dto.address ?? null,
        province: dto.province ?? null,
        district: dto.district ?? null,
        ward: dto.ward ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        googleMapUrl: dto.googleMapUrl ?? null,
        locationDescriptionHtml: sanitizeRichText(dto.locationDescriptionHtml),
        zoneImageUrl: dto.zoneImages?.[0]?.originalUrl ?? dto.zoneImageUrl ?? null,
        zoneImages: toNullableJsonInput(dto.zoneImages ?? null),
        productImageUrl: dto.productImages?.[0]?.originalUrl ?? dto.productImageUrl ?? null,
        productImages: toNullableJsonInput(dto.productImages ?? null),
        amenityImageUrl: dto.amenityImages?.[0]?.originalUrl ?? dto.amenityImageUrl ?? null,
        amenityImages: toNullableJsonInput(dto.amenityImages ?? null),
        videoUrl: dto.videoUrl ?? null,
        videoDescription: sanitizeRichText(dto.videoDescription),
        contacts: toNullableJsonInput(dto.contacts ?? null),
        planningStats: toNullableJsonInput(dto.planningStats ?? null),
        progressUpdates: toNullableJsonInput(dto.progressUpdates ?? null),
        documentItems: toNullableJsonInput(dto.documentItems ?? null),
        subdivisions: toNullableJsonInput(dto.subdivisions ?? null),
        createdByUserId: user.sub,
      },
      include: { createdBy: { select: { id: true, fullName: true, phone: true } } },
    });

    // Index in Elasticsearch (fire-and-forget — never block the response)
    this.esService.indexProject({
      projectId: project.id,
      workspaceId,
      name: project.name,
      address: project.address,
      province: project.province,
      district: project.district,
      projectType: project.projectType,
      displayStatus: project.displayStatus,
      saleStatus: project.saleStatus,
    });

    return project;
  }

  async list(workspaceId: string, dto: ListProjectDto) {
    const page = Number(dto.page) || 1;
    const limit = Math.min(Number(dto.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { workspaceId };
    if (dto.search) {
      where.name = { contains: dto.search };
    }
    if (dto.projectType) where.projectType = dto.projectType;
    if (dto.displayStatus) where.displayStatus = dto.displayStatus;
    if (dto.saleStatus) where.saleStatus = dto.saleStatus;

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true, phone: true } },
        },
      }),
    ]);

    return { data: items, meta: { total, page, limit } };
  }

  async findById(workspaceId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, workspaceId },
      include: {
        createdBy: { select: { id: true, fullName: true, phone: true } },
      },
    });
    if (!project) throw new NotFoundException('Dự án không tồn tại');
    return project;
  }

  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    await this.findById(workspaceId, id);
    const hasBannerUpdate = dto.bannerUrls !== undefined || dto.bannerUrl !== undefined;
    const nextBannerItems =
      dto.bannerUrls ??
      (dto.bannerUrl !== undefined
        ? dto.bannerUrl
          ? [{ originalUrl: dto.bannerUrl, fileName: 'Banner 1' }]
          : []
        : undefined);

    const result = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.projectType !== undefined && { projectType: dto.projectType }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
        ...(dto.displayStatus !== undefined && { displayStatus: dto.displayStatus }),
        ...(dto.saleStatus !== undefined && { saleStatus: dto.saleStatus }),
        ...(hasBannerUpdate && {
          bannerUrl:
            nextBannerItems && nextBannerItems.length > 0 ? nextBannerItems[0].originalUrl : null,
          bannerUrls: toNullableJsonInput(
            nextBannerItems && nextBannerItems.length > 0 ? nextBannerItems : null,
          ),
        }),
        ...(dto.overviewHtml !== undefined && { overviewHtml: sanitizeRichText(dto.overviewHtml) }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.ward !== undefined && { ward: dto.ward }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.googleMapUrl !== undefined && { googleMapUrl: dto.googleMapUrl }),
        ...(dto.locationDescriptionHtml !== undefined && {
          locationDescriptionHtml: sanitizeRichText(dto.locationDescriptionHtml),
        }),
        ...(dto.zoneImages !== undefined && {
          zoneImageUrl: dto.zoneImages.length > 0 ? dto.zoneImages[0].originalUrl : null,
          zoneImages: toNullableJsonInput(dto.zoneImages.length > 0 ? dto.zoneImages : null),
        }),
        ...(dto.zoneImages === undefined &&
          dto.zoneImageUrl !== undefined && { zoneImageUrl: dto.zoneImageUrl }),
        ...(dto.productImages !== undefined && {
          productImageUrl: dto.productImages.length > 0 ? dto.productImages[0].originalUrl : null,
          productImages: toNullableJsonInput(
            dto.productImages.length > 0 ? dto.productImages : null,
          ),
        }),
        ...(dto.productImages === undefined &&
          dto.productImageUrl !== undefined && { productImageUrl: dto.productImageUrl }),
        ...(dto.amenityImages !== undefined && {
          amenityImageUrl: dto.amenityImages.length > 0 ? dto.amenityImages[0].originalUrl : null,
          amenityImages: toNullableJsonInput(
            dto.amenityImages.length > 0 ? dto.amenityImages : null,
          ),
        }),
        ...(dto.amenityImages === undefined &&
          dto.amenityImageUrl !== undefined && { amenityImageUrl: dto.amenityImageUrl }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.videoDescription !== undefined && {
          videoDescription: sanitizeRichText(dto.videoDescription),
        }),
        ...(dto.contacts !== undefined && { contacts: toNullableJsonInput(dto.contacts) }),
        ...(dto.planningStats !== undefined && {
          planningStats: toNullableJsonInput(dto.planningStats),
        }),
        ...(dto.progressUpdates !== undefined && {
          progressUpdates: toNullableJsonInput(dto.progressUpdates),
        }),
        ...(dto.documentItems !== undefined && {
          documentItems: toNullableJsonInput(dto.documentItems),
        }),
        ...(dto.subdivisions !== undefined && {
          subdivisions: toNullableJsonInput(dto.subdivisions),
        }),
      },
    });

    // Invalidate portal cache for this project
    await this.invalidatePortalCache(workspaceId, id);

    // Re-index in Elasticsearch with updated fields
    this.esService.indexProject({
      projectId: result.id,
      workspaceId,
      name: result.name,
      address: result.address,
      province: result.province,
      district: result.district,
      projectType: result.projectType,
      displayStatus: result.displayStatus,
      saleStatus: result.saleStatus,
    });

    return result;
  }

  async delete(workspaceId: string, id: string) {
    await this.findById(workspaceId, id);
    await this.prisma.project.delete({ where: { id } });
    await this.invalidatePortalCache(workspaceId, id);
    this.esService.deleteProject(workspaceId, id);
    return { success: true };
  }

  /**
   * Removes portal cache keys for the given project and its workspace list pages.
   * Uses Redis KEYS pattern scan when the underlying store is Redis;
   * falls back to simple single-key delete for in-memory store.
   */
  private async invalidatePortalCache(workspaceId: string, projectId: string): Promise<void> {
    try {
      await this.cacheManager.del(`portal:project:${workspaceId}:${projectId}`);

      // Pattern-delete all list-page cache entries for this workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (this.cacheManager as any).store;
      if (store?.client?.keys) {
        // Redis store: use KEYS to find all matching list-cache entries
        const keys: string[] = await store.client.keys(`portal:projects:${workspaceId}:*`);
        if (keys.length > 0) await store.client.del(keys);
        const metaKeys: string[] = await store.client.keys(`portal:meta:${workspaceId}:*`);
        if (metaKeys.length > 0) await store.client.del(metaKeys);
      }
    } catch {
      // Cache invalidation failure must never break the main write path
    }
  }

  async uploadImage(workspaceId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không có file để upload');
    }
    // Pass disk path (diskStorage) so MinioService streams from disk, not RAM
    const result = await this.minioService.uploadPropertyImage(workspaceId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      buffer: file.buffer,
    });
    return { url: result.fileUrl, fileName: file.originalname, size: file.size };
  }
}
