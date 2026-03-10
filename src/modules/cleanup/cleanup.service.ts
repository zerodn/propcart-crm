import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MinioService } from '../../common/storage/minio.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly minioService: MinioService) {}

  /**
   * Cleanup temporary files older than 24 hours (+ 30 min buffer)
   * Buffer prevents deleting files being uploaded during cron execution
   * Runs every day at 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleTempFileCleanup() {
    this.logger.log('Starting scheduled temp file cleanup...');

    try {
      // Delete files older than 24h30m (24h + 30min buffer for safety)
      const result = await this.minioService.cleanupTempFiles(24, 30);
      this.logger.log(
        `Temp file cleanup completed: ${result.deleted} files deleted, ${result.errors} errors`,
      );
    } catch (error) {
      this.logger.error('Temp file cleanup failed', error);
    }
  }

  /**
   * Manual cleanup trigger (can be called via API if needed)
   */
  async manualCleanup(olderThanHours: number = 24, bufferMinutes: number = 30) {
    this.logger.log(
      `Manual cleanup triggered for files older than ${olderThanHours} hours (+ ${bufferMinutes} min buffer)`,
    );
    return await this.minioService.cleanupTempFiles(olderThanHours, bufferMinutes);
  }
}
