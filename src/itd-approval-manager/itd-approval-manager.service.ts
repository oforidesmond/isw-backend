import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { AuditService } from 'audit/audit.service';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ItdApprovalManagerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  )
{} 

async approveRequisition(requisitionId: string, approverId: string, ipAddress?: string, userAgent?: string) {
  return this.prisma.$transaction(async (tx) => {
    const requisition = await tx.requisition.findUnique({
      where: { id: requisitionId },
    });
    if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
    if (requisition.deletedAt) throw new BadRequestException(`Requisition ${requisitionId} is deleted`);
    if (requisition.status !== 'PENDING_ITD_APPROVAL') throw new BadRequestException(`ITD approval already processed or not ready`);

    if (requisition.itdApproverId !== approverId) {
      throw new BadRequestException(`You are not the ITD approver for this requisition`);
    }

    const oldState: Prisma.JsonObject = { status: requisition.status };
    const updatedRequisition = await tx.requisition.update({
      where: { id: requisitionId },
      data: { status: 'ITD_APPROVED' },
    });
    const newState: Prisma.JsonObject = { status: updatedRequisition.status };

    const auditPayload: AuditPayload = {
      actionType: 'REQUISITION_ITD_APPROVED',
      performedById: approverId,
      affectedUserId: requisition.staffId,
      entityType: 'Requisition',
      entityId: requisitionId,
      oldState,
      newState,
      ipAddress,
      userAgent,
      details: { itItemId: requisition.itItemId },
    };

    await this.auditService.logAction(auditPayload, tx);
    return { message: `Requisition ${requisitionId} approved by ITD` };
  });
}

async declineRequisition(requisitionId: string, approverId: string, reason: string, ipAddress?: string, userAgent?: string) {

  if (!reason) throw new BadRequestException('Decline reason is required');

  return this.prisma.$transaction(async (tx) => {
    const requisition = await tx.requisition.findUnique({
      where: { id: requisitionId },
    });
    if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
    if (requisition.deletedAt) throw new BadRequestException(`Requisition ${requisitionId} is deleted`);
    if (requisition.status !== 'PENDING_ITD_APPROVAL') throw new BadRequestException(`ITD approval already processed or not ready`);

    if (requisition.itdApproverId !== approverId) {
      throw new BadRequestException(`You are not the ITD approver for this requisition`);
    }

    const oldState: Prisma.JsonObject = { status: requisition.status };
    const updatedRequisition = await tx.requisition.update({
      where: { id: requisitionId },
      data: { status: 'ITD_DECLINED', declineReason: reason },
    });
    const newState: Prisma.JsonObject = { status: updatedRequisition.status, declineReason: updatedRequisition.declineReason };

    const auditPayload: AuditPayload = {
      actionType: 'REQUISITION_ITD_DECLINED',
      performedById: approverId,
      affectedUserId: requisition.staffId,
      entityType: 'Requisition',
      entityId: requisitionId,
      oldState,
      newState,
      ipAddress,
      userAgent,
      details: { itItemId: requisition.itItemId },
    };

    await this.auditService.logAction(auditPayload, tx);
    return { message: `Requisition ${requisitionId} declined by ITD` };
  });
}
}
