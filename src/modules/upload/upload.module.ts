import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MinioModule } from '../../common/storage/minio.module';
import { multerDiskStorage } from '../../common/storage/multer-disk-storage';

@Module({
  imports: [
    MinioModule,
    MulterModule.register({
      storage: multerDiskStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
