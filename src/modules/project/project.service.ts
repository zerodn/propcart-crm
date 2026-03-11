import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, ListProjectDto } from './dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateProjectDto, user: JwtPayload) {
    const bannerUrls = dto.bannerUrls ?? (dto.bannerUrl ? [dto.bannerUrl] : []);
    return this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        projectType: dto.projectType,
        ownerId: dto.ownerId ?? null,
        displayStatus: dto.displayStatus ?? 'DRAFT',
        saleStatus: dto.saleStatus ?? 'COMING_SOON',
        bannerUrl: bannerUrls[0] ?? null,
        bannerUrls: bannerUrls.length > 0 ? (bannerUrls as any) : null,
        overviewHtml: dto.overviewHtml ?? null,
        address: dto.address ?? null,
        province: dto.province ?? null,
        district: dto.district ?? null,
        zoneImageUrl: dto.zoneImageUrl ?? null,
        productImageUrl: dto.productImageUrl ?? null,
        amenityImageUrl: dto.amenityImageUrl ?? null,
        videoUrl: dto.videoUrl ?? null,
        videoDescription: dto.videoDescription ?? null,
        contacts: dto.contacts ? (dto.contacts as any) : null,
        planningStats: dto.planningStats ? (dto.planningStats as any) : null,
        createdByUserId: user.sub,
      },
      include: { createdBy: { select: { id: true, fullName: true, phone: true } } },
    });
  }

  async list(workspaceId: string, dto: ListProjectDto) {
    const page = Number(dto.page) || 1;
    const limit = Math.min(Number(dto.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
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
    const nextBannerUrls = dto.bannerUrls ?? (dto.bannerUrl !== undefined ? (dto.bannerUrl ? [dto.bannerUrl] : []) : undefined);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.projectType !== undefined && { projectType: dto.projectType }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
        ...(dto.displayStatus !== undefined && { displayStatus: dto.displayStatus }),
        ...(dto.saleStatus !== undefined && { saleStatus: dto.saleStatus }),
        ...(hasBannerUpdate && {
          bannerUrl: nextBannerUrls && nextBannerUrls.length > 0 ? nextBannerUrls[0] : null,
          bannerUrls: nextBannerUrls && nextBannerUrls.length > 0 ? (nextBannerUrls as any) : null,
        }),
        ...(dto.overviewHtml !== undefined && { overviewHtml: dto.overviewHtml }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.zoneImageUrl !== undefined && { zoneImageUrl: dto.zoneImageUrl }),
        ...(dto.productImageUrl !== undefined && { productImageUrl: dto.productImageUrl }),
        ...(dto.amenityImageUrl !== undefined && { amenityImageUrl: dto.amenityImageUrl }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.videoDescription !== undefined && { videoDescription: dto.videoDescription }),
        ...(dto.contacts !== undefined && { contacts: dto.contacts as any }),
        ...(dto.planningStats !== undefined && { planningStats: dto.planningStats as any }),
      },
    });
  }

  async delete(workspaceId: string, id: string) {
    await this.findById(workspaceId, id);
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }
}
