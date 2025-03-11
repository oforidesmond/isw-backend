// audit-payload.interface.ts

import { AuditActionType, Prisma } from '@prisma/client';

export interface AuditPayload {
  actionType: AuditActionType;
  performedById: string;
  affectedUserId?: string;
  entityType?: string;
  entityId?: string;
  oldState?: Prisma.JsonObject | null;
  newState?: Prisma.JsonObject | null;
  ipAddress?: string;
  userAgent?: string;
  details?: object;
  tx?: Prisma.TransactionClient;
}