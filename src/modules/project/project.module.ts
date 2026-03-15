import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { MinioModule } from '../../common/storage/minio.module';
import { ElasticsearchModule } from '../../elasticsearch/elasticsearch.module';

@Module({
  imports: [MinioModule, ElasticsearchModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
