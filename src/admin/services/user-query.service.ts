import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditActionType, Prisma } from '@prisma/client';
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

  async getAuditLogs({
    actionType,
    entityType,
    startDate,
    endDate,
    skip = 0,
    take = 10,
  }: {
    actionType?: AuditActionType;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    if (skip < 0 || take < 1) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const where: Prisma.AuditLogWhereInput = {
      deletedAt: null,
      ...(actionType && { actionType }),
      ...(entityType && { entityType }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const auditLogs = await this.prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        actionType: true,
        performedBy: {
          select: {
            id: true,
            staffId: true,
            name: true,
            email: true,
          },
        },
        affectedUser: {
          select: {
            id: true,
            staffId: true,
            name: true,
            email: true,
          },
        },
        entityType: true,
        entityId: true,
        oldState: true,
        newState: true,
        ipAddress: true,
        userAgent: true,
        details: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    const total = await this.prisma.auditLog.count({ where });

    return {
      data: auditLogs,
      total,
      skip,
      take,
    };
  }
}