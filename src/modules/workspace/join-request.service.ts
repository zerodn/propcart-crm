import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';

@Injectable()
export class JoinRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  // ─── Search public workspaces ───────────────────────────────────────────────

  async searchPublicWorkspaces(q: string) {
    const term = q?.trim();
    if (!term) return { data: [] };

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        isPublic: true,
        status: 1,
        OR: [
          { name: { contains: term } },
          { code: { contains: term } },
          { address: { contains: term } },
        ],
      },
      select: {
        id: true,
        type: true,
        name: true,
        code: true,
        address: true,
        logoUrl: true,
      },
      take: 20,
    });

    return { data: workspaces };
  }

  // ─── Create join request ────────────────────────────────────────────────────

  async createJoinRequest(userId: string, workspaceId: string, dto: CreateJoinRequestDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, isPublic: true, status: true },
    });

    if (!workspace || workspace.status !== 1) {
      throw new HttpException(
        { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!workspace.isPublic) {
      throw new HttpException(
        {
          code: 'WORKSPACE_NOT_PUBLIC',
          message: 'Workspace này không cho phép tham gia công khai',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check already a member
    const alreadyMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 1 },
    });
    if (alreadyMember) {
      throw new HttpException(
        { code: 'ALREADY_MEMBER', message: 'Bạn đã là thành viên của workspace này' },
        HttpStatus.CONFLICT,
      );
    }

    // Check existing PENDING request
    const existing = await this.prisma.workspaceJoinRequest.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (existing) {
      if (existing.status === 'PENDING') {
        throw new HttpException(
          { code: 'REQUEST_ALREADY_PENDING', message: 'Bạn đã có yêu cầu đang chờ duyệt' },
          HttpStatus.CONFLICT,
        );
      }
      // Re-open if previously rejected/cancelled — update existing
      const updated = await this.prisma.workspaceJoinRequest.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          message: dto.message ?? null,
          requestedRole: dto.requestedRole ?? null,
          provinceCode: dto.provinceCode ?? null,
          provinceName: dto.provinceName ?? null,
          wardCode: dto.wardCode ?? null,
          wardName: dto.wardName ?? null,
          addressLine: dto.addressLine ?? null,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
      return { data: updated };
    }

    const request = await this.prisma.workspaceJoinRequest.create({
      data: {
        workspaceId,
        userId,
        message: dto.message ?? null,
        requestedRole: dto.requestedRole ?? null,
        provinceCode: dto.provinceCode ?? null,
        provinceName: dto.provinceName ?? null,
        wardCode: dto.wardCode ?? null,
        wardName: dto.wardName ?? null,
        addressLine: dto.addressLine ?? null,
      },
    });

    return { data: request };
  }

  // ─── Upload document to join request ────────────────────────────────────────

  async uploadJoinRequestDocument(userId: string, requestId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        { code: 'FILE_REQUIRED', message: 'File is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new HttpException(
        { code: 'INVALID_FILE_TYPE', message: 'Chỉ hỗ trợ PDF, DOC, DOCX, JPG, PNG' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'File tối đa 20MB' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const request = await this.prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, workspaceId: true, status: true },
    });

    if (!request) {
      throw new HttpException(
        { code: 'REQUEST_NOT_FOUND', message: 'Yêu cầu không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.userId !== userId) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: 'Không có quyền' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(
        {
          code: 'REQUEST_NOT_PENDING',
          message: 'Chỉ có thể tải tài liệu lên yêu cầu đang chờ duyệt',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploaded = await this.minio.uploadJoinRequestDocument(request.workspaceId, userId, file);

    const doc = await this.prisma.workspaceJoinRequestDocument.create({
      data: {
        requestId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        objectKey: uploaded.objectKey,
        fileUrl: uploaded.fileUrl,
      },
    });

    return { data: doc };
  }

  // ─── Get user's own join requests ───────────────────────────────────────────

  async getUserJoinRequests(userId: string) {
    const requests = await this.prisma.workspaceJoinRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        workspace: {
          select: { id: true, name: true, code: true, logoUrl: true, type: true, requireKyc: true },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return { data: requests };
  }

  // ─── Cancel join request ────────────────────────────────────────────────────

  async cancelJoinRequest(userId: string, requestId: string) {
    const request = await this.prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.userId !== userId) {
      throw new HttpException(
        { code: 'REQUEST_NOT_FOUND', message: 'Yêu cầu không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(
        { code: 'REQUEST_NOT_PENDING', message: 'Chỉ có thể huỷ yêu cầu đang chờ duyệt' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return { data: { success: true } };
  }

  // ─── Admin: list requests for workspace ─────────────────────────────────────

  async getWorkspaceJoinRequests(workspaceId: string, adminUserId: string, status?: string) {
    await this.assertIsAdminOrOwner(workspaceId, adminUserId);

    const where: Record<string, unknown> = { workspaceId };
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    // For APPROVED tab: only show requests approved in the last 24 hours
    if (status === 'APPROVED') {
      where.reviewedAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    const requests = await this.prisma.workspaceJoinRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true, email: true },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        reviewer: {
          select: { id: true, fullName: true },
        },
        rejectionHistory: {
          select: {
            id: true,
            reason: true,
            rejectedBy: true,
            rejectedAt: true,
            reviewer: { select: { id: true, fullName: true } },
          },
          orderBy: { rejectedAt: 'desc' },
        },
      },
    });

    return { data: requests };
  }

  // ─── Admin: get approval history for a specific member ──────────────────────

  async getMemberJoinRequestHistory(
    workspaceId: string,
    adminUserId: string,
    targetUserId: string,
  ) {
    await this.assertIsAdminOrOwner(workspaceId, adminUserId);

    const requests = await this.prisma.workspaceJoinRequest.findMany({
      where: { workspaceId, userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true, email: true },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        reviewer: {
          select: { id: true, fullName: true },
        },
        rejectionHistory: {
          select: {
            id: true,
            reason: true,
            rejectedBy: true,
            rejectedAt: true,
            reviewer: { select: { id: true, fullName: true } },
          },
          orderBy: { rejectedAt: 'desc' },
        },
      },
    });

    return { data: requests };
  }

  // ─── Admin: approve request ──────────────────────────────────────────────────

  async approveJoinRequest(
    workspaceId: string,
    requestId: string,
    adminUserId: string,
    role?: string,
  ) {
    await this.assertIsAdminOrOwner(workspaceId, adminUserId);

    const request = await this.prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.workspaceId !== workspaceId) {
      throw new HttpException(
        { code: 'REQUEST_NOT_FOUND', message: 'Yêu cầu không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(
        { code: 'REQUEST_NOT_PENDING', message: 'Yêu cầu không ở trạng thái chờ duyệt' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Resolve role
    const roleCode = role ?? request.requestedRole ?? 'SALES';
    const rolePrisma = await this.prisma.role.findUnique({
      where: { code: roleCode },
    });

    if (!rolePrisma) {
      throw new HttpException(
        { code: 'ROLE_NOT_FOUND', message: 'Vai trò không hợp lệ' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check already member (might have been added by invitation concurrently)
    const alreadyMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.userId },
    });

    if (!alreadyMember) {
      await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: request.userId,
          roleId: rolePrisma.id,
          status: 1,
        },
      });
    }

    await this.prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    return { data: { success: true } };
  }

  // ─── Admin: reject request ───────────────────────────────────────────────────

  async rejectJoinRequest(
    workspaceId: string,
    requestId: string,
    adminUserId: string,
    reason?: string,
  ) {
    await this.assertIsAdminOrOwner(workspaceId, adminUserId);

    const request = await this.prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.workspaceId !== workspaceId) {
      throw new HttpException(
        { code: 'REQUEST_NOT_FOUND', message: 'Yêu cầu không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(
        { code: 'REQUEST_NOT_PENDING', message: 'Yêu cầu không ở trạng thái chờ duyệt' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason ?? null,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    // Save history entry so previous rejections are not lost on re-submission
    await this.prisma.workspaceJoinRequestRejectionHistory.create({
      data: {
        requestId,
        reason: reason ?? null,
        rejectedBy: adminUserId,
      },
    });

    return { data: { success: true } };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async assertIsAdminOrOwner(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerUserId: true },
    });

    if (!workspace) {
      throw new HttpException(
        { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (workspace.ownerUserId === userId) return;

    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 1 },
      include: { role: { select: { code: true } } },
    });

    const adminRoles = ['OWNER', 'ADMIN', 'MANAGER'];
    if (!member || !adminRoles.includes(member.role?.code ?? '')) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: 'Không có quyền thực hiện thao tác này' },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
