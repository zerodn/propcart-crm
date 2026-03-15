import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Connection pool tuning.
 *
 * Default Prisma pool = 10 per process. With multiple NestJS instances:
 *   3 instances × 10 = 30 connections → PostgreSQL max_connections can be hit fast.
 *
 * Rule of thumb per instance: (num_cpu_cores × 2) + 1, typically 5–10.
 * Set DATABASE_CONNECTION_LIMIT in env to override. Default: 5.
 *
 * If PgBouncer is used in front of Postgres, set DATABASE_CONNECTION_LIMIT=1
 * (PgBouncer manages the pool itself).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT ?? '5', 10);
    const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT ?? '10', 10);

    // Append pool params to the datasource URL at runtime
    const baseUrl = process.env.DATABASE_URL ?? '';
    const separator = baseUrl.includes('?') ? '&' : '?';
    const datasourceUrl = `${baseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;

    super({ datasources: { db: { url: datasourceUrl } } });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(
      `Prisma connected (connection_limit=${process.env.DATABASE_CONNECTION_LIMIT ?? 5})`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
