import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceService } from './workspace.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prisma: any;

  const mockRole = { id: 'role-id-1', code: 'OWNER', name: 'Owner' };
  const mockWorkspace = {
    id: 'ws-id-1',
    type: 'PERSONAL',
    name: 'My Workspace',
    ownerUserId: 'user-id-1',
    status: 1,
  };
  const mockMembership = {
    id: 'member-id-1',
    workspaceId: 'ws-id-1',
    userId: 'user-id-1',
    roleId: 'role-id-1',
    status: 1,
    joinedAt: new Date(),
    workspace: mockWorkspace,
    role: mockRole,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: PrismaService,
          useValue: {
            workspaceMember: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadMemberDocument: jest.fn(),
            removeFileByUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findWorkspacesByUserId', () => {
    it('should return all active memberships with workspace and role', async () => {
      prisma.workspaceMember.findMany.mockResolvedValue([mockMembership]);

      const result = await service.findWorkspacesByUserId('user-id-1');

      expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-id-1', status: 1 } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].role.code).toBe('OWNER');
    });
  });

  describe('findMembership', () => {
    it('should return membership when user is active member', async () => {
      prisma.workspaceMember.findFirst.mockResolvedValue(mockMembership);

      const result = await service.findMembership('ws-id-1', 'user-id-1');

      expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: 'ws-id-1', userId: 'user-id-1', status: 1 },
        }),
      );
      expect(result).toEqual(mockMembership);
    });

    it('should return null when user is not a member', async () => {
      prisma.workspaceMember.findFirst.mockResolvedValue(null);

      const result = await service.findMembership('ws-id-1', 'unknown-user');

      expect(result).toBeNull();
    });
  });
});
