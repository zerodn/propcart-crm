import { Injectable } from '@nestjs/common';
import { MinioService } from '../../common/storage/minio.service';

@Injectable()
export class UploadService {
  constructor(private readonly minioService: MinioService) {}

  /**
   * Upload file to temporary storage
   * Files in /temp are auto-deleted after 24 hours by cleanup service
   */
  async uploadToTemp(workspaceId: string, file: Express.Multer.File) {
    const uploadFile = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };

    const result = await this.minioService.uploadTemporaryFile(
      workspaceId,
      uploadFile,
    );

    return {
      data: {
        url: result.fileUrl,
        objectKey: result.objectKey,
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }
}
