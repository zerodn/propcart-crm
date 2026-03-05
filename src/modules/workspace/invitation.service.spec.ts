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
    declineReason: null,
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
            workspace: { findUnique: jest.fn() },
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
        {
          provide: require('../../common/mail/mail.service').MailService,
          useValue: { sendInvitationEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    prisma = module.get(PrismaService);
    // default workspace lookup
    prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
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

      const result = await service.declineInvitation('invite-token-uuid', currentUser, 'busy');

      expect(prisma.workspaceInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 2, declineReason: 'busy' }) }),
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

  // ─── workflow scenarios (invite -> pending -> cancel -> decline) ───
  describe('workflow scenarios', () => {
    const inviterPhone = '+84969622224';
    const inviteePhone = '+84905211851';
    const inviterUser = { id: 'inviter-id', phone: inviterPhone, email: null, googleId: null, passwordHash: null, status: 1, createdAt: new Date(), updatedAt: new Date() };
    const inviteeUser = { id: 'invitee-id', phone: inviteePhone, email: null, googleId: null, passwordHash: null, status: 1, createdAt: new Date(), updatedAt: new Date() };
    let invites: any[];

    beforeEach(() => {
      invites = [];
      prisma.role.findUnique.mockResolvedValue(mockRole);
      // add notification mock
      prisma.notification = { create: jest.fn() } as any;
      userService.findByPhone.mockImplementation(async (phone) => {
        if (phone === inviteePhone) return inviteeUser;
        if (phone === inviterPhone) return inviterUser;
        return null;
      });
      prisma.workspaceInvitation.findFirst.mockImplementation(async ({ where }) => {
        // handle lookup by id (cancel flow) or by phone + status
        if (where.id) {
          return invites.find((inv) => inv.id === where.id && inv.workspaceId === where.workspaceId) || null;
        }
        if (where.invitedPhone) {
          return (
            invites.find(
              (inv) =>
                inv.workspaceId === where.workspaceId &&
                inv.invitedPhone === where.invitedPhone &&
                inv.status === where.status,
            ) || null
          );
        }
        return null;
      });
      // mock invitations listing (handle optional status / expiresAt filters)
      prisma.workspaceInvitation.findMany = jest.fn(async ({ where }) =>
        invites.filter((inv) => {
          if (where.invitedPhone && inv.invitedPhone !== where.invitedPhone) return false;
          if (typeof where.status !== 'undefined' && inv.status !== where.status) return false;
          if (where.expiresAt?.gt && !(inv.expiresAt > where.expiresAt.gt)) return false;
          return true;
        }),
      );
      prisma.workspaceInvitation.create.mockImplementation(async ({ data }) => {
        const inv = {
          id: 'inv-' + invites.length,
          token: 'token-' + invites.length,
          workspace: mockWorkspace,
          role: mockRole,
          invitedBy: { id: inviterUser.id, phone: inviterUser.phone },
          ...data,
        };
        invites.push(inv);
        return inv;
      });
      prisma.workspaceInvitation.findUnique.mockImplementation(async ({ where }) =>
        invites.find((inv) => inv.token === where.token) || null,
      );
      prisma.workspaceInvitation.update.mockImplementation(async ({ where, data }) => {
        const inv = invites.find((i) => i.id === where.id);
        Object.assign(inv, data);
        return inv;
      });
      prisma.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === inviteeUser.id) return inviteeUser;
        if (where.id === inviterUser.id) return inviterUser;
        return mockUser;
      });
    });

    it('invite -> pending -> cancel removes invitation', async () => {
      const sendDto = { phone: inviteePhone, role_code: 'SALES' };
      const sendRes = await service.sendInvitation('ws-id-1', sendDto, {
        ...mockSender,
        sub: inviterUser.id,
      } as any);
      expect(sendRes.data.status).toBe('pending');
      expect(invites.length).toBe(1);

      const listRes1 = await service.listPendingInvitations(inviteeUser.id);
      expect(listRes1.data).toHaveLength(1);
      // returned shape now includes camelCase fields
      expect(listRes1.data[0].workspace.id).toBe('ws-id-1');
      expect(listRes1.data[0].status).toBe(0);
      expect(listRes1.data[0].token).toBeDefined();

      await service.cancelInvitation('ws-id-1', invites[0].id);
      expect(invites[0].status).toBe(4);

      const listRes2 = await service.listPendingInvitations(inviteeUser.id);
      const pendingAfter = listRes2.data.filter((d) => d.status === 0 && new Date(d.expiresAt) > new Date());
      expect(pendingAfter).toHaveLength(0);
    });

    it('invite -> decline keeps history', async () => {
      const sendDto = { phone: inviteePhone, role_code: 'SALES' };
      await service.sendInvitation('ws-id-1', sendDto, {
        ...mockSender,
        sub: inviterUser.id,
      } as any);
      expect(invites[invites.length - 1].status).toBe(0);

      const listRes3 = await service.listPendingInvitations(inviteeUser.id);
      expect(listRes3.data).toHaveLength(1);
      expect(listRes3.data[0].status).toBe(0);
      const token = invites[invites.length - 1].token;

      const result = await service.declineInvitation(token, {
        sub: inviteeUser.id,
        workspaceId: 'ws-id-1',
        role: 'SALES',
        workspaceType: 'COMPANY',
        deviceId: 'device-id',
      } as any, 'not interested');
      expect(result.data.message).toBe('Invitation declined');

      expect(invites[invites.length - 1].status).toBe(2);
      expect(invites[invites.length - 1].declineReason).toBe('not interested');

      const listAfterDecline = await service.listPendingInvitations(inviteeUser.id);
      const pendingAfterDecline = listAfterDecline.data.filter((d) => d.status === 0 && new Date(d.expiresAt) > new Date());
      expect(pendingAfterDecline).toHaveLength(0);
      expect(invites.some((i) => i.status === 2)).toBe(true);
    });
  });
});
