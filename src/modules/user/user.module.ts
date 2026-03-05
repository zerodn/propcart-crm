import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailModule } from '../../common/mail/mail.module';
import { MinioModule } from '../../common/storage/minio.module';

@Module({
  imports: [MailModule, MinioModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
