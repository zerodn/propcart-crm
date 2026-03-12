import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { Response } from 'express';

interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.getProfile(user.sub);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @Post('me/profile/email/send-verification')
  @UseGuards(JwtAuthGuard)
  sendMyEmailVerification(@CurrentUser() user: JwtPayload) {
    return this.userService.sendEmailVerification(user.sub);
  }

  @Post('me/profile/upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadMyAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file: UploadedDocumentFile) {
    return this.userService.uploadProfileAvatar(user.sub, user.workspaceId, file);
  }

  @Get('me/profile/documents')
  @UseGuards(JwtAuthGuard)
  listMyDocuments(@CurrentUser() user: JwtPayload, @Query() query: ListDocumentsDto) {
    return this.userService.listDocuments(user.sub, user.workspaceId, query.documentType);
  }

  @Post('me/profile/documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadMyDocument(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: UploadedDocumentFile,
  ) {
    return this.userService.uploadDocument(user.sub, user.workspaceId, dto.documentType, file);
  }

  @Get('me/profile/documents/:documentId/download')
  @UseGuards(JwtAuthGuard)
  async downloadMyDocument(
    @CurrentUser() user: JwtPayload,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.userService.getDocumentDownload(user.sub, user.workspaceId, documentId);
    const safeFileName = encodeURIComponent(file.fileName);

    response.setHeader('Content-Type', file.fileType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
    if (typeof file.size === 'number') {
      response.setHeader('Content-Length', String(file.size));
    }

    file.stream.pipe(response);
  }

  @Delete('me/profile/documents/:documentId')
  @UseGuards(JwtAuthGuard)
  deleteMyDocument(@CurrentUser() user: JwtPayload, @Param('documentId') documentId: string) {
    return this.userService.deleteDocument(user.sub, user.workspaceId, documentId);
  }

  @Patch('me/profile/documents/:documentId/type')
  @UseGuards(JwtAuthGuard)
  updateMyDocumentType(
    @CurrentUser() user: JwtPayload,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentTypeDto,
  ) {
    return this.userService.updateDocumentType(
      user.sub,
      user.workspaceId,
      documentId,
      dto.documentType,
    );
  }
}
