import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { ApiSignatureGuard } from './common/guards/api-signature.guard';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { MailModule } from './common/mail/mail.module';
import { NotificationModule } from './modules/notification/notification.module';
import { NotificationQueueModule } from './common/queues/notification-queue.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DepartmentModule } from './modules/department/department.module';
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { ProductModule } from './modules/product/product.module';
import { ProjectModule } from './modules/project/project.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { UploadModule } from './modules/upload/upload.module';
import { PortalModule } from './modules/portal/portal.module';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting: 2 throttle profiles
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 5 }, // OTP: 5 req/min
      { name: 'default', ttl: 60000, limit: 120 }, // API: 120 req/min
    ]),

    // Cache: Redis in production, in-memory in dev
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        if (configService.get<string>('nodeEnv') === 'production') {
          const { redisStore } = await import('cache-manager-ioredis-yet');
          return {
            store: await redisStore({
              host: configService.get<string>('redis.host') || 'localhost',
              port: configService.get<number>('redis.port') || 6379,
            }),
            ttl: 300_000, // 5 min default
          };
        }
        return { ttl: 300_000 }; // in-memory for dev
      },
      inject: [ConfigService],
    }),

    // BullMQ — global Redis connection shared by all queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),

    // Task scheduling (cron jobs)
    ScheduleModule.forRoot(),

    // Global Prisma
    PrismaModule,

    // Elasticsearch
    ElasticsearchModule,

    // Feature modules
    UserModule,
    AuthModule,
    WorkspaceModule,
    NotificationModule,
    NotificationQueueModule,
    CatalogModule,
    DepartmentModule,
    MailModule,
    RoleModule,
    PermissionModule,
    WarehouseModule,
    ProductModule,
    ProjectModule,
    UploadModule,
    CleanupModule,
    PortalModule,
  ],
  providers: [
    // Global HMAC signature guard
    {
      provide: APP_GUARD,
      useClass: ApiSignatureGuard,
    },
  ],
})
export class AppModule {}
