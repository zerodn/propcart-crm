import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../../common/mail/mail.service';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
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
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { workspaceId, displayStatus: { not: 'HIDDEN' } };
    if (search) {
      where.name = { contains: search };
    }
    if (projectType) {
      where.projectType = projectType;
    }
    if (province) {
      where.province = province;
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

    return { data: items, meta: { total, page: pageNum, limit: limitNum } };
  }

  @Get(':workspaceId/projects/:id')
  async getProject(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, workspaceId },
    });

    if (!project) {
      throw new NotFoundException('Dự án không tìm thấy');
    }

    // Enrich fundProducts in subdivisions with live price data from propertyProduct table
    const subdivisions = project.subdivisions as Record<string, unknown>[] | null;
    if (Array.isArray(subdivisions) && subdivisions.length > 0) {
      // Collect all productIds across all towers in all subdivisions
      const productIds: string[] = [];
      for (const sub of subdivisions) {
        if (Array.isArray(sub['towers'])) {
          for (const tower of sub['towers'] as Record<string, unknown>[]) {
            if (Array.isArray(tower['fundProducts'])) {
              for (const fp of tower['fundProducts'] as Record<string, unknown>[]) {
                if (fp['productId']) productIds.push(fp['productId'] as string);
              }
            }
          }
        }
      }

      if (productIds.length > 0) {
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

        // Merge enriched data back into fundProducts
        for (const sub of subdivisions) {
          if (Array.isArray(sub['towers'])) {
            for (const tower of sub['towers'] as Record<string, unknown>[]) {
              if (Array.isArray(tower['fundProducts'])) {
                tower['fundProducts'] = (tower['fundProducts'] as Record<string, unknown>[]).map(
                  (fp) => {
                    const live = productMap.get(fp['productId'] as string);
                    if (!live) return fp;
                    return {
                      ...fp,
                      priceWithVat: live.priceWithVat ? Number(live.priceWithVat) : null,
                      priceWithoutVat: live.priceWithoutVat ? Number(live.priceWithoutVat) : null,
                      isContactForPrice: live.isContactForPrice,
                      area: live.area ? Number(live.area) : (fp.area ?? null),
                      direction: live.direction ?? fp.direction ?? null,
                      propertyType: live.propertyType ?? fp.propertyType ?? null,
                      zone: live.zone ?? fp.zone ?? null,
                      block: live.block ?? fp.block ?? null,
                      warehouse: live.warehouse ?? fp.warehouse ?? null,
                    };
                  },
                );
              }
            }
          }
        }
      }
    }

    return { data: { ...project, subdivisions } };
  }

  /** Public: project types from catalog or fallback */
  @Get(':workspaceId/project-types')
  async getProjectTypes(@Param('workspaceId') workspaceId: string) {
    const catalog = await this.prisma.catalog.findFirst({
      where: { workspaceId, type: 'PROJECT_TYPE' },
      include: { values: { orderBy: { order: 'asc' } } },
    });

    if (catalog && catalog.values.length > 0) {
      return {
        data: catalog.values.map((v) => ({ value: v.value, label: v.label })),
      };
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

    return {
      data: types.map((t) => ({
        value: t.projectType,
        label: labelMap[t.projectType] ?? t.projectType,
      })),
    };
  }

  /** Public: distinct provinces from projects */
  @Get(':workspaceId/provinces')
  async getProvinces(@Param('workspaceId') workspaceId: string) {
    const rows = await this.prisma.project.findMany({
      where: { workspaceId, displayStatus: { not: 'HIDDEN' }, province: { not: null } },
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' },
    });

    return { data: rows.map((r) => r.province).filter(Boolean) };
  }

  /** Public: catalog option values by type list */
  @Get(':workspaceId/catalog-options')
  async getCatalogOptions(
    @Param('workspaceId') workspaceId: string,
    @Query('types') types?: string,
  ) {
    const typeList = types?.split(',').filter(Boolean) ?? [];
    const catalogs = await this.prisma.catalog.findMany({
      where: typeList.length > 0 ? { workspaceId, type: { in: typeList } } : { workspaceId },
      include: { values: { orderBy: { order: 'asc' } } },
    });
    const result: Record<string, { value: string; label: string }[]> = {};
    for (const cat of catalogs) {
      result[cat.type] = cat.values.map((v) => ({ value: v.value, label: v.label }));
    }
    return { data: result };
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

    await Promise.all([
      ...users.map((u) =>
        this.notificationService.create(u.id, 'BOOKING_REQUEST', notificationPayload),
      ),
      ...users
        .filter((u) => u.email)
        .map((u) =>
          this.mailService.sendBookingRequestEmail(u.email!, {
            recipientName: u.fullName || 'Sales',
            productName: product.name,
            unitCode: product.unitCode,
            saleName: body.saleName,
            agency: body.agency,
            phone: body.phone,
            notes: body.notes,
          }),
        ),
    ]);

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
