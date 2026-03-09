import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from './dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateWarehouseDto) {
    return this.prisma.propertyWarehouse.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        name: dto.name,
        code: dto.code,
        type: dto.type,
        description: dto.description,
        status: 1,
        latitude: dto.latitude,
        longitude: dto.longitude,
        provinceCode: dto.provinceCode,
        provinceName: dto.provinceName,
        wardCode: dto.wardCode,
        wardName: dto.wardName,
        fullAddress: dto.fullAddress,
      },
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
    return this.prisma.propertyWarehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.provinceCode !== undefined && { provinceCode: dto.provinceCode }),
        ...(dto.provinceName !== undefined && { provinceName: dto.provinceName }),
        ...(dto.wardCode !== undefined && { wardCode: dto.wardCode }),
        ...(dto.wardName !== undefined && { wardName: dto.wardName }),
        ...(dto.fullAddress !== undefined && { fullAddress: dto.fullAddress }),
      },
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

  async delete(id: string, workspaceId: string) {
    return this.prisma.propertyWarehouse.delete({
      where: { id },
    });
  }
}
