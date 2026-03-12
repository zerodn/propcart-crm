import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserDevice } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MinioService } from '../../common/storage/minio.service';
import { DocumentTypeValue } from './constants/document-type.constants';

interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly minioService: MinioService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async createUser(data: { phone?: string; email?: string; googleId?: string }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async upsertDevice(userId: string, deviceHash: string, platform?: string): Promise<UserDevice> {
    return this.prisma.userDevice.upsert({
      where: { userId_deviceHash: { userId, deviceHash } },
      create: { userId, deviceHash, platform, lastActive: new Date() },
      update: { lastActive: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        addressLine: true,
        provinceCode: true,
        provinceName: true,
        districtCode: true,
        districtName: true,
        wardCode: true,
        wardName: true,
        emailVerifiedAt: true,
        avatarUrl: true,
        gender: true,
        dateOfBirth: true,
      },
    });

    if (!user) {
      throw new HttpException(
        { code: 'USER_NOT_FOUND', message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return { data: user };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!currentUser) {
      throw new HttpException(
        { code: 'USER_NOT_FOUND', message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    const normalizedEmail = dto.email?.trim().toLowerCase() || null;
    if (normalizedEmail) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: userId },
        },
        select: { id: true },
      });

      if (existing) {
        throw new HttpException(
          { code: 'EMAIL_ALREADY_EXISTS', message: 'Email already in use' },
          HttpStatus.CONFLICT,
        );
      }
    }

    const emailChanged = normalizedEmail !== (currentUser.email || null);

    // Validate and parse dateOfBirth
    let parsedDateOfBirth: Date | null = null;
    if (dto.dateOfBirth && dto.dateOfBirth.trim()) {
      const dateValue = new Date(dto.dateOfBirth);
      if (!isNaN(dateValue.getTime())) {
        parsedDateOfBirth = dateValue;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName?.trim() || null,
        addressLine: dto.addressLine?.trim() || null,
        email: normalizedEmail,
        provinceCode: dto.provinceCode || null,
        provinceName: dto.provinceName || null,
        districtCode: dto.districtCode || null,
        districtName: dto.districtName || null,
        wardCode: dto.wardCode || null,
        wardName: dto.wardName || null,
        avatarUrl: dto.avatarUrl || null,
        gender: dto.gender || null,
        dateOfBirth: parsedDateOfBirth,
        ...(emailChanged
          ? {
              emailVerifiedAt: null,
              emailVerifyToken: null,
              emailVerifyExpiresAt: null,
            }
          : {}),
      },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        addressLine: true,
        provinceCode: true,
        provinceName: true,
        districtCode: true,
        districtName: true,
        wardCode: true,
        wardName: true,
        emailVerifiedAt: true,
        avatarUrl: true,
        gender: true,
        dateOfBirth: true,
      },
    });

    return { data: updatedUser };
  }

  async uploadProfileAvatar(userId: string, workspaceId: string, file: UploadedDocumentFile) {
    if (!file) {
      throw new HttpException(
        { code: 'FILE_REQUIRED', message: 'Avatar file is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file type (jpg, png only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new HttpException(
        { code: 'INVALID_FILE_TYPE', message: 'Only JPG and PNG images are allowed' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Avatar size cannot exceed 5MB' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get current user to retrieve old avatar URL
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    // Upload new avatar to MinIO
    const uploadResult = await this.minioService.uploadAvatar(workspaceId, userId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });

    // Delete old avatar from MinIO (if exists)
    if (currentUser?.avatarUrl) {
      const oldObjectKey = this.minioService.extractObjectKeyFromUrl(currentUser.avatarUrl);
      if (oldObjectKey) {
        await this.minioService.deleteObject(oldObjectKey);
      }
    }

    return {
      data: {
        downloadUrl: uploadResult.fileUrl,
        objectKey: uploadResult.objectKey,
      },
    };
  }

  async sendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, fullName: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new HttpException(
        { code: 'USER_NOT_FOUND', message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.email) {
      throw new HttpException(
        { code: 'EMAIL_REQUIRED', message: 'Please update email before verification' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user.emailVerifiedAt) {
      return { data: { message: 'Email already verified' } };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: token,
        emailVerifyExpiresAt: expiresAt,
      },
    });

    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3001';
    const verifyUrl = `${webAppUrl}/email-verify?token=${token}`;

    const sent = await this.mailService.sendEmailVerificationEmail(
      user.email,
      user.fullName || user.phone || 'Bạn',
      verifyUrl,
    );

    if (!sent) {
      throw new HttpException(
        { code: 'EMAIL_SEND_FAILED', message: 'Cannot send verification email right now' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { data: { message: 'Verification email sent', expiresInSeconds: 900 } };
  }

  async verifyEmailToken(token: string) {
    if (!token) {
      throw new HttpException(
        { code: 'TOKEN_REQUIRED', message: 'Verification token is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new HttpException(
        { code: 'TOKEN_INVALID', message: 'Verification link is invalid or expired' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
      },
    });

    return { data: { message: 'Email verified successfully' } };
  }

  async listDocuments(userId: string, workspaceId: string, documentType?: DocumentTypeValue) {
    const documents = await this.prisma.userDocument.findMany({
      where: {
        userId,
        workspaceId,
        ...(documentType ? { documentType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return {
      data: documents.map((document) => ({
        ...document,
        downloadUrl: `/me/profile/documents/${document.id}/download`,
      })),
    };
  }

  async uploadDocument(
    userId: string,
    workspaceId: string,
    documentType: DocumentTypeValue,
    file?: UploadedDocumentFile,
  ) {
    if (!file) {
      throw new HttpException(
        { code: 'FILE_REQUIRED', message: 'Document file is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Max file size is 20MB' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        { code: 'FILE_TYPE_INVALID', message: 'Only PDF, DOC, DOCX, PNG, JPG are supported' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploaded = await this.minioService.uploadUserDocument(userId, file, workspaceId);

    const document = await this.prisma.userDocument.create({
      data: {
        userId,
        workspaceId: workspaceId || null,
        documentType,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        objectKey: uploaded.objectKey,
        fileUrl: uploaded.fileUrl,
      },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return {
      data: {
        ...document,
        downloadUrl: `/me/profile/documents/${document.id}/download`,
      },
    };
  }

  async getDocumentDownload(userId: string, workspaceId: string, documentId: string) {
    const document = await this.prisma.userDocument.findFirst({
      where: { id: documentId, userId, workspaceId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        objectKey: true,
      },
    });

    if (!document) {
      throw new HttpException(
        { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    const object = await this.minioService.getObject(document.objectKey);
    return {
      stream: object.stream,
      size: object.size,
      fileName: document.fileName,
      fileType: document.fileType,
    };
  }

  async deleteDocument(userId: string, workspaceId: string, documentId: string) {
    const document = await this.prisma.userDocument.findFirst({
      where: { id: documentId, userId, workspaceId },
      select: { id: true, objectKey: true },
    });

    if (!document) {
      throw new HttpException(
        { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.userDocument.delete({ where: { id: document.id } });
    await this.minioService.deleteObject(document.objectKey);

    return { data: { message: 'Document deleted' } };
  }

  async updateDocumentType(
    userId: string,
    workspaceId: string,
    documentId: string,
    documentType: DocumentTypeValue,
  ) {
    const document = await this.prisma.userDocument.findFirst({
      where: { id: documentId, userId, workspaceId },
      select: { id: true },
    });

    if (!document) {
      throw new HttpException(
        { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.userDocument.update({
      where: { id: document.id },
      data: { documentType },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return {
      data: {
        ...updated,
        downloadUrl: `/me/profile/documents/${updated.id}/download`,
      },
    };
  }
}
