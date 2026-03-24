import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';
import { LinkPhoneForGoogleDto } from './dto/link-phone-for-google.dto';
import { VerifyEmailLinkGoogleDto } from './dto/verify-email-link-google.dto';
import { EmailVerifySendOtpDto } from './dto/email-verify-send-otp.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import type { User, Workspace } from '@prisma/client';

interface OtpRecord {
  code: string;
  attempts: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ============================================================
  // SEND OTP
  // ============================================================

  async sendOtp(dto: SendOtpDto) {
    const { phone } = dto;

    // Check if user is banned or disabled
    const user = await this.userService.findByPhone(phone);
    if (user && user.status === 2) {
      throw new HttpException(
        { code: 'USER_BANNED', message: 'Tài khoản đã bị tạm khóa' },
        HttpStatus.FORBIDDEN,
      );
    }
    if (user && user.status === 0) {
      throw new HttpException(
        { code: 'USER_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa' },
        HttpStatus.FORBIDDEN,
      );
    }

    const isDev = this.configService.get<string>('nodeEnv') !== 'production';
    const otpCode = isDev ? '999999' : Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${phone}`;
    const record: OtpRecord = { code: otpCode, attempts: 0 };

    // Store in Redis with 120-second TTL (ms)
    await this.cacheManager.set(otpKey, JSON.stringify(record), 120000);

    if (isDev) {
      console.log(`[DEV] OTP for ${phone}: ${otpCode}`);
    } else {
      // TODO: Integrate SMS provider (ESMS, Twilio, etc.)
      console.log(`[SMS stub] Sending OTP ${otpCode} to ${phone}`);
    }

    return { data: { message: 'OTP sent', expires_in: 120 } };
  }

  // ============================================================
  // VERIFY OTP
  // ============================================================

  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, otp, device_hash, platform } = dto;
    const otpKey = `otp:${phone}`;

    // Retrieve OTP from Redis
    const raw = await this.cacheManager.get<string>(otpKey);
    if (!raw) {
      throw new HttpException(
        { code: 'OTP_INVALID', message: 'OTP not found or already used' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const record: OtpRecord = JSON.parse(raw);

    if (record.code !== otp) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        await this.cacheManager.del(otpKey);
        throw new HttpException(
          { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.cacheManager.set(otpKey, JSON.stringify(record), 120000);
      throw new HttpException(
        { code: 'OTP_INVALID', message: 'Invalid OTP' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // OTP correct — delete from Redis
    await this.cacheManager.del(otpKey);

    // Find or create user
    let user = await this.userService.findByPhone(phone);
    let isNewUser = false;

    if (!user) {
      user = await this.userService.createUser({ phone });
      isNewUser = true;
    } else {
      // Block login for disabled or banned accounts
      if (user.status === 2) {
        throw new HttpException(
          { code: 'USER_BANNED', message: 'Tài khoản đã bị tạm khóa' },
          HttpStatus.FORBIDDEN,
        );
      }
      if (user.status === 0) {
        throw new HttpException(
          { code: 'USER_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa' },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Create personal workspace for new users
    let workspace;
    if (isNewUser) {
      workspace = await this.createPersonalWorkspace(user.id, phone);
    } else {
      workspace = await this.prisma.workspace.findFirst({
        where: { ownerUserId: user.id, type: 'PERSONAL' },
      });
    }

    // Upsert device
    const device = await this.userService.upsertDevice(user.id, device_hash, platform);

    // Detect Google orphan account (phone=null) sharing the same verified email
    // If found, propose a merge so both identities resolve to one account.
    let mergeSuggestion:
      | {
          mergeToken: string;
          googleAccount: { fullName: string | null; email: string; avatarUrl: string | null };
        }
      | undefined;

    if (user.email && user.emailVerifiedAt) {
      const googleOrphan = await this.prisma.user.findFirst({
        where: {
          email: user.email,
          phone: null,
          googleId: { not: null },
          id: { not: user.id },
          status: 1,
        },
        select: { id: true, fullName: true, email: true, avatarUrl: true },
      });

      if (googleOrphan) {
        const mergeToken = uuidv4();
        await this.cacheManager.set(
          `merge:${mergeToken}`,
          JSON.stringify({ phoneUserId: user.id, googleUserId: googleOrphan.id }),
          5 * 60 * 1000, // 5 minutes
        );
        mergeSuggestion = {
          mergeToken,
          googleAccount: {
            fullName: googleOrphan.fullName,
            email: googleOrphan.email!,
            avatarUrl: googleOrphan.avatarUrl,
          },
        };
      }
    }

    const tokenResponse = await this.issueTokenResponse(user, workspace, device.id);
    if (mergeSuggestion) {
      (tokenResponse.data as Record<string, unknown>).mergeSuggestion = mergeSuggestion;
    }
    return tokenResponse;
  }

  // ============================================================
  // ACCEPT MERGE
  // ============================================================

  async acceptMerge(phoneUserId: string, mergeToken: string) {
    const raw = await this.cacheManager.get<string>(`merge:${mergeToken}`);
    if (!raw) {
      throw new HttpException(
        { code: 'MERGE_TOKEN_INVALID', message: 'Merge token invalid or expired' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { phoneUserId: storedPhoneId, googleUserId } = JSON.parse(raw) as {
      phoneUserId: string;
      googleUserId: string;
    };

    if (storedPhoneId !== phoneUserId) {
      throw new HttpException(
        { code: 'MERGE_TOKEN_MISMATCH', message: 'Merge token does not match current user' },
        HttpStatus.FORBIDDEN,
      );
    }

    const googleUser = await this.prisma.user.findUnique({ where: { id: googleUserId } });
    if (!googleUser) {
      throw new HttpException(
        { code: 'MERGE_SOURCE_NOT_FOUND', message: 'Google account no longer exists' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Copy Google identity fields onto phone user (only if phone user lacks them)
    const updates: Record<string, unknown> = { googleId: googleUser.googleId };
    const phoneUser = await this.prisma.user.findUnique({ where: { id: phoneUserId } });
    if (!phoneUser?.avatarUrl && googleUser.avatarUrl) updates.avatarUrl = googleUser.avatarUrl;
    if (!phoneUser?.fullName && googleUser.fullName) updates.fullName = googleUser.fullName;

    await this.prisma.$transaction([
      // Merge into phone user
      this.prisma.user.update({ where: { id: phoneUserId }, data: updates }),
      // Disable Google orphan (keep record for audit; nullify google unique key handled below)
      this.prisma.user.update({
        where: { id: googleUserId },
        data: { status: 0, googleId: null, email: null },
      }),
    ]);

    await this.cacheManager.del(`merge:${mergeToken}`);

    // Re-fetch updated phone user for fresh token response
    const updatedUser = await this.prisma.user.findUnique({ where: { id: phoneUserId } });
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: phoneUserId, type: 'PERSONAL' },
    });
    const device = await this.userService.upsertDevice(phoneUserId, '', 'merge');

    return this.issueTokenResponse(updatedUser!, workspace, device.id);
  }

  // ============================================================
  // GOOGLE AUTH
  // ============================================================

  async googleAuth(dto: GoogleAuthDto) {
    const { google_token, device_hash, platform } = dto;

    // Verify access token by calling Google userinfo endpoint
    let googlePayload: { googleId: string; email: string; name: string; picture?: string };
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${google_token}` },
      });
      if (!res.ok) throw new Error(`Google userinfo returned ${res.status}`);
      const info = (await res.json()) as {
        sub: string;
        email: string;
        name: string;
        picture?: string;
      };
      googlePayload = {
        googleId: info.sub,
        email: info.email,
        name: info.name,
        picture: info.picture,
      };
    } catch {
      throw new HttpException(
        { code: 'GOOGLE_TOKEN_INVALID', message: 'Invalid or expired Google token' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Find user by googleId or email
    const userByGoogleId = await this.userService.findByGoogleId(googlePayload.googleId);
    const userByEmail = userByGoogleId
      ? null
      : await this.userService.findByEmail(googlePayload.email);

    // If email matches an unverified account that was not created via Google,
    // offer phone-OTP verification to verify email and link Google in one step.
    if (userByEmail && !userByEmail.emailVerifiedAt) {
      const tempToken = uuidv4();
      await this.cacheManager.set(
        `google:email_verify:${tempToken}`,
        JSON.stringify({ userId: userByEmail.id, googlePayload }),
        10 * 60 * 1000, // 10 minutes
      );
      // Mask phone: show only last 3 digits (e.g. *******521)
      const rawPhone = userByEmail.phone ?? '';
      const digits = rawPhone.replace(/\D/g, '');
      const maskedPhone =
        digits.length >= 3 ? '*'.repeat(Math.max(0, digits.length - 3)) + digits.slice(-3) : '***';
      return {
        code: 'EMAIL_EXISTS_UNVERIFIED',
        email: googlePayload.email,
        maskedPhone,
        temp_token: tempToken,
      };
    }

    let user = userByGoogleId || userByEmail;

    if (!user) {
      // New user — create without requiring a phone number
      user = await this.userService.createUser({
        googleId: googlePayload.googleId,
        email: googlePayload.email,
        fullName: googlePayload.name,
        emailVerifiedAt: new Date(),
        ...(googlePayload.picture ? { avatarUrl: googlePayload.picture } : {}),
      });
    } else {
      // Existing user — link googleId and mark email as verified if not already
      const updates: Record<string, unknown> = {};
      if (!user.googleId) updates.googleId = googlePayload.googleId;
      if (!user.emailVerifiedAt) updates.emailVerifiedAt = new Date();
      // Backfill fullName and avatarUrl only if user hasn't set them yet
      if (!user.fullName && googlePayload.name) updates.fullName = googlePayload.name;
      if (!user.avatarUrl && googlePayload.picture) updates.avatarUrl = googlePayload.picture;
      if (Object.keys(updates).length > 0) {
        await this.prisma.user.update({ where: { id: user.id }, data: updates });
        user = { ...user, ...updates } as typeof user;
      }
    }

    // Block login for disabled or banned accounts
    if (user.status === 2) {
      throw new HttpException(
        { code: 'USER_BANNED', message: 'Tài khoản đã bị tạm khóa' },
        HttpStatus.FORBIDDEN,
      );
    }
    if (user.status === 0) {
      throw new HttpException(
        { code: 'USER_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Ensure the user has a personal workspace
    const existingWorkspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: user.id, type: 'PERSONAL' },
    });
    if (!existingWorkspace) {
      await this.createPersonalWorkspace(user.id, user.fullName || user.email || user.id);
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: user.id, type: 'PERSONAL' },
    });

    // If user has no verified phone, require phone linking before issuing tokens
    if (!user.phone) {
      const tempToken = uuidv4();
      await this.cacheManager.set(
        `google:phone_required:${tempToken}`,
        JSON.stringify({ userId: user.id }),
        10 * 60 * 1000, // 10 minutes
      );
      return { code: 'PHONE_REQUIRED', temp_token: tempToken };
    }

    const device = await this.userService.upsertDevice(user.id, device_hash, platform);
    return this.issueTokenResponse(user, workspace, device.id);
  }

  // ============================================================
  // GOOGLE: LINK PHONE (completes login after PHONE_REQUIRED)
  // ============================================================

  async linkPhoneForGoogleUser(dto: LinkPhoneForGoogleDto) {
    const { temp_token, phone, otp, device_hash, platform } = dto;

    // Validate temp_token
    const tempKey = `google:phone_required:${temp_token}`;
    const tempRaw = await this.cacheManager.get<string>(tempKey);
    if (!tempRaw) {
      throw new HttpException(
        {
          code: 'TEMP_TOKEN_INVALID',
          message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại với Google',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { userId } = JSON.parse(tempRaw) as { userId: string };

    // Verify OTP
    const otpKey = `otp:${phone}`;
    const otpRaw = await this.cacheManager.get<string>(otpKey);
    if (!otpRaw) {
      throw new HttpException(
        { code: 'OTP_EXPIRED', message: 'Mã OTP đã hết hạn' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const otpRecord: OtpRecord = JSON.parse(otpRaw);
    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await this.cacheManager.del(otpKey);
        throw new HttpException(
          { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.cacheManager.set(otpKey, JSON.stringify(otpRecord), 120000);
      throw new HttpException(
        { code: 'OTP_INVALID', message: 'Invalid OTP' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.cacheManager.del(otpKey);

    // Check phone not already used by another account
    const phoneUser = await this.userService.findByPhone(phone);
    if (phoneUser && phoneUser.id !== userId) {
      throw new HttpException(
        { code: 'PHONE_TAKEN', message: 'Số điện thoại đã được sử dụng bởi tài khoản khác' },
        HttpStatus.CONFLICT,
      );
    }

    // Link phone to user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { phone },
    });

    // Clean up temp session
    await this.cacheManager.del(tempKey);

    // Issue tokens
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: userId, type: 'PERSONAL' },
    });
    const device = await this.userService.upsertDevice(userId, device_hash, platform);
    return this.issueTokenResponse(updatedUser, workspace, device.id);
  }

  // ============================================================
  // GOOGLE: EMAIL-VERIFY-SEND-OTP (validates phone, then sends OTP)
  // ============================================================

  async emailVerifySendOtp(dto: EmailVerifySendOtpDto) {
    const { temp_token, phone } = dto;

    // Validate temp_token — return 400 (not 401) so api-client won't redirect
    const tempKey = `google:email_verify:${temp_token}`;
    const tempRaw = await this.cacheManager.get<string>(tempKey);
    if (!tempRaw) {
      throw new HttpException(
        {
          code: 'TEMP_TOKEN_INVALID',
          message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại với Google',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { userId } = JSON.parse(tempRaw) as { userId: string };

    // Fetch user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException(
        { code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Phone must match the account's registered phone
    if (user.phone !== phone) {
      throw new HttpException(
        {
          code: 'PHONE_MISMATCH',
          message: 'Số điện thoại không khớp với tài khoản đăng ký email này',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Send OTP
    const isDev = this.configService.get<string>('nodeEnv') !== 'production';
    const otpCode = isDev ? '999999' : Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${phone}`;
    const record: OtpRecord = { code: otpCode, attempts: 0 };
    await this.cacheManager.set(otpKey, JSON.stringify(record), 120000);

    if (isDev) {
      console.log(`[DEV] OTP for ${phone}: ${otpCode}`);
    } else {
      console.log(`[SMS stub] Sending OTP ${otpCode} to ${phone}`);
    }

    return { data: { message: 'OTP sent', expires_in: 120 } };
  }

  // ============================================================
  // GOOGLE: VERIFY EMAIL + LINK (EMAIL_EXISTS_UNVERIFIED path)
  // ============================================================

  async verifyEmailAndLinkGoogle(dto: VerifyEmailLinkGoogleDto) {
    const { temp_token, phone, otp, device_hash, platform } = dto;

    // Validate temp_token
    const tempKey = `google:email_verify:${temp_token}`;
    const tempRaw = await this.cacheManager.get<string>(tempKey);
    if (!tempRaw) {
      throw new HttpException(
        {
          code: 'TEMP_TOKEN_INVALID',
          message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại với Google',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { userId, googlePayload } = JSON.parse(tempRaw) as {
      userId: string;
      googlePayload: { googleId: string; email: string; name: string; picture?: string };
    };

    // Fetch user to validate phone
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException(
        { code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Verify OTP
    const otpKey = `otp:${phone}`;
    const otpRaw = await this.cacheManager.get<string>(otpKey);
    if (!otpRaw) {
      throw new HttpException(
        { code: 'OTP_EXPIRED', message: 'Mã OTP đã hết hạn' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const otpRecord: OtpRecord = JSON.parse(otpRaw);
    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await this.cacheManager.del(otpKey);
        throw new HttpException(
          { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.cacheManager.set(otpKey, JSON.stringify(otpRecord), 120000);
      throw new HttpException(
        { code: 'OTP_INVALID', message: 'Invalid OTP' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.cacheManager.del(otpKey);

    // Phone must match the account's registered phone
    if (user.phone !== phone) {
      throw new HttpException(
        {
          code: 'PHONE_MISMATCH',
          message: 'Số điện thoại không khớp với tài khoản đăng ký email này',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update user: verify email + link Google
    const updates: Record<string, unknown> = {
      emailVerifiedAt: new Date(),
      googleId: googlePayload.googleId,
    };
    if (!user.fullName && googlePayload.name) updates.fullName = googlePayload.name;
    if (!user.avatarUrl && googlePayload.picture) updates.avatarUrl = googlePayload.picture;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    // Clean up temp session
    await this.cacheManager.del(tempKey);

    // Issue tokens
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: userId, type: 'PERSONAL' },
    });
    const device = await this.userService.upsertDevice(userId, device_hash, platform);
    return this.issueTokenResponse(updatedUser, workspace, device.id);
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================

  async refreshToken(dto: RefreshTokenDto) {
    const { refresh_token, device_hash } = dto;

    // Hash the raw token for lookup (SHA-256 is deterministic)
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new HttpException(
        { code: 'REFRESH_TOKEN_INVALID', message: 'Refresh token not found' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (stored.revoked) {
      throw new HttpException(
        { code: 'REFRESH_TOKEN_REVOKED', message: 'Refresh token has been revoked' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new HttpException(
        { code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token has expired' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Verify device binding
    const device = await this.prisma.userDevice.findFirst({
      where: { userId: stored.userId, deviceHash: device_hash },
    });

    if (!device || device.id !== stored.deviceId) {
      throw new HttpException(
        { code: 'DEVICE_MISMATCH', message: 'Device mismatch' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    // Load user + workspace + role for new JWT
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });

    // Block refresh for disabled or banned accounts
    if (!user || user.status === 2) {
      throw new HttpException(
        { code: 'USER_BANNED', message: 'Tài khoản đã bị tạm khóa' },
        HttpStatus.FORBIDDEN,
      );
    }
    if (user.status === 0) {
      throw new HttpException(
        { code: 'USER_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa' },
        HttpStatus.FORBIDDEN,
      );
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: stored.workspaceId },
    });
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: stored.workspaceId, userId: stored.userId, status: 1 },
      include: { role: true },
    });

    const payload: JwtPayload = {
      sub: user!.id,
      workspaceId: workspace!.id,
      role: membership?.role.code || 'OWNER',
      workspaceType: workspace!.type,
      deviceId: device.id,
    };

    return this.issueTokens(payload, device.id, workspace!.id);
  }

  // ============================================================
  // SWITCH WORKSPACE
  // ============================================================

  async switchWorkspace(dto: SwitchWorkspaceDto, currentUser: JwtPayload) {
    const { workspace_id } = dto;

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspace_id } });
    if (!workspace) {
      throw new HttpException(
        { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace_id, userId: currentUser.sub, status: 1 },
      include: { role: true },
    });

    if (!membership) {
      throw new HttpException(
        { code: 'WORKSPACE_MEMBER_NOT_FOUND', message: 'Not a member of this workspace' },
        HttpStatus.FORBIDDEN,
      );
    }

    const payload: JwtPayload = {
      sub: currentUser.sub,
      workspaceId: workspace.id,
      role: membership.role.code,
      workspaceType: workspace.type,
      deviceId: currentUser.deviceId,
    };

    const { accessToken, refreshToken } = await this.issueTokens(
      payload,
      currentUser.deviceId,
      workspace.id,
    );

    return {
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        workspace: { id: workspace.id, type: workspace.type, name: workspace.name },
        role: membership.role.code,
      },
    };
  }

  // ============================================================
  // GET WORKSPACES
  // ============================================================

  async getWorkspaces(currentUser: JwtPayload) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId: currentUser.sub, status: 1 },
      include: { workspace: true, role: true },
    });

    const data = memberships.map((m) => ({
      id: m.workspace.id,
      type: m.workspace.type,
      name: m.workspace.name,
      code: m.workspace.code,
      address: m.workspace.address,
      logoUrl: m.workspace.logoUrl,
      isPublic: m.workspace.isPublic,
      role: m.role.code,
      is_active: m.workspace.id === currentUser.workspaceId,
    }));

    return { data };
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(accessToken: string, refreshToken: string) {
    // 1. Blacklist the access token in Redis so JwtStrategy rejects it immediately
    //    Decode without verify — we only need jti + exp (already trusted since it's being used)
    const decoded = this.jwtService.decode(accessToken) as { jti?: string; exp?: number } | null;
    if (decoded?.jti && decoded?.exp) {
      const remainingMs = decoded.exp * 1000 - Date.now();
      if (remainingMs > 0) {
        await this.cacheManager.set(`blacklist:${decoded.jti}`, 1, remainingMs);
      }
    }

    // 2. Revoke the refresh token in DB
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revoked: false },
        data: { revoked: true },
      });
    }

    return { data: { message: 'Logged out successfully' } };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async createPersonalWorkspace(userId: string, nameHint: string) {
    const ownerRole = await this.prisma.role.findUnique({ where: { code: 'OWNER' } });

    const workspace = await this.prisma.workspace.create({
      data: {
        type: 'PERSONAL',
        name: `Workspace of ${nameHint}`,
        ownerUserId: userId,
      },
    });

    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        roleId: ownerRole!.id,
        status: 1,
        employeeCode: 'NV001',
      },
    });

    // Initialize default catalogs for the workspace
    await this.initializeWorkspaceCatalogs(workspace.id);

    return workspace;
  }

  private async initializeWorkspaceCatalogs(workspaceId: string) {
    // Create "Vai trò" (Role) parent catalog
    const roleCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'ROLE',
        code: 'ROLE',
        name: 'Vai trò',
        parentId: null,
      },
    });

    // Create role values
    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: roleCatalog.id,
          value: 'ADMIN',
          label: 'Quản trị viên',
          order: 0,
        },
        {
          catalogId: roleCatalog.id,
          value: 'MANAGER',
          label: 'Quản lý',
          order: 1,
        },
        {
          catalogId: roleCatalog.id,
          value: 'SALES',
          label: 'Nhân viên bán hàng',
          order: 2,
        },
        {
          catalogId: roleCatalog.id,
          value: 'PARTNER',
          label: 'Đối tác',
          order: 3,
        },
        {
          catalogId: roleCatalog.id,
          value: 'OWNER',
          label: 'Chủ sở hữu',
          order: 4,
        },
        {
          catalogId: roleCatalog.id,
          value: 'VIEWER',
          label: 'Người xem',
          order: 5,
        },
      ],
    });

    // Create "Loại Kho" (Warehouse Type) catalog
    const warehouseTypeCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'WAREHOUSE_TYPE',
        code: 'WAREHOUSE_TYPE',
        name: 'Loại Kho',
        parentId: null,
      },
    });

    // Create warehouse type values
    await this.prisma.catalogValue.createMany({
      data: [
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'OWNER',
          label: 'Kho chủ đầu tư',
          order: 0,
        },
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'AGENT',
          label: 'Kho đại lý',
          order: 1,
        },
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'LANDLORD',
          label: 'Kho chủ nhà',
          order: 2,
        },
        {
          catalogId: warehouseTypeCatalog.id,
          value: 'AUCTION',
          label: 'Kho đấu giá / ngân hàng',
          order: 3,
        },
      ],
    });

    // Create "Danh mục khác" catalogs for future use
    // These can be extended as needed for other combobox data sources

    // Create "Loại HĐLĐ" (Labor Contract Type) catalog
    const hdldCatalog = await this.prisma.catalog.create({
      data: {
        workspaceId,
        type: 'HDLD_TYPE',
        code: 'HDLD_TYPE',
        name: 'Loại HĐLĐ',
        parentId: null,
      },
    });

    await this.prisma.catalogValue.createMany({
      data: [
        { catalogId: hdldCatalog.id, value: 'THU_VIEC', label: 'Thử việc', order: 0 },
        { catalogId: hdldCatalog.id, value: 'BA_THANG', label: '3 tháng', order: 1 },
        { catalogId: hdldCatalog.id, value: 'SAU_THANG', label: '6 tháng', order: 2 },
      ],
    });
  }

  private async issueTokenResponse(user: User, workspace: Workspace | null, deviceId: string) {
    if (!workspace)
      throw new HttpException('Workspace not found', HttpStatus.INTERNAL_SERVER_ERROR);
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, userId: user.id, status: 1 },
      include: { role: true },
    });

    const payload: JwtPayload = {
      sub: user!.id,
      workspaceId: workspace.id,
      role: membership?.role.code || 'OWNER',
      workspaceType: workspace.type,
      deviceId,
    };

    const { accessToken, refreshToken } = await this.issueTokens(payload, deviceId, workspace.id);

    return {
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          fullName: user.fullName,
          addressLine: user.addressLine,
          provinceCode: user.provinceCode,
          provinceName: user.provinceName,
          districtCode: user.districtCode,
          districtName: user.districtName,
          wardCode: user.wardCode,
          wardName: user.wardName,
          emailVerifiedAt: user.emailVerifiedAt,
          avatarUrl: user.avatarUrl,
        },
        workspace: { id: workspace.id, type: workspace.type, name: workspace.name },
      },
    };
  }

  async issueTokens(payload: JwtPayload, deviceId: string, workspaceId: string) {
    // Embed jti so we can blacklist this specific token on logout
    const jti = uuidv4();
    const accessToken = this.jwtService.sign({ ...payload, jti });

    // Refresh token: raw UUID → SHA-256 stored in DB
    const rawRefreshToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const refreshExpiryDays = 7;
    const expiresAt = new Date(Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        deviceId,
        workspaceId,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
