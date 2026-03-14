import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('portal')
export class PortalController {
  constructor(private readonly prisma: PrismaService) {}

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

    return { data: project };
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
