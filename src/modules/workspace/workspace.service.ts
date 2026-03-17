import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  // In-memory cache for province+ward data (refreshed every 24h)
  private _provinceCache: Array<{
    code: number;
    name: string;
    wards: Array<{ code: number; name: string }>;
  }> | null = null;
  private _provinceCacheTime = 0;

  async findWorkspacesByUserId(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { userId, status: 1 },
      include: { workspace: true, role: true },
    });
  }

  async findMembership(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 1 },
      include: { role: true },
    });
  }

  async listWorkspaceMembers(workspaceId: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      workspaceId,
      status: 1, // only active members
    };

    // If search is provided, search in phone, email, fullName or displayName
    if (search && search.trim()) {
      where.OR = [
        { displayName: { contains: search.trim() } },
        { workspaceEmail: { contains: search.trim() } },
        { workspacePhone: { contains: search.trim() } },
        {
          user: {
            OR: [
              { phone: { contains: search.trim() } },
              { email: { contains: search.trim() } },
              { fullName: { contains: search.trim() } },
            ],
          },
        },
      ];
    }

    const [members, total] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where,
        include: {
          user: { select: { id: true, phone: true, email: true, fullName: true } },
          role: { select: { id: true, code: true, name: true } },
        },
        orderBy: { joinedAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.workspaceMember.count({ where }),
    ]);

    const data = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      roleId: m.roleId,
      status: m.status,
      joinedAt: m.joinedAt,
      employeeCode: m.employeeCode,
      displayName: m.displayName,
      workspaceEmail: m.workspaceEmail,
      workspacePhone: m.workspacePhone,
      avatarUrl: m.avatarUrl,
      gender: m.gender,
      dateOfBirth: m.dateOfBirth,
      workspaceCity: m.workspaceCity,
      workspaceAddress: m.workspaceAddress,
      addressLine: m.addressLine,
      contractType: m.contractType,
      attachmentUrl: m.attachmentUrl,
      user: m.user,
      role: m.role,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateMember(workspaceId: string, memberId: string, dto: UpdateMemberDto) {
    // Check if member exists in this workspace
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new Error('Member not found in this workspace');
    }

    // If updating role, verify role exists
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new Error('Role not found');
      }
    }

    // Auto-generate employeeCode if member doesn't have one yet
    let employeeCode: string | undefined;
    if (!member.employeeCode) {
      employeeCode = await this.generateNextEmployeeCode(workspaceId);
    }

    // Update member
    const updateData: Record<string, unknown> = {};
    if (employeeCode) updateData.employeeCode = employeeCode;
    if (dto.roleId !== undefined) updateData.roleId = dto.roleId;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.workspaceEmail !== undefined) updateData.workspaceEmail = dto.workspaceEmail;
    if (dto.workspacePhone !== undefined) updateData.workspacePhone = dto.workspacePhone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.dateOfBirth !== undefined)
      updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth as string) : null;
    if (dto.workspaceCity !== undefined) updateData.workspaceCity = dto.workspaceCity;
    if (dto.workspaceAddress !== undefined) updateData.workspaceAddress = dto.workspaceAddress;
    if (dto.addressLine !== undefined) updateData.addressLine = dto.addressLine;
    if (dto.contractType !== undefined) updateData.contractType = dto.contractType;
    if (dto.attachmentUrl !== undefined) updateData.attachmentUrl = dto.attachmentUrl;

    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: { select: { id: true, phone: true, email: true, fullName: true } },
        role: { select: { id: true, code: true, name: true } },
      },
    });

    return {
      data: {
        id: updated.id,
        userId: updated.userId,
        workspaceId: updated.workspaceId,
        roleId: updated.roleId,
        status: updated.status,
        joinedAt: updated.joinedAt,
        employeeCode: updated.employeeCode,
        displayName: updated.displayName,
        workspaceEmail: updated.workspaceEmail,
        workspacePhone: updated.workspacePhone,
        avatarUrl: updated.avatarUrl,
        gender: updated.gender,
        dateOfBirth: updated.dateOfBirth,
        workspaceCity: updated.workspaceCity,
        workspaceAddress: updated.workspaceAddress,
        addressLine: updated.addressLine,
        contractType: updated.contractType,
        attachmentUrl: updated.attachmentUrl,
        user: updated.user,
        role: updated.role,
      },
    };
  }

  async addMember(workspaceId: string, dto: AddMemberDto) {
    // Type-safe DTO properties
    const phone = dto.phone as string;
    const roleId = dto.roleId as string;
    const displayName = (dto.displayName as string | undefined) || undefined;
    const workspaceEmail = (dto.workspaceEmail as string | undefined) || undefined;
    const workspacePhone = (dto.workspacePhone as string | undefined) || undefined;
    const contractType = (dto.contractType as string | undefined) || undefined;

    // Find user by phone
    let user = await this.prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      // Phone doesn't exist — check if email conflicts before creating
      if (workspaceEmail) {
        const emailConflict = await this.prisma.user.findFirst({
          where: { email: workspaceEmail },
        });
        if (emailConflict) {
          throw new HttpException(
            {
              code: 'EMAIL_ALREADY_EXISTS',
              message: `Email "${workspaceEmail}" đã được sử dụng bởi tài khoản khác`,
            },
            HttpStatus.CONFLICT,
          );
        }
      }

      // Create a new user account with minimal info
      user = await this.prisma.user.create({
        data: {
          phone,
          fullName: displayName || null,
          email: workspaceEmail || null,
          status: 1,
        },
      });
    } else {
      // User exists — check if they're trying to add with a conflicting email
      if (workspaceEmail && user.email && user.email !== workspaceEmail) {
        // The existing user has a different email, check if that email belongs to another user
        const emailConflict = await this.prisma.user.findFirst({
          where: { email: workspaceEmail, NOT: { id: user.id } },
        });
        if (emailConflict) {
          throw new HttpException(
            {
              code: 'EMAIL_ALREADY_EXISTS',
              message: `Email "${workspaceEmail}" đã được sử dụng bởi tài khoản khác`,
            },
            HttpStatus.CONFLICT,
          );
        }
      }
    }

    // Check if already a member (active or inactive)
    const existing = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });

    if (existing) {
      throw new HttpException(
        {
          code: 'ALREADY_MEMBER',
          message: `SĐT ${phone} đã là thành viên của workspace này`,
        },
        HttpStatus.CONFLICT,
      );
    }

    // Verify role
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new HttpException(
        { code: 'ROLE_NOT_FOUND', message: 'Vai trò không tồn tại' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Generate employee code
    const employeeCode = await this.generateNextEmployeeCode(workspaceId);

    const createData = {
      workspaceId,
      userId: user.id,
      roleId,
      employeeCode,
      displayName: displayName || user.fullName,
      workspaceEmail: workspaceEmail || null,
      workspacePhone: workspacePhone || phone,
      contractType: contractType || null,
      status: 1,
      joinedAt: new Date(),
    };

    const member = await this.prisma.workspaceMember.create({
      data: createData,
      include: {
        user: { select: { id: true, phone: true, email: true, fullName: true } },
        role: { select: { id: true, code: true, name: true } },
      },
    });

    const memberWithRelations = member as typeof member & {
      user?: { id: string; phone: string; email: string | null; fullName: string | null };
      role?: { id: string; code: string; name: string };
    };

    return {
      data: {
        id: member.id,
        userId: member.userId,
        workspaceId: member.workspaceId,
        roleId: member.roleId,
        status: member.status,
        joinedAt: member.joinedAt,
        employeeCode: member.employeeCode,
        displayName: member.displayName,
        workspaceEmail: member.workspaceEmail,
        workspacePhone: member.workspacePhone,
        user: memberWithRelations.user,
        role: memberWithRelations.role,
      },
    };
  }

  async exportMembersExcel(workspaceId: string): Promise<Buffer> {
    const [members, hdldCatalog] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: { select: { phone: true, email: true, fullName: true } },
          role: { select: { code: true, name: true, description: true } },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.catalog.findFirst({
        where: { workspaceId, code: 'HDLD_TYPE' },
        include: { values: true },
      }),
    ]);

    // Build label map: code → label (e.g. THU_VIEC → 'Thử việc')
    const contractCodeToLabel = new Map<string, string>();
    if (hdldCatalog?.values) {
      (hdldCatalog.values as Array<{ value: string; label: string }>).forEach((v) =>
        contractCodeToLabel.set(v.value, v.label),
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nhân sự');

    sheet.columns = [
      { header: 'Mã NV', key: 'employeeCode', width: 12 },
      { header: 'Tên hiển thị', key: 'displayName', width: 25 },
      { header: 'SĐT', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Vai trò', key: 'role', width: 22 },
      { header: 'Hợp đồng lao động', key: 'contractType', width: 20 },
      { header: 'Tỉnh/Thành phố', key: 'city', width: 20 },
      { header: 'Phường/Xã', key: 'ward', width: 20 },
      { header: 'Địa chỉ', key: 'address', width: 30 },
      { header: 'Ngày sinh', key: 'dateOfBirth', width: 16 },
      { header: 'Giới tính', key: 'gender', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Ngày tham gia', key: 'joinedAt', width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    } as ExcelJS.Fill;

    members.forEach((m) => {
      sheet.addRow({
        employeeCode: m.employeeCode || '',
        displayName: m.displayName || m.user.fullName || '',
        phone: m.workspacePhone || m.user.phone || '',
        email: m.workspaceEmail || m.user.email || '',
        role: m.role.description || m.role.name,
        contractType: m.contractType
          ? (contractCodeToLabel.get(m.contractType) ?? m.contractType)
          : '',
        city: m.workspaceCity || '',
        ward: m.workspaceAddress || '',
        address: m.addressLine || '',
        dateOfBirth: m.dateOfBirth ? m.dateOfBirth.toISOString().split('T')[0] : '',
        gender: m.gender === 'MALE' ? 'Nam' : m.gender === 'FEMALE' ? 'Nữ' : '',
        status: m.status === 1 ? 'Hoạt động' : 'Vô hiệu',
        joinedAt: m.joinedAt.toISOString().split('T')[0],
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getMembersTemplate(workspaceId: string): Promise<Buffer> {
    // Helper: column number → Excel letter (1=A, 26=Z, 27=AA, ...)
    const colNumToLetter = (n: number): string => {
      let result = '';
      let num = n;
      while (num > 0) {
        const r = (num - 1) % 26;
        result = String.fromCharCode(65 + r) + result;
        num = Math.floor((num - 1) / 26);
      }
      return result;
    };

    const [roles, hdldCatalog] = await Promise.all([
      this.prisma.role.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.catalog.findFirst({
        where: { workspaceId, code: 'HDLD_TYPE' },
        include: { values: true },
      }),
    ]);

    const hdldValues = (hdldCatalog?.values as Array<{ value: string; label: string }>) ?? [];

    // Fetch provinces with wards — in-memory cache (24h TTL)
    const now = Date.now();
    if (!this._provinceCache || now - this._provinceCacheTime > 24 * 60 * 60 * 1000) {
      try {
        const resp = await fetch('https://provinces.open-api.vn/api/v2/?depth=2', {
          signal: AbortSignal.timeout(10000),
        });
        const data = (await resp.json()) as Array<{
          code: number;
          name: string;
          wards?: Array<{ code: number; name: string }>;
        }>;
        this._provinceCache = (data || []).map((p) => ({
          code: p.code,
          name: p.name,
          wards: (p.wards || []).map((w) => ({ code: w.code, name: w.name })),
        }));
        this._provinceCacheTime = now;
      } catch {
        this._provinceCache = [];
      }
    }
    const provinces = this._provinceCache;

    const workbook = new ExcelJS.Workbook();

    // ===== Sheet 1: Nhân sự (main import sheet) =====
    const sheet = workbook.addWorksheet('Nhân sự');

    sheet.columns = [
      { header: 'SĐT (*)', key: 'phone', width: 16 },
      { header: 'Tên hiển thị', key: 'displayName', width: 25 },
      { header: 'Email workspace', key: 'email', width: 30 },
      { header: 'Vai trò', key: 'role', width: 25 },
      { header: 'Hợp đồng lao động', key: 'contractType', width: 22 },
      { header: 'Tỉnh/Thành phố', key: 'city', width: 20 },
      { header: 'Phường/Xã', key: 'ward', width: 20 },
      { header: 'Địa chỉ', key: 'address', width: 30 },
      { header: 'Ngày sinh (YYYY-MM-DD)', key: 'dateOfBirth', width: 24 },
      { header: 'Giới tính', key: 'gender', width: 12 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    } as ExcelJS.Fill;

    // ── Sample row at row 2, set BEFORE the validation loop so it stays at row 2 ──
    const sampleRole = roles.find((r) => r.code === 'SALES') ?? roles[0];
    const sampleRoleLabel = sampleRole?.description || sampleRole?.name || '';
    const sampleProvince = provinces[0];
    const sampleWard = sampleProvince?.wards?.[0];
    const sampleRow = sheet.getRow(2);
    sampleRow.getCell(1).value = '0912345678';
    sampleRow.getCell(2).value = 'Nguyễn Văn A';
    sampleRow.getCell(3).value = 'nguyenvana@company.com';
    sampleRow.getCell(4).value = sampleRoleLabel;
    sampleRow.getCell(5).value = hdldValues[0]?.label ?? '';
    sampleRow.getCell(6).value = sampleProvince?.name ?? 'Hà Nội';
    sampleRow.getCell(7).value = sampleWard?.name ?? '';
    sampleRow.getCell(8).value = '123 Đường ABC, Quận 1';
    sampleRow.getCell(9).value = '1990-01-15';
    sampleRow.getCell(10).value = 'Nam';

    // Data validation dropdowns (rows 2–501)
    for (let r = 2; r <= 501; r++) {
      if (roles.length > 0) {
        sheet.getCell(`D${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`DanhMuc!$A$2:$A$${roles.length + 1}`],
        };
      }
      if (hdldValues.length > 0) {
        sheet.getCell(`E${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`DanhMuc!$B$2:$B$${hdldValues.length + 1}`],
        };
      }
      if (provinces.length > 0) {
        sheet.getCell(`F${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`DanhMuc!$C$2:$C$${provinces.length + 1}`],
        };
        // Ward dropdown depends on the province chosen in column F
        sheet.getCell(`G${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`INDIRECT("P"&MATCH(F${r},DanhMuc!$C$2:$C$${provinces.length + 1},0))`],
        };
      }
      sheet.getCell(`J${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`DanhMuc!$D$2:$D$3`],
      };
    }

    // ===== Sheet 2: DanhMuc (hidden reference data for dropdowns) =====
    const dataSheet = workbook.addWorksheet('DanhMuc');
    dataSheet.state = 'hidden';

    dataSheet.getCell('A1').value = 'Vai trò';
    dataSheet.getCell('B1').value = 'Hợp đồng';
    dataSheet.getCell('C1').value = 'Tỉnh/Thành phố';
    dataSheet.getCell('D1').value = 'Giới tính';

    // Column A: Role labels (use description for Vietnamese name, fallback to name)
    roles.forEach((role, i) => {
      dataSheet.getCell(`A${i + 2}`).value = role.description || role.name;
    });

    // Column B: HDLD labels
    hdldValues.forEach((v, i) => {
      dataSheet.getCell(`B${i + 2}`).value = v.label;
    });

    // Column C: Province names; columns E+ each hold that province's wards
    const WARD_START_COL = 5; // Column E
    provinces.forEach((p, pIdx) => {
      dataSheet.getCell(`C${pIdx + 2}`).value = p.name;
      if (p.wards.length > 0) {
        const colIdx = WARD_START_COL + pIdx;
        const colLetter = colNumToLetter(colIdx);
        p.wards.forEach((w, wIdx) => {
          dataSheet.getRow(wIdx + 2).getCell(colIdx).value = w.name;
        });
        // Named range P{n} used by INDIRECT formula in main sheet column G
        workbook.definedNames.add(
          `DanhMuc!$${colLetter}$2:$${colLetter}$${p.wards.length + 1}`,
          `P${pIdx + 1}`,
        );
      }
    });

    // Column D: Gender options
    dataSheet.getCell('D2').value = 'Nam';
    dataSheet.getCell('D3').value = 'Nữ';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─────────────────────────────────────────────────────────────
  // Shared parse helper — used by preview AND import
  // ─────────────────────────────────────────────────────────────
  private async _buildImportLookups(workspaceId: string) {
    const roles = await this.prisma.role.findMany();
    const roleByCode = new Map<string, string>(roles.map((r) => [r.code.toUpperCase(), r.id]));
    const roleByName = new Map<string, string>(
      roles.map((r) => [r.name.toLowerCase().trim(), r.id]),
    );
    const roleByDesc = new Map<string, string>(
      roles.filter((r) => r.description).map((r) => [r.description!.toLowerCase().trim(), r.id]),
    );
    const roleById = new Map<string, string>(roles.map((r) => [r.id, r.description || r.name]));
    const defaultRoleId = roles.find((r) => r.code === 'SALES')?.id || roles[0]?.id;

    const hdldCatalog = await this.prisma.catalog.findFirst({
      where: { workspaceId, code: 'HDLD_TYPE' },
      include: { values: true },
    });
    const hdldLabelToCode = new Map<string, string>();
    const hdldCodeToLabel = new Map<string, string>();
    if (hdldCatalog?.values) {
      (hdldCatalog.values as Array<{ value: string; label: string }>).forEach((v) => {
        hdldLabelToCode.set(v.label.toLowerCase().trim(), v.value);
        hdldLabelToCode.set(v.value.toLowerCase().trim(), v.value);
        hdldCodeToLabel.set(v.value, v.label);
      });
    }

    return {
      roles,
      roleByCode,
      roleByName,
      roleByDesc,
      roleById,
      defaultRoleId,
      hdldLabelToCode,
      hdldCodeToLabel,
    };
  }

  private _parseRow(
    row: ExcelJS.Row,
    lookups: Awaited<ReturnType<WorkspaceService['_buildImportLookups']>>,
  ) {
    const phone = String(row.getCell(1).value ?? '').trim();
    const displayName = String(row.getCell(2).value ?? '').trim();
    const email = String(row.getCell(3).value ?? '').trim();
    const roleRaw = String(row.getCell(4).value ?? '').trim();
    const contractTypeRaw = String(row.getCell(5).value ?? '').trim();
    const city = String(row.getCell(6).value ?? '').trim();
    const ward = String(row.getCell(7).value ?? '').trim();
    const address = String(row.getCell(8).value ?? '').trim();
    const dateOfBirth = String(row.getCell(9).value ?? '').trim();
    const genderRaw = String(row.getCell(10).value ?? '').trim();

    const {
      roleByDesc,
      roleByName,
      roleByCode,
      roleById,
      defaultRoleId,
      hdldLabelToCode,
      hdldCodeToLabel,
    } = lookups;

    const roleId =
      roleByDesc.get(roleRaw.toLowerCase()) ??
      roleByName.get(roleRaw.toLowerCase()) ??
      roleByCode.get(roleRaw.toUpperCase()) ??
      defaultRoleId;

    const contractTypeCode = contractTypeRaw
      ? (hdldLabelToCode.get(contractTypeRaw.toLowerCase()) ?? contractTypeRaw)
      : undefined;
    const contractTypeLabel = contractTypeCode
      ? (hdldCodeToLabel.get(contractTypeCode) ?? contractTypeCode)
      : '';

    const gender =
      genderRaw === 'Nam'
        ? 'MALE'
        : genderRaw === 'Nữ'
          ? 'FEMALE'
          : genderRaw === 'MALE' || genderRaw === 'FEMALE'
            ? genderRaw
            : undefined;
    const genderLabel = gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : '';

    const resolvedRoleLabel = roleId ? (roleById.get(roleId) ?? roleRaw) : roleRaw;

    return {
      phone,
      displayName,
      email,
      roleRaw,
      roleId,
      resolvedRoleLabel,
      contractTypeCode,
      contractTypeLabel,
      city,
      ward,
      address,
      dateOfBirth,
      genderRaw,
      gender,
      genderLabel,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Preview import (no writes) — validates and returns rows
  // ─────────────────────────────────────────────────────────────
  async previewMembersImport(
    workspaceId: string,
    fileBuffer: Buffer,
  ): Promise<{
    rows: Array<{
      rowNumber: number;
      phone: string;
      displayName: string;
      email: string;
      role: string;
      contractType: string;
      city: string;
      ward: string;
      address: string;
      dateOfBirth: string;
      gender: string;
      action: 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';
      errorMessage?: string;
      existingName?: string;
    }>;
    summary: { create: number; update: number; skip: number; errors: number };
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];

    const lookups = await this._buildImportLookups(workspaceId);

    const rows: Array<{
      rowNumber: number;
      phone: string;
      displayName: string;
      email: string;
      role: string;
      contractType: string;
      city: string;
      ward: string;
      address: string;
      dateOfBirth: string;
      gender: string;
      action: 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';
      errorMessage?: string;
      existingName?: string;
    }> = [];

    const rowsToProcess: Array<{ row: ExcelJS.Row; rowNumber: number }> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rowsToProcess.push({ row, rowNumber });
    });

    for (const { row, rowNumber } of rowsToProcess) {
      const parsed = this._parseRow(row, lookups);

      if (!parsed.phone) {
        rows.push({
          rowNumber,
          phone: '',
          displayName: parsed.displayName,
          email: parsed.email,
          role: parsed.resolvedRoleLabel,
          contractType: parsed.contractTypeLabel,
          city: parsed.city,
          ward: parsed.ward,
          address: parsed.address,
          dateOfBirth: parsed.dateOfBirth,
          gender: parsed.genderLabel,
          action: 'SKIP',
          errorMessage: 'Không có SĐT',
        });
        continue;
      }

      try {
        const user = await this.prisma.user.findFirst({ where: { phone: parsed.phone } });
        const existing = user
          ? await this.prisma.workspaceMember.findFirst({
              where: { workspaceId, userId: user.id },
              include: { user: { select: { fullName: true } } },
            })
          : null;

        const action = existing ? 'UPDATE' : 'CREATE';
        const existingName = existing
          ? existing.displayName || (existing.user as { fullName?: string | null })?.fullName || ''
          : undefined;

        rows.push({
          rowNumber,
          phone: parsed.phone,
          displayName: parsed.displayName || existingName || '',
          email: parsed.email,
          role: parsed.resolvedRoleLabel,
          contractType: parsed.contractTypeLabel,
          city: parsed.city,
          ward: parsed.ward,
          address: parsed.address,
          dateOfBirth: parsed.dateOfBirth,
          gender: parsed.genderLabel,
          action,
          existingName,
        });
      } catch {
        rows.push({
          rowNumber,
          phone: parsed.phone,
          displayName: parsed.displayName,
          email: parsed.email,
          role: parsed.resolvedRoleLabel,
          contractType: parsed.contractTypeLabel,
          city: parsed.city,
          ward: parsed.ward,
          address: parsed.address,
          dateOfBirth: parsed.dateOfBirth,
          gender: parsed.genderLabel,
          action: 'ERROR',
          errorMessage: 'Lỗi đọc dữ liệu',
        });
      }
    }

    const summary = {
      create: rows.filter((r) => r.action === 'CREATE').length,
      update: rows.filter((r) => r.action === 'UPDATE').length,
      skip: rows.filter((r) => r.action === 'SKIP').length,
      errors: rows.filter((r) => r.action === 'ERROR').length,
    };

    return { rows, summary };
  }

  async importMembersExcel(
    workspaceId: string,
    fileBuffer: Buffer,
  ): Promise<{
    success: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];

    let success = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    const lookups = await this._buildImportLookups(workspaceId);

    const rowsToProcess: Array<{ row: ExcelJS.Row; rowNumber: number }> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rowsToProcess.push({ row, rowNumber });
    });

    for (const { row, rowNumber } of rowsToProcess) {
      const parsed = this._parseRow(row, lookups);
      const {
        phone,
        displayName,
        email,
        roleId,
        contractTypeCode: contractType,
        city,
        ward,
        address,
        dateOfBirth,
        gender,
        roleRaw,
      } = parsed;

      if (!phone) {
        skipped++;
        continue;
      }

      try {
        let user = await this.prisma.user.findFirst({ where: { phone } });
        if (!user) {
          // Auto-create account (same logic as addMember)
          user = await this.prisma.user.create({
            data: {
              phone,
              fullName: displayName || null,
              email: email || null,
              status: 1,
            },
          });
        }

        const existing = await this.prisma.workspaceMember.findFirst({
          where: { workspaceId, userId: user.id },
        });

        if (existing) {
          // Update existing member info
          await this.prisma.workspaceMember.update({
            where: { id: existing.id },
            data: {
              ...(displayName && { displayName }),
              ...(email && { workspaceEmail: email }),
              ...(contractType && { contractType }),
              ...(city && { workspaceCity: city }),
              ...(ward && { workspaceAddress: ward }),
              ...(address && { addressLine: address }),
              ...(gender && { gender }),
              ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
            },
          });
        } else {
          // Add as new member
          if (!roleId) {
            errors.push({ row: rowNumber, message: `Không tìm thấy vai trò "${roleRaw}"` });
            continue;
          }

          const employeeCode = await this.generateNextEmployeeCode(workspaceId);

          await this.prisma.workspaceMember.create({
            data: {
              workspaceId,
              userId: user.id,
              roleId,
              employeeCode,
              displayName: displayName || user.fullName,
              workspaceEmail: email || undefined,
              workspacePhone: phone,
              contractType: contractType || undefined,
              workspaceCity: city || undefined,
              workspaceAddress: ward || undefined,
              addressLine: address || undefined,
              ...(gender && { gender }),
              ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
              status: 1,
              joinedAt: new Date(),
            },
          });
        }

        success++;
      } catch {
        errors.push({ row: rowNumber, message: `Lỗi xử lý dòng ${rowNumber}` });
      }
    }

    return { success, skipped, errors };
  }

  private async generateNextEmployeeCode(workspaceId: string): Promise<string> {
    const latest = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, employeeCode: { not: null } },
      orderBy: { employeeCode: 'desc' },
    });

    let nextNum = 1;
    if (latest?.employeeCode) {
      const match = latest.employeeCode.match(/NV(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return `NV${String(nextNum).padStart(3, '0')}`;
  }

  async uploadMemberAvatar(workspaceId: string, memberId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        { code: 'FILE_REQUIRED', message: 'Avatar file is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new HttpException(
        { code: 'INVALID_FILE_TYPE', message: 'Only image files are allowed' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Maximum file size is 5MB' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if member exists
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new HttpException(
        { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this workspace' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Upload to MinIO using workspace-scoped avatar path
    const uploaded = await this.minioService.uploadAvatar(workspaceId, member.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    } as Parameters<typeof this.minioService.uploadAvatar>[2]);

    // Update member with new avatar URL
    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { avatarUrl: uploaded.fileUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return {
      data: {
        avatarUrl: updated.avatarUrl,
        objectKey: uploaded.objectKey,
      },
    };
  }
}
