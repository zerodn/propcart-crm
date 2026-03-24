import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import * as fs from 'fs';

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  /** In-memory buffer (memoryStorage). Use path instead when possible. */
  buffer?: Buffer;
  /** Disk path from diskStorage — preferred to avoid loading file into RAM. */
  path?: string;
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

      // Set bucket policy to allow public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };

      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      this.logger.log(`Set public read policy for bucket: ${this.bucket}`);
    } catch (error) {
      this.logger.error('Cannot initialize MinIO bucket', error as Error);
    }
  }

  async uploadUserDocument(userId: string, file: UploadFile, workspaceId?: string) {
    const ext = this.getFileExtension(file.originalname);
    const date = new Date().toISOString().slice(0, 10);

    // Workspace-scoped storage: {workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}
    // If no workspace, use legacy path: documents/users/{userId}/{date}/{uuid}.{ext}
    const objectKey = workspaceId
      ? `${workspaceId}/documents/profile/${userId}/${date}/${randomUUID()}${ext}`
      : `documents/users/${userId}/${date}/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, this.toStream(file), file.size, {
        'Content-Type': file.mimetype,
        'X-Original-Name': encodeURIComponent(file.originalname),
      });
    } catch (error) {
      this.logger.error('Upload to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'DOCUMENT_UPLOAD_FAILED',
        message: 'Cannot upload document right now',
      });
    } finally {
      this.cleanupDisk(file);
    }

    return { objectKey, fileUrl: this.buildObjectUrl(objectKey) };
  }

  async uploadMemberDocument(workspaceId: string, file: UploadFile) {
    const ext = this.getFileExtension(file.originalname);
    const date = new Date().toISOString().slice(0, 10);

    // Member workspace-scoped document: {workspace_id}/documents/members/{date}/{uuid}.{ext}
    const objectKey = `${workspaceId}/documents/members/${date}/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, this.toStream(file), file.size, {
        'Content-Type': file.mimetype,
        'X-Original-Name': encodeURIComponent(file.originalname),
      });
    } catch (error) {
      this.logger.error('Upload member document to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'DOCUMENT_UPLOAD_FAILED',
        message: 'Cannot upload document right now',
      });
    } finally {
      this.cleanupDisk(file);
    }

    return { objectKey, fileUrl: this.buildObjectUrl(objectKey) };
  }

  async uploadAvatar(workspaceId: string, userId: string, file: UploadFile) {
    const ext = this.getFileExtension(file.originalname);
    const date = new Date().toISOString().slice(0, 10);

    // Avatar workspace-scoped: {workspace_id}/avatars/{userId}/{date}/{uuid}.{ext}
    const objectKey = `${workspaceId}/avatars/${userId}/${date}/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, this.toStream(file), file.size, {
        'Content-Type': file.mimetype,
      });
    } catch (error) {
      this.logger.error('Upload avatar to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'AVATAR_UPLOAD_FAILED',
        message: 'Cannot upload avatar right now',
      });
    } finally {
      this.cleanupDisk(file);
    }

    return { objectKey, fileUrl: this.buildObjectUrl(objectKey) };
  }

  async uploadPropertyImage(workspaceId: string, file: UploadFile) {
    const ext = this.getFileExtension(file.originalname);
    const date = new Date().toISOString().slice(0, 10);

    // Property image workspace-scoped: {workspace_id}/properties/{date}/{uuid}.{ext}
    const objectKey = `${workspaceId}/properties/${date}/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, this.toStream(file), file.size, {
        'Content-Type': file.mimetype,
      });
    } catch (error) {
      this.logger.error('Upload property image to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'IMAGE_UPLOAD_FAILED',
        message: 'Cannot upload image right now',
      });
    } finally {
      this.cleanupDisk(file);
    }

    return { objectKey, fileUrl: this.buildObjectUrl(objectKey) };
  }

  async uploadJoinRequestDocument(workspaceId: string, userId: string, file: UploadFile) {
    const ext = this.getFileExtension(file.originalname);
    const date = new Date().toISOString().slice(0, 10);

    // Join-request document: {workspace_id}/join-requests/{userId}/{date}/{uuid}.{ext}
    const objectKey = `${workspaceId}/join-requests/${userId}/${date}/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, this.toStream(file), file.size, {
        'Content-Type': file.mimetype,
        'X-Original-Name': encodeURIComponent(file.originalname),
      });
    } catch (error) {
      this.logger.error('Upload join-request document to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'DOCUMENT_UPLOAD_FAILED',
        message: 'Cannot upload document right now',
      });
    } finally {
      this.cleanupDisk(file);
    }

    return { objectKey, fileUrl: this.buildObjectUrl(objectKey) };
  }

  async uploadTemporaryFile(workspaceId: string, file: UploadFile) {
    const ext = this.getFileExtension(file.originalname);

    // Temporary file workspace-scoped: {workspace_id}/temp/{uuid}.{ext}
    const objectKey = `${workspaceId}/temp/${randomUUID()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, this.toStream(file), file.size, {
        'Content-Type': file.mimetype,
        'X-Original-Name': encodeURIComponent(file.originalname),
      });
    } catch (error) {
      this.logger.error('Upload temporary file to MinIO failed', error as Error);
      throw new InternalServerErrorException({
        code: 'TEMP_UPLOAD_FAILED',
        message: 'Cannot upload temporary file right now',
      });
    } finally {
      this.cleanupDisk(file);
    }

    return { objectKey, fileUrl: this.buildObjectUrl(objectKey) };
  }

  async deleteObject(objectKey: string) {
    try {
      await this.client.removeObject(this.bucket, objectKey);
    } catch (error) {
      this.logger.warn(`Failed to delete MinIO object: ${objectKey}`);
    }
  }

  async listObjectsByPrefix(
    prefix: string,
  ): Promise<Array<{ key: string; lastModified: Date; size: number }>> {
    const objects: Array<{ key: string; lastModified: Date; size: number }> = [];

    return new Promise((resolve, reject) => {
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name) {
          objects.push({
            key: obj.name,
            lastModified: obj.lastModified,
            size: obj.size,
          });
        }
      });

      stream.on('error', (err) => {
        this.logger.error(`Failed to list objects with prefix ${prefix}`, err);
        reject(err);
      });

      stream.on('end', () => {
        resolve(objects);
      });
    });
  }

  async cleanupTempFiles(
    olderThanHours: number = 24,
    bufferMinutes: number = 30,
  ): Promise<{ deleted: number; errors: number }> {
    this.logger.log(
      `Starting cleanup of temp files older than ${olderThanHours} hours (+ ${bufferMinutes} min buffer)...`,
    );

    let deleted = 0;
    let errors = 0;
    const now = new Date();

    // Add buffer time to prevent deleting files being uploaded when cron runs
    // Example: 24h + 30min = only delete files older than 24h30m
    const totalMinutes = olderThanHours * 60 + bufferMinutes;
    const cutoffTime = new Date(now.getTime() - totalMinutes * 60 * 1000);

    try {
      // List all files in temp folders across all workspaces
      const tempFiles = await this.listObjectsByPrefix('temp/');

      // Also check workspace-scoped temp folders: {workspace_id}/temp/
      const allFiles = await this.listObjectsByPrefix('');
      const workspaceTempFiles = allFiles.filter((f) => f.key.includes('/temp/'));

      const filesToCheck = [...tempFiles, ...workspaceTempFiles];

      for (const file of filesToCheck) {
        if (file.lastModified < cutoffTime) {
          try {
            await this.deleteObject(file.key);
            deleted++;
            this.logger.debug(`Deleted temp file: ${file.key}`);
          } catch (err) {
            errors++;
            this.logger.warn(`Failed to delete temp file: ${file.key}`, err);
          }
        }
      }

      this.logger.log(`Cleanup completed: ${deleted} files deleted, ${errors} errors`);
    } catch (err) {
      this.logger.error('Cleanup failed', err);
    }

    return { deleted, errors };
  }

  extractObjectKeyFromUrl(fileUrl: string): string | null {
    if (!fileUrl) return null;

    try {
      // URL format: http://localhost:9000/propcart-crm/{objectKey}
      // or: https://minio.propcart.vn/propcart-crm/{objectKey}
      const bucketPrefix = `/${this.bucket}/`;
      const index = fileUrl.indexOf(bucketPrefix);

      if (index === -1) return null;

      const objectKey = fileUrl.slice(index + bucketPrefix.length);
      return objectKey || null;
    } catch (error) {
      this.logger.warn(`Failed to extract objectKey from URL: ${fileUrl}`);
      return null;
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

  /**
   * Returns a Readable stream from a disk path (diskStorage) or a buffer (memoryStorage).
   * Prefer disk path — avoids holding the entire file in RAM.
   */
  private toStream(file: UploadFile): Readable {
    if (file.path) return fs.createReadStream(file.path);
    if (file.buffer) return Readable.from(file.buffer);
    throw new InternalServerErrorException({
      code: 'UPLOAD_SOURCE_MISSING',
      message: 'No file source available',
    });
  }

  /** Deletes the temp disk file written by Multer diskStorage. */
  private cleanupDisk(file: UploadFile): void {
    if (file.path) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* already gone or never existed */
      }
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
