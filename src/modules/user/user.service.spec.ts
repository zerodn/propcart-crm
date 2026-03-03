import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-uuid-1',
    phone: '+84901234567',
    email: 'test@example.com',
    googleId: null,
    passwordHash: null,
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            userDevice: {
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByPhone', () => {
    it('should return user when phone exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByPhone('+84901234567');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '+84901234567' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when phone not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByPhone('+84999999999');

      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should return user when google_id exists', async () => {
      const userWithGoogle = { ...mockUser, googleId: 'google-id-123' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithGoogle);

      const result = await service.findByGoogleId('google-id-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { googleId: 'google-id-123' } });
      expect(result).toEqual(userWithGoogle);
    });
  });

  describe('createUser', () => {
    it('should create user with given data', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.createUser({ phone: '+84901234567' });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { phone: '+84901234567' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('upsertDevice', () => {
    it('should upsert device with userId and deviceHash', async () => {
      const mockDevice = {
        id: 'device-uuid-1',
        userId: mockUser.id,
        deviceHash: 'hash123',
        platform: 'web',
        lastActive: new Date(),
        createdAt: new Date(),
      };
      (prisma.userDevice.upsert as jest.Mock).mockResolvedValue(mockDevice);

      const result = await service.upsertDevice(mockUser.id, 'hash123', 'web');

      expect(prisma.userDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_deviceHash: { userId: mockUser.id, deviceHash: 'hash123' } },
        }),
      );
      expect(result).toEqual(mockDevice);
    });
  });
});
