import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { AuditService } from 'audit/audit.service';
import { Queue } from 'bull';
import { PrismaService } from 'prisma/prisma.service';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    itItemId?: string;
    emailsQueued: {
      submitter: boolean;
    };
  };
}

@Injectable()
export class ItdApprovalManagerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  )
{} 

async approveRequisition(requisitionId: string, approverId: string, ipAddress?: string, userAgent?: string) {
  return this.prisma.$transaction(async (tx) => {
    const requisition = await tx.requisition.findUnique({
      where: { id: requisitionId },
      include: { staff: { select: { email: true, name: true } } },
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

    const auditPayload: ExtendedAuditPayload = {
      actionType: 'REQUISITION_ITD_APPROVED',
      performedById: approverId,
      affectedUserId: requisition.staffId,
      entityType: 'Requisition',
      entityId: requisitionId,
      oldState,
      newState,
      ipAddress,
      userAgent,
      details: { itItemId: requisition.itItemId, emailsQueued: { submitter: false } },
    };

    // Notify submitter
    try {
      await this.emailQueue.add(
        'send-email',
        {
          to: requisition.staff.email,
          subject: `Requisition ${requisition.requisitionID} Approved by ITD`,
          html: `
            <p>Hello ${requisition.staff.name},</p>
            <p>Your requisition (${requisition.requisitionID}) has been fully approved by ITD.</p>
            <p>Expect further updates on processing.</p>
            <p>Thanks,<br>ISW Team</p>
          `,
        },
        { attempts: 3, backoff: 5000 },
      );
      auditPayload.details.emailsQueued.submitter = true;
    } catch (error) {
      console.error(`Failed to queue email for ${requisition.staff.email}:`, error.message);
      auditPayload.details.emailsQueued.submitter = false;
    }

    await this.auditService.logAction(auditPayload, tx);

    if (!auditPayload.details.emailsQueued.submitter) {
      throw new BadRequestException(`Requisition ${requisitionId} approved, but email failed to queue`);
    }

    return { message: `Requisition ${requisitionId} approved by ITD and email queued` };
  });
}

async declineRequisition(requisitionId: string, approverId: string, reason: string, ipAddress?: string, userAgent?: string) {

  if (!reason) throw new BadRequestException('Decline reason is required');

  return this.prisma.$transaction(async (tx) => {
    const requisition = await tx.requisition.findUnique({
      where: { id: requisitionId },
      include: { staff: { select: { email: true, name: true } } },
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

    const auditPayload: ExtendedAuditPayload = {
      actionType: 'REQUISITION_ITD_DECLINED',
      performedById: approverId,
      affectedUserId: requisition.staffId,
      entityType: 'Requisition',
      entityId: requisitionId,
      oldState,
      newState,
      ipAddress,
      userAgent,
      details: { itItemId: requisition.itItemId, emailsQueued: { submitter: false } },
    };

    // Notify submitter
    try {
      await this.emailQueue.add(
        'send-email',
        {
          to: requisition.staff.email,
          subject: `Requisition ${requisition.requisitionID} Declined by ITD`,
          html: `
            <p>Hello ${requisition.staff.name},</p>
            <p>Your requisition (${requisition.requisitionID}) has been declined by ITD.</p>
            <p>Reason: ${reason}</p>
            <p>Please contact us if you have questions.</p>
            <p>Thanks,<br>ISW Team</p>
          `,
        },
        { attempts: 3, backoff: 5000 },
      );
      auditPayload.details.emailsQueued.submitter = true;
    } catch (error) {
      console.error(`Failed to queue email for ${requisition.staff.email}:`, error.message);
      auditPayload.details.emailsQueued.submitter = false;
    }

    await this.auditService.logAction(auditPayload, tx);

    if (!auditPayload.details.emailsQueued.submitter) {
      throw new BadRequestException(`Requisition ${requisitionId} declined, but email failed to queue`);
    }

    return { message: `Requisition ${requisitionId} declined by ITD and email queued` };
  });
}
}