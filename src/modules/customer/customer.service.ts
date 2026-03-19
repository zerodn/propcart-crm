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
import { CreateCustomerDto, ListCustomerDto, UpdateCustomerDto } from './dto/index';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateCustomerDto) {
    // Check phone uniqueness within workspace
    const existing = await this.prisma.customer.findFirst({
      where: { workspaceId, phone: dto.phone, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException('Số điện thoại đã tồn tại trong workspace');
    }

    return this.prisma.customer.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        fullName: dto.fullName,
        phone: dto.phone,
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

    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
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
}
