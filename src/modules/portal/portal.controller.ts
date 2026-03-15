import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';
import {
  NOTIFICATION_QUEUE,
  NotificationJobType,
  SendEmailJob,
  CreateNotificationJob,
} from '../../common/queues/notification.queue';

const TTL_PROJECT = 5 * 60 * 1000; // 5 min — project detail + list
const TTL_META = 10 * 60 * 1000; // 10 min — types, provinces, catalogs

@Controller('portal')
export class PortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly esService: ElasticsearchService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get(':workspaceId/projects')
  async listProjects(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('projectType') projectType?: string,
    @Query('province') province?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 200);

    const cacheKey = `portal:projects:${workspaceId}:${pageNum}:${limitNum}:${search ?? ''}:${projectType ?? ''}:${province ?? ''}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const skip = (pageNum - 1) * limitNum;
    const baseWhere: Record<string, unknown> = { workspaceId, displayStatus: { not: 'HIDDEN' } };
    if (projectType) baseWhere.projectType = projectType;
    if (province) baseWhere.province = province;

    let where = { ...baseWhere };

    // Use Elasticsearch full-text search when a query is provided.
    // Falls back to DB LIKE when ES returns no results (e.g. ES is down or cold index).
    if (search) {
      const esIds = await this.esService.searchProjects(workspaceId, search, {
        projectType,
        province,
        displayStatus: 'not-HIDDEN', // handled by baseWhere filter below
      });

      if (esIds.length > 0) {
        where = { ...baseWhere, id: { in: esIds } } as Record<string, unknown>;
      } else {
        // Fallback: DB LIKE (handles cold ES index or empty result gracefully)
        where = { ...baseWhere, name: { contains: search } };
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          projectType: true,
          displayStatus: true,
          saleStatus: true,
          bannerUrl: true,
          bannerUrls: true,
          address: true,
          province: true,
          district: true,
          ward: true,
          latitude: true,
          longitude: true,
          overviewHtml: true,
          createdAt: true,
        },
      }),
    ]);

    const result = { data: items, meta: { total, page: pageNum, limit: limitNum } };
    await this.cacheManager.set(cacheKey, result, TTL_PROJECT);
    return result;
  }

  @Get(':workspaceId/projects/:id')
  async getProject(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    // Cache only the static project data (WITHOUT live prices).
    // Live prices change frequently and must always be fresh.
    const cacheKey = `portal:project:${workspaceId}:${id}`;
    let project = await this.cacheManager.get<Record<string, unknown>>(cacheKey);

    if (!project) {
      const row = await this.prisma.project.findFirst({ where: { id, workspaceId } });
      if (!row) throw new NotFoundException('Dự án không tìm thấy');
      project = row as unknown as Record<string, unknown>;
      await this.cacheManager.set(cacheKey, project, TTL_PROJECT);
    }

    // Always fetch live prices — never serve stale prices from cache
    const subdivisions = await this.enrichWithLivePrices(
      project['subdivisions'] as Record<string, unknown>[] | null,
      workspaceId,
    );

    return { data: { ...project, subdivisions } };
  }

  /** Merges live propertyProduct prices into fundProducts without mutating the cached project. */
  private async enrichWithLivePrices(
    subdivisions: Record<string, unknown>[] | null,
    workspaceId: string,
  ): Promise<Record<string, unknown>[] | null> {
    if (!Array.isArray(subdivisions) || subdivisions.length === 0) return subdivisions;

    // Deep-clone so the cached object stays pristine
    const cloned: Record<string, unknown>[] = JSON.parse(JSON.stringify(subdivisions));

    const productIds: string[] = [];
    for (const sub of cloned) {
      for (const tower of (sub['towers'] as Record<string, unknown>[] | undefined) ?? []) {
        for (const fp of (tower['fundProducts'] as Record<string, unknown>[] | undefined) ?? []) {
          if (fp['productId']) productIds.push(fp['productId'] as string);
        }
      }
    }

    if (productIds.length === 0) return cloned;

    const products = await this.prisma.propertyProduct.findMany({
      where: { id: { in: productIds }, workspaceId, isHidden: false },
      select: {
        id: true,
        priceWithVat: true,
        priceWithoutVat: true,
        isContactForPrice: true,
        area: true,
        direction: true,
        propertyType: true,
        zone: true,
        block: true,
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const sub of cloned) {
      for (const tower of (sub['towers'] as Record<string, unknown>[] | undefined) ?? []) {
        if (!Array.isArray(tower['fundProducts'])) continue;
        tower['fundProducts'] = (tower['fundProducts'] as Record<string, unknown>[]).map((fp) => {
          const live = productMap.get(fp['productId'] as string);
          if (!live) return fp;
          return {
            ...fp,
            priceWithVat: live.priceWithVat ? Number(live.priceWithVat) : null,
            priceWithoutVat: live.priceWithoutVat ? Number(live.priceWithoutVat) : null,
            isContactForPrice: live.isContactForPrice,
            area: live.area ? Number(live.area) : (fp['area'] ?? null),
            direction: live.direction ?? fp['direction'] ?? null,
            propertyType: live.propertyType ?? fp['propertyType'] ?? null,
            zone: live.zone ?? fp['zone'] ?? null,
            block: live.block ?? fp['block'] ?? null,
            warehouse: live.warehouse ?? fp['warehouse'] ?? null,
          };
        });
      }
    }

    return cloned;
  }

  /** Public: project types from catalog or fallback */
  @Get(':workspaceId/project-types')
  async getProjectTypes(@Param('workspaceId') workspaceId: string) {
    const cacheKey = `portal:meta:${workspaceId}:types`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const catalog = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PROJECT_TYPE' },
      include: { values: { orderBy: { order: 'asc' } } },
    });

    if (catalog && catalog.values.length > 0) {
      const result = { data: catalog.values.map((v) => ({ value: v.value, label: v.label })) };
      await this.cacheManager.set(cacheKey, result, TTL_META);
      return result;
    }

    // Fallback: derive from actual project data
    const types = await this.prisma.project.findMany({
      where: { workspaceId, displayStatus: { not: 'HIDDEN' } },
      select: { projectType: true },
      distinct: ['projectType'],
    });

    const labelMap: Record<string, string> = {
      HIGH_RISE: 'Cao tầng',
      LOW_RISE: 'Thấp tầng',
    };

    const result = {
      data: types.map((t) => ({
        value: t.projectType,
        label: labelMap[t.projectType] ?? t.projectType,
      })),
    };
    await this.cacheManager.set(cacheKey, result, TTL_META);
    return result;
  }

  /** Public: distinct provinces from projects */
  @Get(':workspaceId/provinces')
  async getProvinces(@Param('workspaceId') workspaceId: string) {
    const cacheKey = `portal:meta:${workspaceId}:provinces`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.project.findMany({
      where: { workspaceId, displayStatus: { not: 'HIDDEN' }, province: { not: null } },
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' },
    });

    const result = { data: rows.map((r) => r.province).filter(Boolean) };
    await this.cacheManager.set(cacheKey, result, TTL_META);
    return result;
  }

  /** Public: catalog option values by type list */
  @Get(':workspaceId/catalog-options')
  async getCatalogOptions(
    @Param('workspaceId') workspaceId: string,
    @Query('types') types?: string,
  ) {
    const cacheKey = `portal:meta:${workspaceId}:catalogs:${types ?? ''}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const typeList = types?.split(',').filter(Boolean) ?? [];
    const catalogs = await this.prisma.catalog.findMany({
      where: typeList.length > 0 ? { workspaceId, type: { in: typeList } } : { workspaceId },
      include: { values: { orderBy: { order: 'asc' } } },
    });
    const data: Record<string, { value: string; label: string }[]> = {};
    for (const cat of catalogs) {
      data[cat.type] = cat.values.map((v) => ({ value: v.value, label: v.label }));
    }
    const result = { data };
    await this.cacheManager.set(cacheKey, result, TTL_META);
    return result;
  }

  /** Public: submit booking request for a product */
  @Post(':workspaceId/products/:id/booking-request')
  async createBookingRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('id') productId: string,
    @Body() body: { saleName: string; agency?: string; phone: string; notes?: string },
  ) {
    if (!body.saleName?.trim() || !body.phone?.trim()) {
      throw new BadRequestException('Tên sale và SĐT là bắt buộc');
    }

    const product = await this.prisma.propertyProduct.findFirst({
      where: { id: productId, workspaceId, isHidden: false },
      select: { id: true, name: true, unitCode: true, contactMemberIds: true },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tìm thấy');

    const contactIds: string[] = Array.isArray(product.contactMemberIds)
      ? (product.contactMemberIds as string[])
      : [];

    const users =
      contactIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: contactIds } },
            select: { id: true, email: true, fullName: true },
          })
        : [];

    const notificationPayload = {
      type: 'BOOKING_REQUEST',
      productId: product.id,
      productName: product.name,
      unitCode: product.unitCode,
      saleName: body.saleName,
      agency: body.agency,
      phone: body.phone,
      notes: body.notes,
    };

    // Enqueue jobs — response returns immediately, worker handles delivery async
    const jobs: Promise<unknown>[] = [];

    for (const u of users) {
      jobs.push(
        this.notificationQueue.add(NotificationJobType.CREATE_NOTIFICATION, {
          userId: u.id,
          notificationType: 'BOOKING_REQUEST',
          payload: notificationPayload,
        } satisfies CreateNotificationJob),
      );

      if (u.email) {
        jobs.push(
          this.notificationQueue.add(NotificationJobType.SEND_EMAIL, {
            type: 'booking-request',
            to: u.email,
            recipientName: u.fullName || 'Sales',
            productName: product.name,
            unitCode: product.unitCode,
            saleName: body.saleName,
            agency: body.agency,
            phone: body.phone,
            notes: body.notes,
          } satisfies SendEmailJob),
        );
      }
    }

    await Promise.all(jobs);

    return { data: { success: true, notified: users.length } };
  }

  /** Public: product detail by id */
  @Get(':workspaceId/products/:id')
  async getProduct(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const product = await this.prisma.propertyProduct.findFirst({
      where: { id, workspaceId, isHidden: false },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tìm thấy');
    }

    return { data: product };
  }
}
