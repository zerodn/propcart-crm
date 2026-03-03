import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: any;
  let userService: jest.Mocked<UserService>;

  const mockUser = { id: 'user-id-1', phone: '+84901234567', email: null, googleId: null, passwordHash: null, status: 1, createdAt: new Date(), updatedAt: new Date() };
  const mockSender = { sub: 'sender-id-1', workspaceId: 'ws-id-1', role: 'OWNER', workspaceType: 'COMPANY', deviceId: 'device-id-1' };
  const mockRole = { id: 'role-id-1', code: 'SALES', name: 'Sales', description: null, createdAt: new Date() };
  const mockWorkspace = { id: 'ws-id-1', type: 'COMPANY', name: 'ABC Corp', ownerUserId: 'sender-id-1', status: 1, createdAt: new Date() };
  const mockInvitation = {
    id: 'inv-id-1', workspaceId: 'ws-id-1', invitedByUserId: 'sender-id-1',
    invitedPhone: '+84901234567', invitedUserId: null, roleId: 'role-id-1',
    token: 'invite-token-uuid', status: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    respondedAt: null, createdAt: new Date(),
    workspace: mockWorkspace, role: mockRole,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: PrismaService,
          useValue: {
            role: { findUnique: jest.fn() },
            workspaceMember: { findFirst: jest.fn(), create: jest.fn() },
            workspaceInvitation: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            user: { findUnique: jest.fn() },
          },
        },
        {
          provide: UserService,
          useValue: {
            findByPhone: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    prisma = module.get(PrismaService);
    userService = module.get(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── sendInvitation ────────────────────────────────────────

  describe('sendInvitation', () => {
    const dto = { phone: '+84901234567', role_code: 'SALES' };

    it('should create invitation for unregistered phone', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole);
      userService.findByPhone.mockResolvedValue(null); // unregistered
      prisma.workspaceInvitation.findFirst.mockResolvedValue(null); // no pending
      prisma.workspaceInvitation.create.mockResolvedValue({ ...mockInvitation, role: mockRole });

      const result = await service.sendInvitation('ws-id-1', dto, mockSender);

      expect(prisma.workspaceInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws-id-1',
            invitedPhone: '+84901234567',
            invitedUserId: null,
            status: 0,
          }),
        }),
      );
      expect(result.data.status).toBe('pending');
    });

    it('should throw MEMBER_ALREADY_EXISTS when user is already a member', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole);
      userService.findByPhone.mockResolvedValue(mockUser);
      prisma.workspaceMember.findFirst.mockResolvedValue({ id: 'member-1' }); // already member

      await expect(service.sendInvitation('ws-id-1', dto, mockSender)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'MEMBER_ALREADY_EXISTS' }),
          status: HttpStatus.CONFLICT,
        }),
      );
    });

    it('should throw INVITATION_ALREADY_PENDING when invite exists', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole);
      userService.findByPhone.mockResolvedValue(null);
      prisma.workspaceInvitation.findFirst.mockResolvedValue(mockInvitation); // pending exists

      await expect(service.sendInvitation('ws-id-1', dto, mockSender)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'INVITATION_ALREADY_PENDING' }),
          status: HttpStatus.CONFLICT,
        }),
      );
    });

    it('should throw ROLE_NOT_FOUND when role_code is invalid', async () => {
      prisma.role.findUnique.mockResolvedValue(null); // role not found

      await expect(
        service.sendInvitation('ws-id-1', { phone: '+84901234567', role_code: 'INVALID' }, mockSender),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'ROLE_NOT_FOUND' }),
          status: HttpStatus.NOT_FOUND,
        }),
      );
    });
  });

  // ─── acceptInvitation ──────────────────────────────────────

  describe('acceptInvitation', () => {
    const currentUser = { sub: mockUser.id, workspaceId: 'ws-id-1', role: 'SALES', workspaceType: 'COMPANY', deviceId: 'device-id-1' };

    it('should create workspace member and update invitation to accepted', async () => {
      prisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.workspaceMember.findFirst.mockResolvedValue(null); // not yet member

      const result = await service.acceptInvitation('invite-token-uuid', currentUser);

      expect(prisma.workspaceInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 1 }) }),
      );
      expect(result.data.message).toBe('Joined workspace successfully');
    });

    it('should throw INVITATION_NOT_FOUND when token is invalid', async () => {
      prisma.workspaceInvitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation('bad-token', currentUser)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'INVITATION_NOT_FOUND' }),
          status: HttpStatus.NOT_FOUND,
        }),
      );
    });

    it('should throw INVITATION_EXPIRED when invitation is past expiry', async () => {
      const expiredInvitation = { ...mockInvitation, expiresAt: new Date(Date.now() - 1000) };
      prisma.workspaceInvitation.findUnique.mockResolvedValue(expiredInvitation);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.acceptInvitation('invite-token-uuid', currentUser)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'INVITATION_EXPIRED' }),
          status: HttpStatus.BAD_REQUEST,
        }),
      );
    });

    it('should throw INVITATION_PHONE_MISMATCH when phone does not match', async () => {
      const differentUser = { ...mockUser, phone: '+84999999999' };
      prisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      prisma.user.findUnique.mockResolvedValue(differentUser); // different phone

      await expect(service.acceptInvitation('invite-token-uuid', currentUser)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'INVITATION_PHONE_MISMATCH' }),
          status: HttpStatus.FORBIDDEN,
        }),
      );
    });
  });

  // ─── declineInvitation ─────────────────────────────────────

  describe('declineInvitation', () => {
    const currentUser = { sub: mockUser.id, workspaceId: 'ws-id-1', role: 'SALES', workspaceType: 'COMPANY', deviceId: 'device-id-1' };

    it('should update invitation to declined', async () => {
      prisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.declineInvitation('invite-token-uuid', currentUser);

      expect(prisma.workspaceInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 2 }) }),
      );
      expect(result.data.message).toBe('Invitation declined');
    });

    it('should throw INVITATION_ALREADY_RESPONDED when status is not pending', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 1 };
      prisma.workspaceInvitation.findUnique.mockResolvedValue(acceptedInvitation);

      await expect(service.declineInvitation('invite-token-uuid', currentUser)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'INVITATION_ALREADY_RESPONDED' }),
          status: HttpStatus.CONFLICT,
        }),
      );
    });
  });

  // ─── cancelInvitation ──────────────────────────────────────

  describe('cancelInvitation', () => {
    it('should cancel pending invitation', async () => {
      prisma.workspaceInvitation.findFirst.mockResolvedValue(mockInvitation);

      const result = await service.cancelInvitation('ws-id-1', 'inv-id-1');

      expect(prisma.workspaceInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 4 } }),
      );
      expect(result.data.message).toBe('Invitation cancelled');
    });

    it('should throw INVITATION_ALREADY_RESPONDED when invitation was accepted', async () => {
      prisma.workspaceInvitation.findFirst.mockResolvedValue({ ...mockInvitation, status: 1 });

      await expect(service.cancelInvitation('ws-id-1', 'inv-id-1')).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'INVITATION_ALREADY_RESPONDED' }),
          status: HttpStatus.CONFLICT,
        }),
      );
    });
  });
});
