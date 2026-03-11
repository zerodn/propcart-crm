import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload temporary file to /temp folder
   * WorkspaceId is taken from authenticated JWT token
   * Max file size: 10MB
   */
  @Post('temp')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadToTemp(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const workspaceId = req.user?.workspaceId as string;
    if (!workspaceId) {
      throw new BadRequestException('No workspace context in token');
    }

    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds 10MB limit (got ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    // Validate file type (images only)
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Only images are allowed`,
      );
    }

    return this.uploadService.uploadToTemp(workspaceId, file);
  }
}
