import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDemandDto, ListDemandDto, UpdateDemandDto } from './dto/index';

@Injectable()
export class DemandService {
  private readonly logger = new Logger(DemandService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateDemandDto) {
    // Validate customer belongs to workspace if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, workspaceId, deletedAt: null },
      });
      if (!customer) {
        throw new BadRequestException('Khách hàng không tồn tại trong workspace');
      }
    }

    return this.prisma.demand.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        customerId: dto.customerId || null,
        title: dto.title,
        propertyType: dto.propertyType || null,
        purpose: dto.purpose || null,
        budgetMin: dto.budgetMin ?? null,
        budgetMax: dto.budgetMax ?? null,
        budgetUnit: dto.budgetUnit || 'VND',
        areaMin: dto.areaMin ?? null,
        areaMax: dto.areaMax ?? null,
        provinceCode: dto.provinceCode || null,
        provinceName: dto.provinceName || null,
        districtCode: dto.districtCode || null,
        districtName: dto.districtName || null,
        wardCode: dto.wardCode || null,
        wardName: dto.wardName || null,
        address: dto.address || null,
        status: dto.status || 'NEW',
        priority: dto.priority || null,
        assignedUserId: dto.assignedUserId || null,
        description: dto.description || null,
        note: dto.note || null,
      },
      include: this.defaultInclude(),
    });
  }

  async list(workspaceId: string, opts?: ListDemandDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId, deletedAt: null };

    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search } },
        { description: { contains: opts.search } },
        { address: { contains: opts.search } },
      ];
    }
    if (opts?.status) where.status = opts.status;
    if (opts?.priority) where.priority = opts.priority;
    if (opts?.propertyType) where.propertyType = opts.propertyType;
    if (opts?.purpose) where.purpose = opts.purpose;
    if (opts?.customerId) where.customerId = opts.customerId;
    if (opts?.assignedUserId) where.assignedUserId = opts.assignedUserId;

    // Sorting
    const allowedSortFields = [
      'title',
      'status',
      'priority',
      'budgetMin',
      'budgetMax',
      'createdAt',
      'updatedAt',
    ];
    const sortField =
      opts?.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts?.sortOrder === 'asc' ? 'asc' : 'desc';

    // Pagination
    const usePagination = opts?.page !== undefined || opts?.limit !== undefined;
    const resolvedPage = opts?.page ?? 1;
    const resolvedLimit = opts?.limit ?? 20;
    const skip = usePagination ? (resolvedPage - 1) * resolvedLimit : undefined;
    const take = usePagination ? resolvedLimit : undefined;

    const [items, total] = await Promise.all([
      this.prisma.demand.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take,
        include: this.defaultInclude(),
      }),
      this.prisma.demand.count({ where }),
    ]);

    const meta = usePagination
      ? {
          total,
          page: resolvedPage,
          limit: resolvedLimit,
          totalPages: Math.ceil(total / resolvedLimit),
        }
      : { total };

    return { data: items, meta };
  }

  async findById(id: string, workspaceId: string) {
    const demand = await this.prisma.demand.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: this.defaultInclude(),
    });

    if (!demand) {
      throw new NotFoundException('Nhu cầu không tồn tại');
    }

    return demand;
  }

  async update(id: string, workspaceId: string, dto: UpdateDemandDto) {
    const existed = await this.prisma.demand.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Nhu cầu không tồn tại');
    }

    // Validate customer if changing
    if (dto.customerId && dto.customerId !== existed.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, workspaceId, deletedAt: null },
      });
      if (!customer) {
        throw new BadRequestException('Khách hàng không tồn tại trong workspace');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (dto.customerId !== undefined) data.customerId = dto.customerId || null;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType || null;
    if (dto.purpose !== undefined) data.purpose = dto.purpose || null;
    if (dto.budgetMin !== undefined) data.budgetMin = dto.budgetMin ?? null;
    if (dto.budgetMax !== undefined) data.budgetMax = dto.budgetMax ?? null;
    if (dto.budgetUnit !== undefined) data.budgetUnit = dto.budgetUnit || 'VND';
    if (dto.areaMin !== undefined) data.areaMin = dto.areaMin ?? null;
    if (dto.areaMax !== undefined) data.areaMax = dto.areaMax ?? null;
    if (dto.provinceCode !== undefined) data.provinceCode = dto.provinceCode || null;
    if (dto.provinceName !== undefined) data.provinceName = dto.provinceName || null;
    if (dto.districtCode !== undefined) data.districtCode = dto.districtCode || null;
    if (dto.districtName !== undefined) data.districtName = dto.districtName || null;
    if (dto.wardCode !== undefined) data.wardCode = dto.wardCode || null;
    if (dto.wardName !== undefined) data.wardName = dto.wardName || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority || null;
    if (dto.assignedUserId !== undefined) data.assignedUserId = dto.assignedUserId || null;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.note !== undefined) data.note = dto.note || null;

    return this.prisma.demand.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async delete(id: string, workspaceId: string) {
    const existed = await this.prisma.demand.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Nhu cầu không tồn tại');
    }

    return this.prisma.demand.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignUser(id: string, workspaceId: string, assignedUserId: string | null) {
    const existed = await this.prisma.demand.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Nhu cầu không tồn tại');
    }

    if (assignedUserId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: assignedUserId, status: 1 },
      });
      if (!member) {
        throw new BadRequestException('Nhân viên không tồn tại trong workspace');
      }
    }

    return this.prisma.demand.update({
      where: { id },
      data: { assignedUserId },
      include: this.defaultInclude(),
    });
  }

  async getStatistics(workspaceId: string) {
    const [total, byStatus, byPriority, byPropertyType, byPurpose] = await Promise.all([
      this.prisma.demand.count({ where: { workspaceId, deletedAt: null } }),
      this.prisma.demand.groupBy({
        by: ['status'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.demand.groupBy({
        by: ['priority'],
        where: { workspaceId, deletedAt: null, priority: { not: null } },
        _count: { id: true },
      }),
      this.prisma.demand.groupBy({
        by: ['propertyType'],
        where: { workspaceId, deletedAt: null, propertyType: { not: null } },
        _count: { id: true },
      }),
      this.prisma.demand.groupBy({
        by: ['purpose'],
        where: { workspaceId, deletedAt: null, purpose: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byPriority: byPriority.map((s) => ({ priority: s.priority, count: s._count.id })),
      byPropertyType: byPropertyType.map((s) => ({
        propertyType: s.propertyType,
        count: s._count.id,
      })),
      byPurpose: byPurpose.map((s) => ({ purpose: s.purpose, count: s._count.id })),
    };
  }

  private defaultInclude() {
    return {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
    };
  }
}
