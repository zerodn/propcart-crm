import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ElasticsearchModule } from '../../elasticsearch/elasticsearch.module';
import { NotificationQueueModule } from '../../common/queues/notification-queue.module';

@Module({
  imports: [PrismaModule, ElasticsearchModule, NotificationQueueModule],
  controllers: [PortalController],
})
export class PortalModule {}
