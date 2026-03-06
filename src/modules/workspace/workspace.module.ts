import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { InvitationService } from './invitation.service';
import { WorkspaceController } from './workspace.controller';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../../common/mail/mail.module';
import { MinioModule } from '../../common/storage/minio.module';

@Module({
  imports: [UserModule, AuthModule, MailModule, MinioModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, InvitationService],
  exports: [WorkspaceService, InvitationService],
})
export class WorkspaceModule {}
