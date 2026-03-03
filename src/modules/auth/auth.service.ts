import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';
import { JwtPayload } from './strategies/jwt.strategy';

interface OtpRecord {
  code: string;
  attempts: number;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
    );
  }

  // ============================================================
  // SEND OTP
  // ============================================================

  async sendOtp(dto: SendOtpDto) {
    const { phone } = dto;

    // Check if user is banned
    const user = await this.userService.findByPhone(phone);
    if (user && user.status === 2) {
      throw new HttpException(
        { code: 'USER_BANNED', message: 'This account has been banned' },
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

    // Issue tokens
    return this.issueTokenResponse(user, workspace, device.id);
  }

  // ============================================================
  // GOOGLE AUTH
  // ============================================================

  async googleAuth(dto: GoogleAuthDto) {
    const { google_token, device_hash, platform } = dto;

    // Verify Google token
    let googlePayload: { googleId: string; email: string; name: string };
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: google_token,
        audience: this.configService.get<string>('google.clientId'),
      });
      const payload = ticket.getPayload()!;
      googlePayload = {
        googleId: payload.sub!,
        email: payload.email!,
        name: payload.name!,
      };
    } catch {
      throw new HttpException(
        { code: 'GOOGLE_TOKEN_INVALID', message: 'Invalid or expired Google token' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Find user by googleId or email
    let user =
      (await this.userService.findByGoogleId(googlePayload.googleId)) ||
      (await this.userService.findByEmail(googlePayload.email));

    if (!user) {
      user = await this.userService.createUser({
        googleId: googlePayload.googleId,
        email: googlePayload.email,
      });
    } else if (!user.googleId) {
      // Link google to existing account
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googlePayload.googleId },
      });
    }

    // If phone is missing, return temp token for phone linking
    if (!user.phone) {
      const tempToken = this.jwtService.sign(
        { type: 'google_link', sub: user!.id, googleId: googlePayload.googleId },
        { expiresIn: this.configService.get<string>('jwt.tempExpires') || '10m' },
      );
      return { data: { status: 'PHONE_REQUIRED', temp_token: tempToken } };
    }

    // User has phone — issue full tokens
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: user.id, type: 'PERSONAL' },
    });

    if (!workspace) {
      await this.createPersonalWorkspace(user.id, user.phone || user.email || user.id);
    }

    const freshWorkspace = await this.prisma.workspace.findFirst({
      where: { ownerUserId: user.id, type: 'PERSONAL' },
    });

    const device = await this.userService.upsertDevice(user.id, device_hash, platform);
    return this.issueTokenResponse(user, freshWorkspace, device.id);
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
      role: m.role.code,
      is_active: m.workspace.id === currentUser.workspaceId,
    }));

    return { data };
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });

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
      },
    });

    return workspace;
  }

  private async issueTokenResponse(user: any, workspace: any, deviceId: string) {
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
        user: { id: user.id, phone: user.phone },
        workspace: { id: workspace.id, type: workspace.type, name: workspace.name },
      },
    };
  }

  async issueTokens(payload: JwtPayload, deviceId: string, workspaceId: string) {
    const accessToken = this.jwtService.sign(payload);

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
