import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
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
import { CatalogModule } from './modules/catalog/catalog.module';
import { DepartmentModule } from './modules/department/department.module';
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { ProductModule } from './modules/product/product.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';

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

    // In-memory cache (dev mode — replace with Redis in production)
    CacheModule.register({
      isGlobal: true,
      ttl: 120000, // default 120s
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
    CatalogModule,
    DepartmentModule,
    MailModule,
    RoleModule,
    PermissionModule,
    WarehouseModule,
    ProductModule,
    CleanupModule,
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
