import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  SaveCustomFieldValuesDto,
} from './dto/index';

@Injectable()
export class CustomFieldService {
  constructor(private readonly prisma: PrismaService) {}

  // ===================== DEFINITIONS =====================

  async listDefinitions(workspaceId: string, entity: string) {
    const rows = await this.prisma.customFieldDefinition.findMany({
      where: { workspaceId, entity, active: true },
      orderBy: { order: 'asc' },
    });
    return { data: rows };
  }

  async createDefinition(workspaceId: string, dto: CreateCustomFieldDefinitionDto) {
    // Sanitise fieldKey: lowercase, no spaces
    const fieldKey = dto.fieldKey
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    if (!fieldKey) throw new ConflictException('fieldKey is invalid');

    const existing = await this.prisma.customFieldDefinition.findUnique({
      where: { workspaceId_entity_fieldKey: { workspaceId, entity: dto.entity, fieldKey } },
    });
    if (existing)
      throw new ConflictException(`Field "${fieldKey}" already exists for ${dto.entity}`);

    const row = await this.prisma.customFieldDefinition.create({
      data: {
        workspaceId,
        entity: dto.entity,
        fieldKey,
        label: dto.label,
        fieldType: dto.fieldType,
        required: dto.required ?? false,
        maxLength: dto.maxLength ?? null,
        catalogCode: dto.catalogCode ?? null,
        order: dto.order ?? 0,
      },
    });
    return { data: row };
  }

  async updateDefinition(workspaceId: string, id: string, dto: UpdateCustomFieldDefinitionDto) {
    const existing = await this.prisma.customFieldDefinition.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Custom field definition not found');

    const row = await this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.fieldType !== undefined && { fieldType: dto.fieldType }),
        ...(dto.required !== undefined && { required: dto.required }),
        ...(dto.maxLength !== undefined && { maxLength: dto.maxLength }),
        ...(dto.catalogCode !== undefined && { catalogCode: dto.catalogCode }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    return { data: row };
  }

  async deleteDefinition(workspaceId: string, id: string) {
    const existing = await this.prisma.customFieldDefinition.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Custom field definition not found');

    // Delete all values linked to this field
    await this.prisma.customFieldValue.deleteMany({
      where: { workspaceId, entity: existing.entity, fieldKey: existing.fieldKey },
    });
    await this.prisma.customFieldDefinition.delete({ where: { id } });
    return { data: { success: true } };
  }

  // ===================== VALUES =====================

  async getValues(workspaceId: string, entity: string, entityId: string) {
    const rows = await this.prisma.customFieldValue.findMany({
      where: { workspaceId, entity, entityId },
    });
    // Return as key-value map
    const map: Record<string, string | null> = {};
    for (const r of rows) {
      map[r.fieldKey] = r.value;
    }
    return { data: map };
  }

  async saveValues(workspaceId: string, dto: SaveCustomFieldValuesDto) {
    const results: Array<{ fieldKey: string; value: string | null }> = [];

    for (const field of dto.fields) {
      await this.prisma.customFieldValue.upsert({
        where: {
          workspaceId_entity_entityId_fieldKey: {
            workspaceId,
            entity: dto.entity,
            entityId: dto.entityId,
            fieldKey: field.fieldKey,
          },
        },
        create: {
          workspaceId,
          entity: dto.entity,
          entityId: dto.entityId,
          fieldKey: field.fieldKey,
          value: field.value,
        },
        update: { value: field.value },
      });
      results.push(field);
    }

    return { data: results };
  }
}
