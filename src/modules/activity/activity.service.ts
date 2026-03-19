import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto, ListActivityDto, UpdateActivityDto } from './dto/index';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateActivityDto) {
    // Validate customer belongs to workspace if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, workspaceId, deletedAt: null },
      });
      if (!customer) {
        throw new BadRequestException('Khách hàng không tồn tại trong workspace');
      }
    }

    // Validate demand belongs to workspace if provided
    if (dto.demandId) {
      const demand = await this.prisma.demand.findFirst({
        where: { id: dto.demandId, workspaceId, deletedAt: null },
      });
      if (!demand) {
        throw new BadRequestException('Nhu cầu không tồn tại trong workspace');
      }
    }

    return this.prisma.activity.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        customerId: dto.customerId || null,
        demandId: dto.demandId || null,
        type: dto.type,
        title: dto.title,
        content: dto.content || null,
        result: dto.result || null,
        activityDate: dto.activityDate ? new Date(dto.activityDate) : new Date(),
        duration: dto.duration ?? null,
        status: dto.status || 'COMPLETED',
      },
      include: this.defaultInclude(),
    });
  }

  async list(workspaceId: string, opts?: ListActivityDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId, deletedAt: null };

    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search } },
        { content: { contains: opts.search } },
        { result: { contains: opts.search } },
      ];
    }
    if (opts?.type) where.type = opts.type;
    if (opts?.status) where.status = opts.status;
    if (opts?.customerId) where.customerId = opts.customerId;
    if (opts?.demandId) where.demandId = opts.demandId;

    // Sorting
    const allowedSortFields = [
      'title',
      'type',
      'status',
      'activityDate',
      'duration',
      'createdAt',
      'updatedAt',
    ];
    const sortField =
      opts?.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'activityDate';
    const sortOrder = opts?.sortOrder === 'asc' ? 'asc' : 'desc';

    // Pagination
    const usePagination = opts?.page !== undefined || opts?.limit !== undefined;
    const resolvedPage = opts?.page ?? 1;
    const resolvedLimit = opts?.limit ?? 20;
    const skip = usePagination ? (resolvedPage - 1) * resolvedLimit : undefined;
    const take = usePagination ? resolvedLimit : undefined;

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take,
        include: this.defaultInclude(),
      }),
      this.prisma.activity.count({ where }),
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
    const activity = await this.prisma.activity.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: this.defaultInclude(),
    });

    if (!activity) {
      throw new NotFoundException('Hoạt động không tồn tại');
    }

    return activity;
  }

  async update(id: string, workspaceId: string, dto: UpdateActivityDto) {
    const existed = await this.prisma.activity.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Hoạt động không tồn tại');
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

    // Validate demand if changing
    if (dto.demandId && dto.demandId !== existed.demandId) {
      const demand = await this.prisma.demand.findFirst({
        where: { id: dto.demandId, workspaceId, deletedAt: null },
      });
      if (!demand) {
        throw new BadRequestException('Nhu cầu không tồn tại trong workspace');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (dto.customerId !== undefined) data.customerId = dto.customerId || null;
    if (dto.demandId !== undefined) data.demandId = dto.demandId || null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content || null;
    if (dto.result !== undefined) data.result = dto.result || null;
    if (dto.activityDate !== undefined) data.activityDate = new Date(dto.activityDate);
    if (dto.duration !== undefined) data.duration = dto.duration ?? null;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.activity.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async delete(id: string, workspaceId: string) {
    const existed = await this.prisma.activity.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Hoạt động không tồn tại');
    }

    return this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStatistics(workspaceId: string) {
    const [total, byType, byStatus] = await Promise.all([
      this.prisma.activity.count({ where: { workspaceId, deletedAt: null } }),
      this.prisma.activity.groupBy({
        by: ['type'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.activity.groupBy({
        by: ['status'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byType: byType.map((s) => ({ type: s.type, count: s._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
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
      demand: {
        select: {
          id: true,
          title: true,
          status: true,
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
    };
  }
}
