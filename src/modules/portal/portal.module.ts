import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PortalController],
})
export class PortalModule {}
