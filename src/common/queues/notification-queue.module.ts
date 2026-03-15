import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationProcessor } from './notification.processor';
import { NOTIFICATION_QUEUE } from './notification.queue';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE }), PrismaModule, MailModule],
  providers: [NotificationProcessor],
  exports: [BullModule],
})
export class NotificationQueueModule {}
