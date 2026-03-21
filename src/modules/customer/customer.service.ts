import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { ForbiddenException } from '@nestjs/common';
import {
  CreateCommentDto,
  CreateCustomerDto,
  CreateCustomerInfoDto,
  CreateCareHistoryDto,
  ListCustomerDto,
  ReorderCustomerInfoDto,
  UpdateCareHistoryDto,
  UpdateCommentDto,
  UpdateCustomerDto,
  UpdateCustomerInfoDto,
} from './dto/index';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateCustomerDto) {
    // Check phone uniqueness within workspace (only when phone provided)
    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { workspaceId, phone: dto.phone, deletedAt: null },
      });
      if (existing) {
        throw new BadRequestException('Số điện thoại đã tồn tại trong workspace');
      }
    }

    // Generate customer code: atomically increment workspace customerSeq
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { customerSeq: { increment: 1 } },
      select: { customerSeq: true },
    });
    const customerCode = `KH${String(workspace.customerSeq).padStart(5, '0')}`;

    return this.prisma.customer.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        customerCode,
        title: dto.title || null,
        fullName: dto.fullName,
        phone: dto.phone || null,
        email: dto.email || null,
        gender: dto.gender || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        address: dto.address || null,
        provinceCode: dto.provinceCode || null,
        provinceName: dto.provinceName || null,
        districtCode: dto.districtCode || null,
        districtName: dto.districtName || null,
        wardCode: dto.wardCode || null,
        wardName: dto.wardName || null,
        source: dto.source || null,
        group: dto.group || null,
        status: dto.status || 'NEW',
        interestLevel: dto.interestLevel || null,
        assignedUserId: dto.assignedUserId || null,
        assignees: dto.assignees ? JSON.parse(JSON.stringify(dto.assignees)) : undefined,
        observers: dto.observers ? JSON.parse(JSON.stringify(dto.observers)) : undefined,
        tags: dto.tags ? JSON.parse(JSON.stringify(dto.tags)) : undefined,
        note: dto.note || null,
      },
      include: this.defaultInclude(),
    });
  }

  async list(workspaceId: string, opts?: ListCustomerDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId, deletedAt: null };

    if (opts?.search) {
      where.OR = [
        { fullName: { contains: opts.search } },
        { phone: { contains: opts.search } },
        { email: { contains: opts.search } },
      ];
    }
    if (opts?.status) where.status = opts.status;
    if (opts?.interestLevel) where.interestLevel = opts.interestLevel;
    if (opts?.source) where.source = opts.source;
    if (opts?.group) where.group = opts.group;
    if (opts?.assignedUserId) where.assignedUserId = opts.assignedUserId;

    // Sorting
    const allowedSortFields = [
      'fullName',
      'phone',
      'status',
      'interestLevel',
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
      this.prisma.customer.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take,
        include: this.defaultInclude(),
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: this.defaultInclude(),
    });

    if (!customer) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    return customer;
  }

  async update(id: string, workspaceId: string, dto: UpdateCustomerDto) {
    const existed = await this.prisma.customer.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    // If phone is changing, check uniqueness
    if (dto.phone && dto.phone !== existed.phone) {
      const duplicate = await this.prisma.customer.findFirst({
        where: { workspaceId, phone: dto.phone, deletedAt: null, NOT: { id } },
      });
      if (duplicate) {
        throw new BadRequestException('Số điện thoại đã tồn tại trong workspace');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title || null;
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.gender !== undefined) data.gender = dto.gender || null;
    if (dto.dateOfBirth !== undefined)
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.provinceCode !== undefined) data.provinceCode = dto.provinceCode || null;
    if (dto.provinceName !== undefined) data.provinceName = dto.provinceName || null;
    if (dto.districtCode !== undefined) data.districtCode = dto.districtCode || null;
    if (dto.districtName !== undefined) data.districtName = dto.districtName || null;
    if (dto.wardCode !== undefined) data.wardCode = dto.wardCode || null;
    if (dto.wardName !== undefined) data.wardName = dto.wardName || null;
    if (dto.source !== undefined) data.source = dto.source || null;
    if (dto.group !== undefined) data.group = dto.group || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.interestLevel !== undefined) data.interestLevel = dto.interestLevel || null;
    if (dto.assignedUserId !== undefined) data.assignedUserId = dto.assignedUserId || null;
    if (dto.assignees !== undefined)
      data.assignees = dto.assignees ? JSON.parse(JSON.stringify(dto.assignees)) : null;
    if (dto.observers !== undefined)
      data.observers = dto.observers ? JSON.parse(JSON.stringify(dto.observers)) : null;
    if (dto.tags !== undefined) data.tags = dto.tags ? JSON.parse(JSON.stringify(dto.tags)) : null;
    if (dto.note !== undefined) data.note = dto.note || null;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl || null;

    return this.prisma.customer.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async delete(id: string, workspaceId: string) {
    const existed = await this.prisma.customer.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    // Soft delete
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignUser(id: string, workspaceId: string, assignedUserId: string | null) {
    const existed = await this.prisma.customer.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existed) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    // Validate assignedUserId is active workspace member
    if (assignedUserId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: assignedUserId, status: 1 },
      });
      if (!member) {
        throw new BadRequestException('Nhân viên không tồn tại trong workspace');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: { assignedUserId },
      include: this.defaultInclude(),
    });
  }

  async getStatistics(workspaceId: string) {
    const [total, byStatus, byInterestLevel, bySource] = await Promise.all([
      this.prisma.customer.count({ where: { workspaceId, deletedAt: null } }),
      this.prisma.customer.groupBy({
        by: ['status'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.customer.groupBy({
        by: ['interestLevel'],
        where: { workspaceId, deletedAt: null, interestLevel: { not: null } },
        _count: { id: true },
      }),
      this.prisma.customer.groupBy({
        by: ['source'],
        where: { workspaceId, deletedAt: null, source: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byInterestLevel: byInterestLevel.map((s) => ({
        interestLevel: s.interestLevel,
        count: s._count.id,
      })),
      bySource: bySource.map((s) => ({ source: s.source, count: s._count.id })),
    };
  }

  async uploadCustomerAvatar(workspaceId: string, customerId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        { code: 'FILE_REQUIRED', message: 'Avatar file is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new HttpException(
        { code: 'INVALID_FILE_TYPE', message: 'Only image files are allowed' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Maximum file size is 5MB' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, workspaceId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    const uploaded = await this.minioService.uploadAvatar(workspaceId, customerId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    } as Parameters<typeof this.minioService.uploadAvatar>[2]);

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { avatarUrl: uploaded.fileUrl },
      select: { id: true, avatarUrl: true },
    });

    return { data: { avatarUrl: updated.avatarUrl, objectKey: uploaded.objectKey } };
  }

  private defaultInclude() {
    return {
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

  // ===================== COMMENTS =====================

  async listComments(workspaceId: string, customerId: string) {
    await this.findById(customerId, workspaceId);
    const rows = await this.prisma.customerComment.findMany({
      where: { customerId, workspaceId, deletedAt: null, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
          },
        },
      },
    });
    return { data: rows };
  }

  async createComment(
    workspaceId: string,
    customerId: string,
    authorId: string,
    dto: CreateCommentDto,
  ) {
    await this.findById(customerId, workspaceId);
    if (dto.parentId) {
      const parent = await this.prisma.customerComment.findFirst({
        where: { id: dto.parentId, customerId, workspaceId, deletedAt: null },
      });
      if (!parent) throw new NotFoundException('Bình luận gốc không tồn tại');
    }
    const comment = await this.prisma.customerComment.create({
      data: {
        workspaceId,
        customerId,
        authorId,
        parentId: dto.parentId || null,
        content: dto.content,
        mentions: dto.mentions ? JSON.parse(JSON.stringify(dto.mentions)) : undefined,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
        replies: true,
      },
    });
    return { data: comment };
  }

  async updateComment(
    workspaceId: string,
    customerId: string,
    commentId: string,
    authorId: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.customerComment.findFirst({
      where: { id: commentId, customerId, workspaceId, authorId, deletedAt: null },
    });
    if (!comment)
      throw new NotFoundException('Bình luận không tồn tại hoặc bạn không có quyền sửa');
    const updated = await this.prisma.customerComment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
        mentions: dto.mentions ? JSON.parse(JSON.stringify(dto.mentions)) : undefined,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
        replies: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
          },
        },
      },
    });
    return { data: updated };
  }

  async deleteComment(
    workspaceId: string,
    customerId: string,
    commentId: string,
    authorId: string,
  ) {
    const comment = await this.prisma.customerComment.findFirst({
      where: { id: commentId, customerId, workspaceId, authorId, deletedAt: null },
    });
    if (!comment)
      throw new NotFoundException('Bình luận không tồn tại hoặc bạn không có quyền xóa');
    await this.prisma.customerComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { data: { success: true } };
  }

  // ===================== CUSTOMER INFOS =====================

  async listInfos(workspaceId: string, customerId: string) {
    await this.findById(customerId, workspaceId);
    const rows = await this.prisma.customerInfo.findMany({
      where: { customerId, workspaceId },
      orderBy: { order: 'asc' },
    });
    return { data: rows };
  }

  async createInfo(workspaceId: string, customerId: string, dto: CreateCustomerInfoDto) {
    await this.findById(customerId, workspaceId);
    const maxRow = await this.prisma.customerInfo.findFirst({
      where: { customerId, workspaceId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (maxRow?.order ?? -1) + 1;
    const info = await this.prisma.customerInfo.create({
      data: {
        workspaceId,
        customerId,
        category: dto.category || null,
        info: dto.info || null,
        description: dto.description || null,
        order: dto.order ?? nextOrder,
      },
    });
    return { data: info };
  }

  async updateInfo(
    workspaceId: string,
    customerId: string,
    infoId: string,
    dto: UpdateCustomerInfoDto,
  ) {
    const info = await this.prisma.customerInfo.findFirst({
      where: { id: infoId, customerId, workspaceId },
    });
    if (!info) throw new NotFoundException('Thông tin không tồn tại');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (dto.category !== undefined) data.category = dto.category || null;
    if (dto.info !== undefined) data.info = dto.info || null;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.order !== undefined) data.order = dto.order;
    const updated = await this.prisma.customerInfo.update({ where: { id: infoId }, data });
    return { data: updated };
  }

  async deleteInfo(workspaceId: string, customerId: string, infoId: string) {
    const info = await this.prisma.customerInfo.findFirst({
      where: { id: infoId, customerId, workspaceId },
    });
    if (!info) throw new NotFoundException('Thông tin không tồn tại');
    await this.prisma.customerInfo.delete({ where: { id: infoId } });
    return { data: { success: true } };
  }

  async reorderInfos(workspaceId: string, customerId: string, dto: ReorderCustomerInfoDto) {
    await this.findById(customerId, workspaceId);
    await Promise.all(
      dto.ids.map((id, index) =>
        this.prisma.customerInfo.updateMany({
          where: { id, customerId, workspaceId },
          data: { order: index },
        }),
      ),
    );
    return this.listInfos(workspaceId, customerId);
  }

  // ===================== CARE HISTORIES =====================

  async listCareHistories(workspaceId: string, customerId: string) {
    await this.findById(customerId, workspaceId);
    const rows = await this.prisma.customerCareHistory.findMany({
      where: { customerId, workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    // Batch-resolve observer user info from JSON arrays
    const allObserverIds = [
      ...new Set(
        rows.flatMap((r) => {
          const obs = r.observers as string[] | null;
          return Array.isArray(obs) ? obs : [];
        }),
      ),
    ];

    const observerMap = new Map<
      string,
      { id: string; fullName: string | null; avatarUrl: string | null }
    >();
    if (allObserverIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: allObserverIds } },
        select: { id: true, fullName: true, avatarUrl: true },
      });
      users.forEach((u) => observerMap.set(u.id, u));
    }

    const data = rows.map((r) => {
      const observerIds = Array.isArray(r.observers) ? (r.observers as string[]) : [];
      return {
        ...r,
        observerUsers: observerIds.map(
          (id) => observerMap.get(id) || { id, fullName: null, avatarUrl: null },
        ),
      };
    });

    return { data };
  }

  async createCareHistory(
    workspaceId: string,
    customerId: string,
    userId: string,
    dto: CreateCareHistoryDto,
  ) {
    await this.findById(customerId, workspaceId);
    const row = await this.prisma.customerCareHistory.create({
      data: {
        workspaceId,
        customerId,
        createdByUserId: userId,
        content: dto.content,
        taskType: dto.taskType || null,
        taskId: dto.taskId || null,
        resultDescription: dto.resultDescription || null,
        assignedToUserId: dto.assignedToUserId || null,
        observers: dto.observers ?? [],
      },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    return { data: row };
  }

  async updateCareHistory(
    workspaceId: string,
    customerId: string,
    historyId: string,
    userId: string,
    userRole: string,
    dto: UpdateCareHistoryDto,
  ) {
    const row = await this.prisma.customerCareHistory.findFirst({
      where: { id: historyId, customerId, workspaceId },
    });
    if (!row) throw new NotFoundException('Lịch sử chăm sóc không tồn tại');

    const isCreator = row.createdByUserId === userId;
    const isAssignee = row.assignedToUserId === userId;
    const observerIds = Array.isArray(row.observers) ? (row.observers as string[]) : [];
    const isObserver = observerIds.includes(userId);
    const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

    // Full edit (content, taskType, assignee, observers): creator or OWNER/ADMIN only
    const hasFullFields =
      dto.content !== undefined ||
      dto.taskType !== undefined ||
      dto.taskId !== undefined ||
      dto.assignedToUserId !== undefined ||
      dto.observers !== undefined;
    if (hasFullFields && !isCreator && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền sửa lịch sử chăm sóc này');
    }

    // resultDescription: creator, assignee, observer, or OWNER/ADMIN
    if (
      dto.resultDescription !== undefined &&
      !isCreator &&
      !isAssignee &&
      !isObserver &&
      !isAdmin
    ) {
      throw new ForbiddenException('Bạn không có quyền cập nhật kết quả');
    }

    if (!hasFullFields && dto.resultDescription === undefined) {
      throw new ForbiddenException('Không có trường nào để cập nhật');
    }

    const updated = await this.prisma.customerCareHistory.update({
      where: { id: historyId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.taskType !== undefined && { taskType: dto.taskType || null }),
        ...(dto.taskId !== undefined && { taskId: dto.taskId || null }),
        ...(dto.resultDescription !== undefined && {
          resultDescription: dto.resultDescription || null,
        }),
        ...(dto.assignedToUserId !== undefined && {
          assignedToUserId: dto.assignedToUserId || null,
        }),
        ...(dto.observers !== undefined && { observers: dto.observers }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    return { data: updated };
  }

  async deleteCareHistory(
    workspaceId: string,
    customerId: string,
    historyId: string,
    userId: string,
    userRole: string,
  ) {
    const row = await this.prisma.customerCareHistory.findFirst({
      where: { id: historyId, customerId, workspaceId },
    });
    if (!row) throw new NotFoundException('Lịch sử chăm sóc không tồn tại');

    // Check permission: creator or OWNER/ADMIN
    const canDelete =
      row.createdByUserId === userId || userRole === 'OWNER' || userRole === 'ADMIN';
    if (!canDelete) throw new ForbiddenException('Bạn không có quyền xóa lịch sử chăm sóc này');

    await this.prisma.customerCareHistory.delete({ where: { id: historyId } });
    return { data: { success: true } };
  }
}
