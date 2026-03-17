import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateProductDto, ListProductDto, UpdateProductDto } from './dto/index';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  private async canViewHiddenProducts(workspaceId: string, user: JwtPayload): Promise<boolean> {
    if (user.role === 'OWNER' || user.role === 'ADMIN') return true;

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.sub,
        status: 1,
      },
      select: {
        role: {
          select: {
            permissions: {
              where: {
                permission: { code: 'PRODUCT_VIEW_HIDDEN' },
              },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    return Boolean(membership?.role?.permissions?.length);
  }

  private collectPolicyImageUrls(items: unknown): string[] {
    if (!Array.isArray(items)) return [];

    return items
      .flatMap((item) => {
        if (typeof item === 'string') {
          return [item];
        }

        if (item && typeof item === 'object') {
          return [item.originalUrl, item.thumbnailUrl, item.fileUrl].filter((url): url is string =>
            Boolean(url && typeof url === 'string'),
          );
        }

        return [];
      })
      .filter(Boolean);
  }

  private collectProductDocumentUrls(items: unknown): string[] {
    if (!Array.isArray(items)) return [];

    return items
      .map((item) => item?.fileUrl)
      .filter((url): url is string => Boolean(url && typeof url === 'string'));
  }

  private async deleteRemovedFiles(previousUrls: string[], nextUrls: string[]) {
    const nextUrlSet = new Set(nextUrls);
    const removedUrls = [...new Set(previousUrls)].filter((url) => !nextUrlSet.has(url));

    this.logger.debug(
      `Cleanup diff - previous: ${previousUrls.length}, next: ${nextUrls.length}, removed: ${removedUrls.length}`,
    );

    await Promise.all(
      removedUrls.map(async (url) => {
        const objectKey = this.minioService.extractObjectKeyFromUrl(url);
        if (!objectKey) {
          this.logger.debug(`Skip cleanup for URL (cannot extract object key): ${url}`);
          return;
        }

        await this.minioService.deleteObject(objectKey);
        this.logger.debug(`Deleted MinIO object: ${objectKey}`);
      }),
    );

    if (removedUrls.length > 0) {
      this.logger.log(`Cleanup completed for removed files: ${removedUrls.length}`);
    }
  }

  async create(workspaceId: string, userId: string, dto: CreateProductDto) {
    try {
      this.logger.debug('Creating product with data:', JSON.stringify(dto));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {
        workspaceId,
        warehouseId: dto.warehouseId || null,
        createdByUserId: userId,
        name: dto.name,
        unitCode: dto.unitCode,
        tags: dto.tags || null,
        propertyType: dto.propertyType,
        zone: dto.zone || null,
        block: dto.block || null,
        direction: dto.direction || null,
        isContactForPrice: dto.isContactForPrice || false,
        isHidden: dto.isHidden || false,
        promotionProgram: dto.promotionProgram || null,
        policyImageUrls: dto.policyImageUrls || null,
        productDocuments: dto.productDocuments || null,
        callPhone: dto.callPhone || null,
        zaloPhone: dto.zaloPhone || null,
        contactMemberIds: dto.contactMemberIds || null,
        contacts: dto.contacts || null,
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
    } catch (error) {
      const err = error as {
        code?: string;
        message?: string;
        constructor?: { name?: string };
        stack?: string;
      };
      console.error('❌ CREATE PRODUCT ERROR:', error);
      this.logger.error('Create product error:', {
        code: err?.code,
        message: err?.message,
        prismaError: err?.constructor?.name,
        stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
      });
      if (err?.code === 'P2002') {
        throw new BadRequestException('Mã căn đã tồn tại trong workspace');
      }
      throw new InternalServerErrorException(err?.message || 'Failed to create product');
    }
  }

  async list(workspaceId: string, user: JwtPayload, opts?: ListProductDto) {
    const canViewHidden = await this.canViewHiddenProducts(workspaceId, user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId };
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search } },
        { unitCode: { contains: opts.search } },
        { propertyType: { contains: opts.search } },
        { zone: { contains: opts.search } },
        { block: { contains: opts.search } },
      ];
    }
    if (opts?.warehouseId) where.warehouseId = opts.warehouseId;
    if (opts?.transactionStatus) where.transactionStatus = opts.transactionStatus;
    if (!canViewHidden && !opts?.includeHidden) {
      where.isHidden = false;
    }

    const usePagination = opts?.page !== undefined || opts?.limit !== undefined;
    const resolvedPage = opts?.page ?? 1;
    const resolvedLimit = opts?.limit ?? 20;
    const skip = usePagination ? (resolvedPage - 1) * resolvedLimit : undefined;
    const take = usePagination ? resolvedLimit : undefined;

    const [items, total] = await Promise.all([
      this.prisma.propertyProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
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

    const meta = usePagination
      ? {
          total,
          page: resolvedPage,
          limit: resolvedLimit,
          totalPages: Math.ceil(total / resolvedLimit),
        }
      : { total };

    return { data: items, meta };
  }

  async findById(id: string, workspaceId: string, user: JwtPayload) {
    const canViewHidden = await this.canViewHiddenProducts(workspaceId, user);

    return this.prisma.propertyProduct.findFirstOrThrow({
      where: {
        id,
        workspaceId,
        ...(canViewHidden ? {} : { isHidden: false }),
      },
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
      select: {
        id: true,
        policyImageUrls: true,
        productDocuments: true,
      },
    });
    if (!existed) {
      throw new BadRequestException('Sản phẩm không tồn tại');
    }

    const previousPolicyImageUrls = this.collectPolicyImageUrls(existed.policyImageUrls);
    const previousProductDocumentUrls = this.collectProductDocumentUrls(existed.productDocuments);

    this.logger.debug(
      `Update product ${id} - previous policy images: ${previousPolicyImageUrls.length}, previous docs: ${previousProductDocumentUrls.length}`,
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {};

      if (dto.name !== undefined) data.name = dto.name;
      if (dto.unitCode !== undefined) data.unitCode = dto.unitCode;
      if (dto.tags !== undefined) data.tags = dto.tags || null;
      if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId || null;
      if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
      if (dto.zone !== undefined) data.zone = dto.zone || null;
      if (dto.block !== undefined) data.block = dto.block || null;
      if (dto.direction !== undefined) data.direction = dto.direction || null;
      if (dto.isContactForPrice !== undefined) data.isContactForPrice = dto.isContactForPrice;
      if (dto.isHidden !== undefined) data.isHidden = dto.isHidden;
      if (dto.promotionProgram !== undefined) data.promotionProgram = dto.promotionProgram || null;
      if (dto.policyImageUrls !== undefined) data.policyImageUrls = dto.policyImageUrls || null;
      if (dto.productDocuments !== undefined) data.productDocuments = dto.productDocuments || null;
      if (dto.callPhone !== undefined) data.callPhone = dto.callPhone || null;
      if (dto.zaloPhone !== undefined) data.zaloPhone = dto.zaloPhone || null;
      if (dto.contactMemberIds !== undefined) data.contactMemberIds = dto.contactMemberIds || null;
      if (dto.contacts !== undefined) data.contacts = dto.contacts || null;
      if (dto.transactionStatus !== undefined) data.transactionStatus = dto.transactionStatus;
      if (dto.note !== undefined) data.note = dto.note || null;

      if (dto.area !== undefined)
        data.area = dto.area !== null ? new Decimal(String(dto.area)) : null;
      if (dto.priceWithoutVat !== undefined) {
        data.priceWithoutVat =
          dto.priceWithoutVat !== null ? new Decimal(String(dto.priceWithoutVat)) : null;
      }
      if (dto.priceWithVat !== undefined) {
        data.priceWithVat =
          dto.priceWithVat !== null ? new Decimal(String(dto.priceWithVat)) : null;
      }

      const updated = await this.prisma.propertyProduct.update({
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

      const nextPolicyImageUrls = this.collectPolicyImageUrls(
        dto.policyImageUrls !== undefined ? dto.policyImageUrls : existed.policyImageUrls,
      );
      const nextProductDocumentUrls = this.collectProductDocumentUrls(
        dto.productDocuments !== undefined ? dto.productDocuments : existed.productDocuments,
      );

      this.logger.debug(
        `Update product ${id} - next policy images: ${nextPolicyImageUrls.length}, next docs: ${nextProductDocumentUrls.length}`,
      );

      await Promise.all([
        this.deleteRemovedFiles(previousPolicyImageUrls, nextPolicyImageUrls),
        this.deleteRemovedFiles(previousProductDocumentUrls, nextProductDocumentUrls),
      ]);

      return updated;
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'P2002') {
        throw new BadRequestException('Mã căn đã tồn tại trong workspace');
      }
      throw new InternalServerErrorException(err?.message || 'Failed to update product');
    }
  }

  async delete(id: string, workspaceId: string) {
    const existed = await this.prisma.propertyProduct.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        policyImageUrls: true,
        productDocuments: true,
      },
    });
    if (!existed) {
      throw new BadRequestException('Sản phẩm không tồn tại');
    }

    const policyImageUrls = this.collectPolicyImageUrls(existed.policyImageUrls);
    const productDocumentUrls = this.collectProductDocumentUrls(existed.productDocuments);

    this.logger.debug(
      `Delete product ${id} - policy images: ${policyImageUrls.length}, docs: ${productDocumentUrls.length}`,
    );

    const deletedProduct = await this.prisma.propertyProduct.delete({ where: { id } });

    await Promise.all([
      this.deleteRemovedFiles(policyImageUrls, []),
      this.deleteRemovedFiles(productDocumentUrls, []),
    ]);

    return deletedProduct;
  }

  async uploadFiles(workspaceId: string, files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('Khong co file de upload');
    }

    // Upload to temporary folder (will be cleaned up if product is not saved)
    const uploaded = await Promise.all(
      files.map((file) => this.minioService.uploadTemporaryFile(workspaceId, file)),
    );

    return uploaded.map((item, index) => ({
      fileName: files[index]?.originalname,
      fileUrl: item.fileUrl,
      objectKey: item.objectKey,
    }));
  }
}
