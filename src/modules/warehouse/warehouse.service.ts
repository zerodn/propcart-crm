import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from './dto';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateWarehouseDto) {
    try {
      this.logger.debug(`Creating warehouse with DTO:`, dto);
      
      const data: any = {
        workspaceId,
        createdByUserId: userId,
        name: dto.name,
        code: dto.code,
        type: dto.type,
        description: dto.description || null,
        status: 1,
        latitude: dto.latitude ? new Decimal(dto.latitude.toString()) : null,
        longitude: dto.longitude ? new Decimal(dto.longitude.toString()) : null,
        provinceCode: dto.provinceCode || null,
        provinceName: dto.provinceName || null,
        wardCode: dto.wardCode || null,
        wardName: dto.wardName || null,
        fullAddress: dto.fullAddress || null,
      };

      this.logger.debug(`Creating warehouse with data:`, data);

      const result = await this.prisma.propertyWarehouse.create({
        data,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      this.logger.debug(`Warehouse created:`, result);
      return result;
    } catch (error: any) {
      this.logger.error(`Error creating warehouse:`, error);
      
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã kho hàng đã tồn tại trong workspace này');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Workspace hoặc User không tồn tại');
      }
      
      throw new InternalServerErrorException(`Failed to create warehouse: ${error.message}`);
    }
  }

  async list(workspaceId: string, opts?: ListWarehouseDto) {
    const { search, type, status } = opts || {};

    const where: any = { workspaceId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { fullAddress: { contains: search } },
      ];
    }
    if (type) where.type = type;
    if (status !== undefined) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.propertyWarehouse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.propertyWarehouse.count({ where }),
    ]);

    return { data: items, meta: { total } };
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.propertyWarehouse.findFirstOrThrow({
      where: { id, workspaceId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, workspaceId: string, dto: UpdateWarehouseDto) {
    try {
      const updateData: any = {};
      
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.code !== undefined) updateData.code = dto.code;
      if (dto.type !== undefined) updateData.type = dto.type;
      if (dto.description !== undefined) updateData.description = dto.description || null;
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.latitude !== undefined) updateData.latitude = dto.latitude ? new Decimal(dto.latitude.toString()) : null;
      if (dto.longitude !== undefined) updateData.longitude = dto.longitude ? new Decimal(dto.longitude.toString()) : null;
      if (dto.provinceCode !== undefined) updateData.provinceCode = dto.provinceCode || null;
      if (dto.provinceName !== undefined) updateData.provinceName = dto.provinceName || null;
      if (dto.wardCode !== undefined) updateData.wardCode = dto.wardCode || null;
      if (dto.wardName !== undefined) updateData.wardName = dto.wardName || null;
      if (dto.fullAddress !== undefined) updateData.fullAddress = dto.fullAddress || null;

      this.logger.debug(`Updating warehouse ${id}:`, updateData);

      const result = await this.prisma.propertyWarehouse.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      this.logger.debug(`Warehouse updated:`, result);
      return result;
    } catch (error: any) {
      this.logger.error(`Error updating warehouse:`, error);
      
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã kho hàng đã tồn tại trong workspace này');
      }
      if (error.code === 'P2025') {
        throw new BadRequestException('Kho hàng không tồn tại');
      }
      
      throw new InternalServerErrorException(`Failed to update warehouse: ${error.message}`);
    }
  }

  async delete(id: string, workspaceId: string) {
    return this.prisma.propertyWarehouse.delete({
      where: { id },
    });
  }
}
