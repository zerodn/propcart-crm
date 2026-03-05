import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly useSSL: boolean;
  private readonly endpoint: string;
  private readonly port: number;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    this.port = Number(this.configService.get<string>('MINIO_PORT') || 9000);
    this.useSSL = String(this.configService.get<string>('MINIO_USE_SSL') || 'false') === 'true';

    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'propcart-crm';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin_local';

    this.client = new Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey,
      secretKey,
      region: this.configService.get<string>('MINIO_REGION') || 'us-east-1',
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      }
    } catch (error) {
      this.logger.error('Cannot initialize MinIO bucket', error as Error);
    }
  }

  async uploadUserDocument(userId: string, file: UploadFile) {
    const ext = this.getFileExtension(file.originalname);
    const date = new Date().toISOString().slice(0, 10);
    const objectKey = `documents/users/${userId}/${date}/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(
        this.bucket,
        objectKey,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'X-Original-Name': encodeURIComponent(file.originalname),
        },
      );
    } catch (error) {
      this.logger.error('Upload to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'DOCUMENT_UPLOAD_FAILED',
        message: 'Cannot upload document right now',
      });
    }

    return {
      objectKey,
      fileUrl: this.buildObjectUrl(objectKey),
    };
  }

  async deleteObject(objectKey: string) {
    try {
      await this.client.removeObject(this.bucket, objectKey);
    } catch (error) {
      this.logger.warn(`Failed to delete MinIO object: ${objectKey}`);
    }
  }

  async getObject(objectKey: string): Promise<{ stream: Readable; size?: number }> {
    try {
      const stat = await this.client.statObject(this.bucket, objectKey);
      const stream = await this.client.getObject(this.bucket, objectKey);
      return {
        stream,
        size: stat.size,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch MinIO object: ${objectKey}`, error as Error);
      throw new InternalServerErrorException({
        code: 'DOCUMENT_DOWNLOAD_FAILED',
        message: 'Cannot download document right now',
      });
    }
  }

  private buildObjectUrl(objectKey: string) {
    const publicBase = this.configService.get<string>('MINIO_PUBLIC_URL');
    if (publicBase) {
      return `${publicBase.replace(/\/$/, '')}/${this.bucket}/${objectKey}`;
    }

    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}:${this.port}/${this.bucket}/${objectKey}`;
  }

  private getFileExtension(fileName: string) {
    const index = fileName.lastIndexOf('.');
    if (index < 0) {
      return '';
    }
    return fileName.slice(index);
  }
}
