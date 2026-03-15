import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  NOTIFICATION_QUEUE,
  NotificationJobType,
  SendEmailJob,
  CreateNotificationJob,
} from './notification.queue';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NotificationJobType.SEND_EMAIL:
        await this.handleSendEmail(job.data as SendEmailJob);
        break;
      case NotificationJobType.CREATE_NOTIFICATION:
        await this.handleCreateNotification(job.data as CreateNotificationJob);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendEmail(data: SendEmailJob) {
    try {
      if (data.type === 'booking-request') {
        await this.mailService.sendBookingRequestEmail(data.to, {
          recipientName: data.recipientName,
          productName: data.productName,
          unitCode: data.unitCode ?? '',
          saleName: data.saleName,
          agency: data.agency,
          phone: data.phone,
          notes: data.notes,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${data.to}: ${(error as Error).message}`);
      throw error; // Re-throw so BullMQ retries the job
    }
  }

  private async handleCreateNotification(data: CreateNotificationJob) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.notificationType,
          payload: JSON.stringify(data.payload),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification for ${data.userId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
