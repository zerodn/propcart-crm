import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission required for this route
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: 'No role in token' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Workspace owner has full access
    if (user.role === 'OWNER') {
      return true;
    }

    // Support scope suffixes: _SELF, _TEAM, _ALL
    let scope: 'SELF' | 'TEAM' | 'ALL' | null = null;
    let permCode = requiredPermission;
    if (requiredPermission.endsWith('_SELF')) {
      scope = 'SELF';
      permCode = requiredPermission.replace(/_SELF$/, '');
    } else if (requiredPermission.endsWith('_TEAM')) {
      scope = 'TEAM';
      permCode = requiredPermission.replace(/_TEAM$/, '');
    } else if (requiredPermission.endsWith('_ALL')) {
      scope = 'ALL';
      permCode = requiredPermission.replace(/_ALL$/, '');
    }

    // Verify role has base permission
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        role: { code: user.role },
        permission: { code: permCode },
      },
    });

    if (!rolePermission) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: `Permission '${permCode}' required` },
        HttpStatus.FORBIDDEN,
      );
    }

    // If scope is SELF, ensure action on own resource
    if (scope === 'SELF') {
      const requestUserId = request.params.userId || request.body?.userId || request.query?.userId;
      if (!requestUserId || requestUserId !== user.sub) {
        throw new HttpException(
          { code: 'FORBIDDEN', message: 'Resource scoped to self' },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // If scope is TEAM, ensure target user is in same department with current user
    if (scope === 'TEAM') {
      const targetUserId = request.params.userId || request.body?.userId || request.query?.userId;
      if (!targetUserId) {
        throw new HttpException(
          { code: 'FORBIDDEN', message: 'Target user required for team scope' },
          HttpStatus.FORBIDDEN,
        );
      }
      // find department shared by both
      const shared = await this.prisma.departmentMember.findFirst({
        where: {
          userId: user.sub,
          department: {
            members: { some: { userId: targetUserId } },
          },
        },
      });
      if (!shared) {
        throw new HttpException(
          { code: 'FORBIDDEN', message: 'Target user not in your team' },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return true;
  }
}
