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

    // Check if the user's role has the required permission
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        role: { code: user.role },
        permission: { code: requiredPermission },
      },
    });

    if (!rolePermission) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: `Permission '${requiredPermission}' required` },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
