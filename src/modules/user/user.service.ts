import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserDevice } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async createUser(data: {
    phone?: string;
    email?: string;
    googleId?: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async upsertDevice(
    userId: string,
    deviceHash: string,
    platform?: string,
  ): Promise<UserDevice> {
    return this.prisma.userDevice.upsert({
      where: { userId_deviceHash: { userId, deviceHash } },
      create: { userId, deviceHash, platform, lastActive: new Date() },
      update: { lastActive: new Date() },
    });
  }
}
