import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: string, payload: any) {
    return this.prisma.notification.create({
      data: { userId, type, payload: JSON.stringify(payload) },
    });
  }

  async list(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, payload: (() => {
      try { return JSON.parse(r.payload as unknown as string); } catch { return r.payload; }
    })() }));
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }
}
