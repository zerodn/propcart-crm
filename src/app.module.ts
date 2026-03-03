import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ApiSignatureGuard } from './common/guards/api-signature.guard';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting: 2 throttle profiles
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 5 },     // OTP: 5 req/min
      { name: 'default', ttl: 60000, limit: 120 },  // API: 120 req/min
    ]),

    // In-memory cache (dev mode — replace with Redis in production)
    CacheModule.register({
      isGlobal: true,
      ttl: 120000, // default 120s
    }),

    // Global Prisma
    PrismaModule,

    // Feature modules
    UserModule,
    AuthModule,
    WorkspaceModule,
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
