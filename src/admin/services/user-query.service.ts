import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';


@Injectable()
export class UserQueryService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        staffId: true,
        email: true,
        name: true,
        department: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        roomNo: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAllDeletedUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        staffId: true,
        email: true,
        name: true,
        department: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        roomNo: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByStaffId(staffId: string) {
    return this.prisma.user.findUnique({
      where: { staffId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
  }
}