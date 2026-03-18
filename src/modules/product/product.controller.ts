import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ProductService } from './product.service';
import { CreateProductDto, ListProductDto, UpdateProductDto } from './dto/index';

@Controller('workspaces/:workspaceId/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('PRODUCT_CREATE')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(workspaceId, user.sub, dto);
  }

  @Post('upload-files')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  @UseInterceptors(FilesInterceptor('files', 20))
  uploadFiles(
    @Param('workspaceId') workspaceId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.uploadFiles(workspaceId, files);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ListProductDto,
  ) {
    return this.productService.list(workspaceId, user, query);
  }

  @Get(':id/project-context')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getProjectContext(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.productService.getProjectContext(id, workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.productService.findById(id, workspaceId, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('PRODUCT_UPDATE')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
  @RequirePermission('PRODUCT_DELETE')
  delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.productService.delete(id, workspaceId);
  }
}
