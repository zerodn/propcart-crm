import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, ListTaskDto, UpdateTaskDto } from './dto/index';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, workspaceId, deletedAt: null },
      });
      if (!customer) {
        throw new BadRequestException('Khách hàng không tồn tại trong workspace');
      }
    }

    if (dto.assignedUserId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: dto.assignedUserId, status: 1 },
      });
      if (!member) {
        throw new BadRequestException('Nhân viên không tồn tại trong workspace');
      }
    }

    return this.prisma.task.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        customerId: dto.customerId || null,
        title: dto.title,
        description: dto.description || null,
        category: dto.category || null,
        priority: dto.priority || null,
        status: dto.status || 'TODO',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignedUserId: dto.assignedUserId || null,
      },
      include: this.defaultInclude(),
    });
  }

  async list(workspaceId: string, opts?: ListTaskDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId, deletedAt: null };

    if (opts?.search) {
      where.OR = [{ title: { contains: opts.search } }, { description: { contains: opts.search } }];
    }
    if (opts?.status) where.status = opts.status;
    if (opts?.priority) where.priority = opts.priority;
    if (opts?.category) where.category = opts.category;
    if (opts?.customerId) where.customerId = opts.customerId;
    if (opts?.assignedUserId) where.assignedUserId = opts.assignedUserId;

    const allowedSortFields = [
      'title',
      'status',
      'priority',
      'dueDate',
      'startDate',
      'createdAt',
      'updatedAt',
    ];
    const sortField =
      opts?.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts?.sortOrder === 'asc' ? 'asc' : 'desc';

    const usePagination = opts?.page !== undefined || opts?.limit !== undefined;
    const resolvedPage = opts?.page ?? 1;
    const resolvedLimit = opts?.limit ?? 20;
    const skip = usePagination ? (resolvedPage - 1) * resolvedLimit : undefined;
    const take = usePagination ? resolvedLimit : undefined;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take,
        include: this.defaultInclude(),
      }),
      this.prisma.task.count({ where }),
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
    const task = await this.prisma.task.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: this.defaultInclude(),
    });

    if (!task) {
      throw new NotFoundException('Công việc không tồn tại');
    }

    return task;
  }

  async update(id: string, workspaceId: string, dto: UpdateTaskDto) {
    const existed = await this.prisma.task.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Công việc không tồn tại');
    }

    if (dto.customerId && dto.customerId !== existed.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, workspaceId, deletedAt: null },
      });
      if (!customer) {
        throw new BadRequestException('Khách hàng không tồn tại trong workspace');
      }
    }

    if (dto.assignedUserId && dto.assignedUserId !== existed.assignedUserId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: dto.assignedUserId, status: 1 },
      });
      if (!member) {
        throw new BadRequestException('Nhân viên không tồn tại trong workspace');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (dto.customerId !== undefined) data.customerId = dto.customerId || null;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.category !== undefined) data.category = dto.category || null;
    if (dto.priority !== undefined) data.priority = dto.priority || null;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'DONE' && !existed.completedDate) {
        data.completedDate = new Date();
      }
      if (dto.status !== 'DONE') {
        data.completedDate = null;
      }
    }
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.assignedUserId !== undefined) data.assignedUserId = dto.assignedUserId || null;

    return this.prisma.task.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async delete(id: string, workspaceId: string) {
    const existed = await this.prisma.task.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Công việc không tồn tại');
    }

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignUser(id: string, workspaceId: string, assignedUserId: string | null) {
    const existed = await this.prisma.task.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Công việc không tồn tại');
    }

    if (assignedUserId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: assignedUserId, status: 1 },
      });
      if (!member) {
        throw new BadRequestException('Nhân viên không tồn tại trong workspace');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: { assignedUserId },
      include: this.defaultInclude(),
    });
  }

  async getStatistics(workspaceId: string) {
    const [total, byStatus, byPriority, byCategory] = await Promise.all([
      this.prisma.task.count({ where: { workspaceId, deletedAt: null } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { workspaceId, deletedAt: null, priority: { not: null } },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['category'],
        where: { workspaceId, deletedAt: null, category: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byPriority: byPriority.map((s) => ({ priority: s.priority, count: s._count.id })),
      byCategory: byCategory.map((s) => ({ category: s.category, count: s._count.id })),
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
