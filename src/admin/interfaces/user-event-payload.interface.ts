import { Prisma } from '@prisma/client';

export interface UserEventPayload {
  userId: string;
  staffId: string;
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
  oldState?: Prisma.JsonObject;
  newState?: Prisma.JsonObject;
}