import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoleModule } from '../role/role.module';
import { ElasticsearchModule } from '../../elasticsearch/elasticsearch.module';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';

@Module({
  imports: [PrismaModule, RoleModule, ElasticsearchModule],
  providers: [DepartmentService],
  controllers: [DepartmentController],
  exports: [DepartmentService],
})
export class DepartmentModule {}
