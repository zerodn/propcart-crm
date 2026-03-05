import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserDevice } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
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

  async createUser(data: {
    phone?: string;
    email?: string;
    googleId?: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async upsertDevice(
    userId: string,
    deviceHash: string,
    platform?: string,
  ): Promise<UserDevice> {
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
      },
    });

    return { data: updatedUser };
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
}
