import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.workspaceId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'No workspace context in token' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: user.workspaceId,
        userId: user.sub,
        status: 1,
      },
    });

    if (!membership) {
      throw new HttpException(
        { code: 'WORKSPACE_MEMBER_NOT_FOUND', message: 'Not an active member of this workspace' },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
