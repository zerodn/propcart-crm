import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { MinioModule } from '../../common/storage/minio.module';

@Module({
  imports: [MinioModule],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class CleanupModule {}
