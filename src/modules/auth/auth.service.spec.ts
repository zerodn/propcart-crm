import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';

// ─── Test Fixtures ───────────────────────────────────────────

const mockUser = {
  id: 'user-id-1',
  phone: '+84901234567',
  email: null,
  fullName: null,
  addressLine: null,
  provinceCode: null,
  provinceName: null,
  districtCode: null,
  districtName: null,
  wardCode: null,
  wardName: null,
  emailVerifiedAt: null,
  emailVerifyToken: null,
  emailVerifyExpiresAt: null,
  googleId: null,
  appleId: null,
  passwordHash: null,
  status: 1,
  avatarUrl: null,
  gender: null,
  dateOfBirth: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockWorkspace = {
  id: 'ws-id-1',
  type: 'PERSONAL',
  name: 'Workspace of +84901234567',
  ownerUserId: mockUser.id,
  status: 1,
  createdAt: new Date(),
};

const mockRole = {
  id: 'role-id-1',
  code: 'OWNER',
  name: 'Owner',
  description: null,
  createdAt: new Date(),
};

const mockDevice = {
  id: 'device-id-1',
  userId: mockUser.id,
  deviceHash: 'device-hash-abc',
  platform: 'web',
  lastActive: new Date(),
  createdAt: new Date(),
};

const mockMembership = {
  id: 'member-id-1',
  workspaceId: mockWorkspace.id,
  userId: mockUser.id,
  roleId: mockRole.id,
  status: 1,
  joinedAt: new Date(),
  role: mockRole,
};

const mockRefreshToken = {
  id: 'rt-id-1',
  userId: mockUser.id,
  deviceId: mockDevice.id,
  workspaceId: mockWorkspace.id,
  tokenHash: '',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revoked: false,
  createdAt: new Date(),
};

// ─── Helper: hash a token ────────────────────────────────────
const sha256 = (val: string) => crypto.createHash('sha256').update(val).digest('hex');

// ─── Test Suite ───────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let userService: jest.Mocked<UserService>;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            workspace: {
              create: jest.fn().mockResolvedValue(mockWorkspace),
              findFirst: jest.fn().mockResolvedValue(mockWorkspace),
              findUnique: jest.fn().mockResolvedValue(mockWorkspace),
              update: jest.fn(),
            },
            workspaceMember: {
              create: jest.fn().mockResolvedValue(mockMembership),
              findFirst: jest.fn().mockResolvedValue(mockMembership),
            },
            role: {
              findUnique: jest.fn().mockResolvedValue(mockRole),
            },
            catalog: {
              create: jest.fn().mockResolvedValue({
                id: 'cat-role-1',
                workspaceId: mockWorkspace.id,
                type: 'ROLE',
                code: 'ROLE',
                name: 'Vai trò',
                parentId: null,
              }),
            },
            catalogValue: {
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
            refreshToken: {
              create: jest.fn().mockResolvedValue({ ...mockRefreshToken }),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            userDevice: {
              findFirst: jest.fn().mockResolvedValue(mockDevice),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            rolePermission: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: UserService,
          useValue: {
            findByPhone: jest.fn(),
            findByGoogleId: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createUser: jest.fn().mockResolvedValue(mockUser),
            upsertDevice: jest.fn().mockResolvedValue(mockDevice),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.access.token'),
            decode: jest
              .fn()
              .mockReturnValue({ jti: 'mock-jti', exp: Math.floor(Date.now() / 1000) + 900 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                nodeEnv: 'development',
                'google.clientId': 'test-google-client-id',
                'jwt.tempExpires': '10m',
                'jwt.accessExpires': '15m',
              };
              return config[key];
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    userService = module.get(UserService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── sendOtp ───────────────────────────────────────────────

  describe('sendOtp', () => {
    it('should store OTP in Redis and return expires_in for active user', async () => {
      userService.findByPhone.mockResolvedValue(mockUser);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.sendOtp({ phone: '+84901234567' });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'otp:+84901234567',
        expect.stringContaining('"code":"999999"'),
        120000,
      );
      expect(result.data.expires_in).toBe(120);
    });

    it('should throw USER_BANNED when user status is 2', async () => {
      userService.findByPhone.mockResolvedValue({ ...mockUser, status: 2 });

      await expect(service.sendOtp({ phone: '+84901234567' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'USER_BANNED' }),
          status: HttpStatus.FORBIDDEN,
        }),
      );
    });
  });

  // ─── verifyOtp ─────────────────────────────────────────────

  describe('verifyOtp', () => {
    const dto = { phone: '+84901234567', otp: '999999', device_hash: 'hash-abc', platform: 'web' };
    const otpRecord = JSON.stringify({ code: '999999', attempts: 0 });

    it('should create new user + personal workspace on first login', async () => {
      userService.findByPhone.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(mockUser);
      userService.upsertDevice.mockResolvedValue(mockDevice);
      cacheManager.get.mockResolvedValue(otpRecord);
      cacheManager.del.mockResolvedValue(undefined);

      const result = await service.verifyOtp(dto);

      expect(userService.createUser).toHaveBeenCalledWith({ phone: '+84901234567' });
      expect(prisma.workspace.create).toHaveBeenCalled();
      expect(result.data).toHaveProperty('access_token', 'mock.access.token');
    });

    it('should login existing user without creating workspace', async () => {
      userService.findByPhone.mockResolvedValue(mockUser);
      userService.upsertDevice.mockResolvedValue(mockDevice);
      cacheManager.get.mockResolvedValue(otpRecord);
      cacheManager.del.mockResolvedValue(undefined);
      prisma.workspace.findFirst.mockResolvedValue(mockWorkspace);

      const result = await service.verifyOtp(dto);

      expect(userService.createUser).not.toHaveBeenCalled();
      expect(result.data).toHaveProperty('access_token');
    });

    it('should throw OTP_INVALID when OTP not in Redis', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'OTP_INVALID' }),
          status: HttpStatus.BAD_REQUEST,
        }),
      );
    });

    it('should throw OTP_INVALID when OTP code does not match', async () => {
      cacheManager.get.mockResolvedValue(JSON.stringify({ code: '111111', attempts: 0 }));
      cacheManager.set.mockResolvedValue(undefined);

      await expect(service.verifyOtp({ ...dto, otp: '999999' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'OTP_INVALID' }),
        }),
      );
    });
  });

  // ─── googleAuth ────────────────────────────────────────────

  describe('googleAuth', () => {
    const googleUserInfo = { sub: 'google-id-1', email: 'test@gmail.com', name: 'Test User' };

    const mockFetchSuccess = () =>
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(googleUserInfo),
      } as unknown as Response);

    const mockFetchFailure = () =>
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      } as unknown as Response);

    afterEach(() => jest.restoreAllMocks());

    it('should create new user without phone and return tokens', async () => {
      mockFetchSuccess();
      const newUser = {
        ...mockUser,
        phone: null,
        googleId: 'google-id-1',
        email: 'test@gmail.com',
      };
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      userService.upsertDevice.mockResolvedValue(mockDevice);
      prisma.workspace.findFirst.mockResolvedValue(mockWorkspace);

      const result = await service.googleAuth({
        google_token: 'valid-google-token',
        device_hash: 'hash-abc',
        platform: 'web',
      });

      expect(userService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ googleId: 'google-id-1', emailVerifiedAt: expect.any(Date) }),
      );
      expect(result.data).toHaveProperty('access_token');
    });

    it('should return tokens when user already has a phone', async () => {
      mockFetchSuccess();
      userService.findByGoogleId.mockResolvedValue(mockUser);
      userService.upsertDevice.mockResolvedValue(mockDevice);
      prisma.workspace.findFirst.mockResolvedValue(mockWorkspace);

      const result = await service.googleAuth({
        google_token: 'valid-google-token',
        device_hash: 'hash-abc',
        platform: 'web',
      });

      expect(result.data).toHaveProperty('access_token');
    });

    it('should throw GOOGLE_TOKEN_INVALID when userinfo returns non-ok', async () => {
      mockFetchFailure();

      await expect(
        service.googleAuth({ google_token: 'bad-token', device_hash: 'h', platform: 'web' }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'GOOGLE_TOKEN_INVALID' }),
          status: HttpStatus.UNAUTHORIZED,
        }),
      );
    });

    it('should throw EMAIL_EXISTS_UNVERIFIED when email matched but not verified', async () => {
      mockFetchSuccess();
      const unverifiedUser = {
        ...mockUser,
        phone: '+84901111111',
        googleId: null,
        email: 'test@gmail.com',
        emailVerifiedAt: null,
      };
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(unverifiedUser);

      await expect(
        service.googleAuth({
          google_token: 'valid-google-token',
          device_hash: 'h',
          platform: 'web',
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: 'EMAIL_EXISTS_UNVERIFIED',
            email: 'test@gmail.com',
          }),
          status: HttpStatus.CONFLICT,
        }),
      );

      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should auto-link when email matched and already verified', async () => {
      mockFetchSuccess();
      const verifiedUser = {
        ...mockUser,
        googleId: null,
        email: 'test@gmail.com',
        emailVerifiedAt: new Date(),
      };
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(verifiedUser);
      userService.upsertDevice.mockResolvedValue(mockDevice);
      prisma.user.update.mockResolvedValue({ ...verifiedUser, googleId: 'google-id-1' });
      prisma.workspace.findFirst.mockResolvedValue(mockWorkspace);

      const result = await service.googleAuth({
        google_token: 'valid-google-token',
        device_hash: 'hash-abc',
        platform: 'web',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ googleId: 'google-id-1' }) }),
      );
      expect(result.data).toHaveProperty('access_token');
    });
  });

  // ─── refreshToken ──────────────────────────────────────────

  describe('refreshToken', () => {
    const rawToken = 'raw-refresh-token-uuid';
    const tokenHash = sha256(rawToken);
    const storedToken = { ...mockRefreshToken, tokenHash };

    it('should rotate refresh token and return new tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.userDevice.findFirst.mockResolvedValue(mockDevice);
      prisma.refreshToken.update.mockResolvedValue({ ...storedToken, revoked: true });
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.findFirst.mockResolvedValue(mockMembership);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken({
        refresh_token: rawToken,
        device_hash: mockDevice.deviceHash,
      });

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked: true } }),
      );
      expect(result).toHaveProperty('accessToken', 'mock.access.token');
    });

    it('should throw REFRESH_TOKEN_INVALID when token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refresh_token: rawToken, device_hash: 'hash' }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'REFRESH_TOKEN_INVALID' }),
          status: HttpStatus.UNAUTHORIZED,
        }),
      );
    });

    it('should throw REFRESH_TOKEN_REVOKED when token is revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...storedToken, revoked: true });

      await expect(
        service.refreshToken({ refresh_token: rawToken, device_hash: 'hash' }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'REFRESH_TOKEN_REVOKED' }),
        }),
      );
    });

    it('should throw DEVICE_MISMATCH when device_hash does not match', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.userDevice.findFirst.mockResolvedValue(null); // No device found

      await expect(
        service.refreshToken({ refresh_token: rawToken, device_hash: 'wrong-device-hash' }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'DEVICE_MISMATCH' }),
          status: HttpStatus.UNAUTHORIZED,
        }),
      );
    });
  });

  // ─── switchWorkspace ───────────────────────────────────────

  describe('switchWorkspace', () => {
    const currentUser = {
      sub: mockUser.id,
      workspaceId: 'old-ws-id',
      role: 'SALES',
      workspaceType: 'PERSONAL',
      deviceId: mockDevice.id,
    };

    it('should issue new JWT for valid workspace member', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.findFirst.mockResolvedValue(mockMembership);

      const result = await service.switchWorkspace({ workspace_id: mockWorkspace.id }, currentUser);

      expect(result.data).toHaveProperty('access_token', 'mock.access.token');
      expect(result.data.workspace.id).toBe(mockWorkspace.id);
    });

    it('should throw WORKSPACE_MEMBER_NOT_FOUND when not a member', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(
        service.switchWorkspace({ workspace_id: mockWorkspace.id }, currentUser),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'WORKSPACE_MEMBER_NOT_FOUND' }),
          status: HttpStatus.FORBIDDEN,
        }),
      );
    });
  });

  // ─── logout ────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke refresh token and return success message', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('', 'raw-refresh-token-uuid');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked: true } }),
      );
      expect(result.data.message).toBe('Logged out successfully');
    });
  });
});
