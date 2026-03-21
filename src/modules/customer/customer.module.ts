import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomFieldController } from './custom-field.controller';
import { CustomFieldService } from './custom-field.service';
import { MinioModule } from '../../common/storage/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [CustomerController, CustomFieldController],
  providers: [CustomerService, CustomFieldService],
  exports: [CustomerService, CustomFieldService],
})
export class CustomerModule {}
