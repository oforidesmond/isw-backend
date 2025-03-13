import { Injectable } from '@nestjs/common';

import { AuditActionType, Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(payload: AuditPayload, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;

    await prisma.auditLog.create({
      data: {
        actionType: payload.actionType,
        performedById: payload.performedById,
        affectedUserId: payload.affectedUserId ?? null, 
        entityType: payload.entityType,
        entityId: payload.entityId,
        oldState: payload.oldState ?? null,
        newState: payload.newState ?? null,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        details: payload.details as Prisma.JsonObject,
      },
    });
  }
}