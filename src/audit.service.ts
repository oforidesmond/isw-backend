import { Injectable } from '@nestjs/common';

import { AuditActionType } from '@prisma/client';
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
    oldState?: object,
    newState?: object,
    ipAddress?: string,
    userAgent?: string,
    details?: object,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actionType,
        performedById,
        affectedUserId,
        entityType,
        entityId,
        oldState: oldState ? JSON.stringify(oldState) : null,
        newState: newState ? JSON.stringify(newState) : null,
        ipAddress,
        userAgent,
        details: details ? JSON.stringify(details) : null,
      },
    });
  }
}