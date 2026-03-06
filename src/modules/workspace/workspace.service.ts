import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async findWorkspacesByUserId(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { userId, status: 1 },
      include: { workspace: true, role: true },
    });
  }

  async findMembership(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 1 },
      include: { role: true },
    });
  }

  async listWorkspaceMembers(workspaceId: string, search?: string) {
    const where: any = {
      workspaceId,
      status: 1, // only active members
    };

    // If search is provided, search in phone or email
    if (search && search.trim()) {
      where.user = {
        OR: [
          { phone: { contains: search.trim() } },
          { email: { contains: search.trim() } },
          { fullName: { contains: search.trim() } },
        ],
      };
    }

    const members = await this.prisma.workspaceMember.findMany({
      where,
      include: {
        user: { select: { id: true, phone: true, email: true, fullName: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const data = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      roleId: m.roleId,
      status: m.status,
      joinedAt: m.joinedAt,
      displayName: m.displayName,
      workspaceEmail: m.workspaceEmail,
      workspacePhone: m.workspacePhone,
      avatarUrl: m.avatarUrl,
      user: m.user,
      role: m.role,
    }));

    return { data };
  }

  async updateMember(
    workspaceId: string,
    memberId: string,
    dto: any,
  ) {
    // Check if member exists in this workspace
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new Error('Member not found in this workspace');
    }

    // If updating role, verify role exists
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new Error('Role not found');
      }
    }

    // Update member
    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        ...(dto.roleId && { roleId: dto.roleId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.workspaceEmail !== undefined && { workspaceEmail: dto.workspaceEmail }),
        ...(dto.workspacePhone !== undefined && { workspacePhone: dto.workspacePhone }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }),
        ...(dto.workspaceCity !== undefined && { workspaceCity: dto.workspaceCity }),
        ...(dto.workspaceAddress !== undefined && { workspaceAddress: dto.workspaceAddress }),
        ...(dto.attachmentUrl !== undefined && { attachmentUrl: dto.attachmentUrl }),
      },
      include: {
        user: { select: { id: true, phone: true, email: true, fullName: true } },
        role: { select: { id: true, code: true, name: true } },
      },
    });

    return {
      data: {
        id: updated.id,
        userId: updated.userId,
        workspaceId: updated.workspaceId,
        roleId: updated.roleId,
        status: updated.status,
        joinedAt: updated.joinedAt,
        displayName: updated.displayName,
        workspaceEmail: updated.workspaceEmail,
        workspacePhone: updated.workspacePhone,
        avatarUrl: updated.avatarUrl,
        gender: updated.gender,
        dateOfBirth: updated.dateOfBirth,
        workspaceCity: updated.workspaceCity,
        workspaceAddress: updated.workspaceAddress,
        attachmentUrl: updated.attachmentUrl,
        user: updated.user,
        role: updated.role,
      },
    };
  }

  async uploadMemberAvatar(workspaceId: string, memberId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        { code: 'FILE_REQUIRED', message: 'Avatar file is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new HttpException(
        { code: 'INVALID_FILE_TYPE', message: 'Only image files are allowed' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Maximum file size is 5MB' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if member exists
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new HttpException(
        { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this workspace' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Upload to MinIO using workspace-scoped avatar path
    const uploaded = await this.minioService.uploadAvatar(workspaceId, member.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    } as any);

    // Update member with new avatar URL
    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { avatarUrl: uploaded.fileUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return {
      data: {
        avatarUrl: updated.avatarUrl,
        objectKey: uploaded.objectKey,
      },
    };
  }
}
