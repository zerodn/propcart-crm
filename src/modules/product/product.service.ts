import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, ListProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

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
        priceSheetUrl: dto.priceSheetUrl || null,
        salesPolicyUrl: dto.salesPolicyUrl || null,
        layoutPlanUrl: dto.layoutPlanUrl || null,
        cartLink: dto.cartLink || null,
        callPhone: dto.callPhone || null,
        zaloPhone: dto.zaloPhone || null,
        transactionStatus: dto.transactionStatus || 'AVAILABLE',
        note: dto.note || null,
        isInterested: dto.isInterested ?? false,
        isShared: dto.isShared ?? false,
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
      if (dto.priceSheetUrl !== undefined) data.priceSheetUrl = dto.priceSheetUrl || null;
      if (dto.salesPolicyUrl !== undefined) data.salesPolicyUrl = dto.salesPolicyUrl || null;
      if (dto.layoutPlanUrl !== undefined) data.layoutPlanUrl = dto.layoutPlanUrl || null;
      if (dto.cartLink !== undefined) data.cartLink = dto.cartLink || null;
      if (dto.callPhone !== undefined) data.callPhone = dto.callPhone || null;
      if (dto.zaloPhone !== undefined) data.zaloPhone = dto.zaloPhone || null;
      if (dto.transactionStatus !== undefined) data.transactionStatus = dto.transactionStatus;
      if (dto.note !== undefined) data.note = dto.note || null;
      if (dto.isInterested !== undefined) data.isInterested = dto.isInterested;
      if (dto.isShared !== undefined) data.isShared = dto.isShared;

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
}
