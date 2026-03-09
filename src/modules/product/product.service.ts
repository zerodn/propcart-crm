import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { CreateProductDto, ListProductDto, UpdateProductDto } from './dto/index';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateProductDto) {
    try {
      const data: any = {
        workspaceId,
        warehouseId: dto.warehouseId,
        createdByUserId: userId,
        propertyType: dto.propertyType,
        unitCode: dto.unitCode,
        zone: dto.zone || null,
        block: dto.block || null,
        direction: dto.direction || null,
        promotionProgram: dto.promotionProgram || null,
        policyImageUrls: dto.policyImageUrls || null,
        productDocuments: dto.productDocuments || null,
        callPhone: dto.callPhone || null,
        zaloPhone: dto.zaloPhone || null,
        contactMemberIds: dto.contactMemberIds || null,
        transactionStatus: dto.transactionStatus || 'AVAILABLE',
        note: dto.note || null,
      };

      data.area = dto.area !== undefined ? new Decimal(String(dto.area)) : null;
      data.priceWithoutVat =
        dto.priceWithoutVat !== undefined ? new Decimal(String(dto.priceWithoutVat)) : null;
      data.priceWithVat =
        dto.priceWithVat !== undefined ? new Decimal(String(dto.priceWithVat)) : null;

      return await this.prisma.propertyProduct.create({
        data,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã căn đã tồn tại trong workspace');
      }
      throw new InternalServerErrorException(error?.message || 'Failed to create product');
    }
  }

  async list(workspaceId: string, opts?: ListProductDto) {
    const where: any = { workspaceId };
    if (opts?.search) {
      where.OR = [
        { unitCode: { contains: opts.search } },
        { propertyType: { contains: opts.search } },
        { zone: { contains: opts.search } },
        { block: { contains: opts.search } },
      ];
    }
    if (opts?.warehouseId) where.warehouseId = opts.warehouseId;
    if (opts?.transactionStatus) where.transactionStatus = opts.transactionStatus;

    const [items, total] = await Promise.all([
      this.prisma.propertyProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.propertyProduct.count({ where }),
    ]);

    return { data: items, meta: { total } };
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.propertyProduct.findFirstOrThrow({
      where: { id, workspaceId },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, workspaceId: string, dto: UpdateProductDto) {
    const existed = await this.prisma.propertyProduct.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existed) {
      throw new BadRequestException('Sản phẩm không tồn tại');
    }

    try {
      const data: any = {};

      if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
      if (dto.zone !== undefined) data.zone = dto.zone || null;
      if (dto.block !== undefined) data.block = dto.block || null;
      if (dto.unitCode !== undefined) data.unitCode = dto.unitCode;
      if (dto.direction !== undefined) data.direction = dto.direction || null;
      if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
      if (dto.promotionProgram !== undefined) data.promotionProgram = dto.promotionProgram || null;
      if (dto.policyImageUrls !== undefined) data.policyImageUrls = dto.policyImageUrls || null;
      if (dto.productDocuments !== undefined) data.productDocuments = dto.productDocuments || null;
      if (dto.callPhone !== undefined) data.callPhone = dto.callPhone || null;
      if (dto.zaloPhone !== undefined) data.zaloPhone = dto.zaloPhone || null;
      if (dto.contactMemberIds !== undefined) data.contactMemberIds = dto.contactMemberIds || null;
      if (dto.transactionStatus !== undefined) data.transactionStatus = dto.transactionStatus;
      if (dto.note !== undefined) data.note = dto.note || null;

      if (dto.area !== undefined) data.area = dto.area !== null ? new Decimal(String(dto.area)) : null;
      if (dto.priceWithoutVat !== undefined) {
        data.priceWithoutVat =
          dto.priceWithoutVat !== null ? new Decimal(String(dto.priceWithoutVat)) : null;
      }
      if (dto.priceWithVat !== undefined) {
        data.priceWithVat =
          dto.priceWithVat !== null ? new Decimal(String(dto.priceWithVat)) : null;
      }

      return await this.prisma.propertyProduct.update({
        where: { id },
        data,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã căn đã tồn tại trong workspace');
      }
      throw new InternalServerErrorException(error?.message || 'Failed to update product');
    }
  }

  async delete(id: string, workspaceId: string) {
    const existed = await this.prisma.propertyProduct.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existed) {
      throw new BadRequestException('Sản phẩm không tồn tại');
    }

    return this.prisma.propertyProduct.delete({ where: { id } });
  }

  async uploadFiles(workspaceId: string, files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('Khong co file de upload');
    }

    const uploaded = await Promise.all(
      files.map((file) => this.minioService.uploadPropertyImage(workspaceId, file)),
    );

    return uploaded.map((item, index) => ({
      fileName: files[index]?.originalname,
      fileUrl: item.fileUrl,
      objectKey: item.objectKey,
    }));
  }
}
