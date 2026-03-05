import { Controller, Get, UseGuards, Param, Patch } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Observable, interval, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Controller('me/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.notificationService.list(user.sub);
  }

  @Get('count')
  async count(@CurrentUser() user: JwtPayload) {
    const list = await this.notificationService.list(user.sub);
    const unread = (list as any[]).filter((n) => !n.read).length;
    return { data: { unread } };
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  // Simple SSE stream that polls notifications every 3 seconds
  @Get('stream')
  stream(@CurrentUser() user: JwtPayload): Observable<any> {
    return interval(3000).pipe(
      switchMap(() => from(this.notificationService.list(user.sub))),
      map((list) => ({ event: 'notifications', data: list })),
    );
  }
}
