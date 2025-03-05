import { Injectable } from '@nestjs/common';

import { AuditActionType, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    actionType: AuditActionType,
    performedById: string,
    affectedUserId?: string,
    entityType?: string,
    entityId?: string,
    oldState?: Prisma.JsonObject | null,
    newState?: Prisma.JsonObject | null,
    ipAddress?: string,
    userAgent?: string,
    details?: object,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    await prisma.auditLog.create({
      data: {
        actionType,
        performedById,
        affectedUserId,
        entityType,
        entityId,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: details as Prisma.JsonObject,
      },
    });
  }
}