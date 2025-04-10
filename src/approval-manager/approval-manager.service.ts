// import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { AuditService } from 'audit/audit.service';
// import { Queue } from 'bull';
import { PrismaService } from 'prisma/prisma.service';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    itItemId?: string;
    emailsQueued: {
      submitter: boolean;
      itdApprover?: boolean; 
    };
  };
}

@Injectable()
export class ApprovalManagerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    // @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async getPendingRequisitions(approverId: string) {
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { departmentId: true },
    });
    if (!approver || !approver.departmentId) {
      throw new BadRequestException('Approver not assigned to a department');
    }

    return this.prisma.requisition.findMany({
      where: {
        deptApproverId: approverId,
        status: 'PENDING_DEPT_APPROVAL',
        deletedAt: null,
        departmentId: approver.departmentId,
      },
      include: {
        staff: { select: { name: true, email: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRequisition(requisitionId: string, approverId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id: requisitionId },
        include: { staff: { select: { email: true, name: true } }, itdApprover: { select: { email: true, name: true } } },
      });
      if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
      if (requisition.deletedAt) throw new BadRequestException(`Requisition ${requisitionId} is deleted`);
      if (requisition.status !== 'PENDING_DEPT_APPROVAL') throw new BadRequestException(`Department approval already processed`);

      if (requisition.deptApproverId !== approverId) {
        throw new BadRequestException(`You are not the department approver for this requisition`);
      }

      const oldState: Prisma.JsonObject = { status: requisition.status };
      const updatedRequisition = await tx.requisition.update({
        where: { id: requisitionId },
        data: { status: 'PENDING_ITD_APPROVAL' },
      });
      const newState: Prisma.JsonObject = { status: updatedRequisition.status };

      const auditPayload: ExtendedAuditPayload = {
        actionType: 'REQUISITION_DEPT_APPROVED',
        performedById: approverId,
        affectedUserId: requisition.staffId,
        entityType: 'Requisition',
        entityId: requisitionId,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { itItemId: requisition.itItemId, emailsQueued: { submitter: false, itdApprover: false } },
      };

      // // Notify submitter
      // try {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: requisition.staff.email,
      //       subject: `Requisition ${requisition.requisitionID} Approved by Department`,
      //       html: `
      //         <p>Hello ${requisition.staff.name},</p>
      //         <p>Your requisition (${requisition.requisitionID}) has been approved by the department.</p>
      //         <p>It is now pending ITD approval.</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailsQueued.submitter = true;
      // } catch (error) {
      //   console.error(`Failed to queue email for ${requisition.staff.email}:`, error.message);
      //   auditPayload.details.emailsQueued.submitter = false;
      // }

      // // Notify the ITD approver
      // try {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: requisition.itdApprover.email,
      //       subject: `New Requisition ${requisition.requisitionID} Awaiting ITD Approval`,
      //       html: `
      //         <p>Hello ${requisition.itdApprover.name},</p>
      //         <p>A requisition (${requisition.requisitionID}) has been approved by the requesting department and now awaits your approval.</p>
      //         <p>Please review it at your earliest convenience.</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailsQueued.itdApprover = true;
      // } catch (error) {
      //   console.error(`Failed to queue email for ${requisition.itdApprover.email}:`, error.message);
      //   auditPayload.details.emailsQueued.itdApprover = false;
      // }

      await this.auditService.logAction(auditPayload, tx);

      // if (!auditPayload.details.emailsQueued.submitter || !auditPayload.details.emailsQueued.itdApprover) {
      //   throw new BadRequestException(`Requisition ${requisitionId} approved, but one or more emails failed to queue`);
      // }

      return { message: `Requisition ${requisitionId} approved by department and emails queued` };
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
      if (requisition.status !== 'PENDING_DEPT_APPROVAL') throw new BadRequestException(`Department approval already processed`);

      if (requisition.deptApproverId !== approverId) {
        throw new BadRequestException(`You are not the department approver for this requisition`);
      }

      const oldState: Prisma.JsonObject = { status: requisition.status };
      const updatedRequisition = await tx.requisition.update({
        where: { id: requisitionId },
        data: { status: 'DEPT_DECLINED', declineReason: reason },
      });
      const newState: Prisma.JsonObject = { status: updatedRequisition.status, declineReason: updatedRequisition.declineReason };

      const auditPayload: ExtendedAuditPayload = {
        actionType: 'REQUISITION_DEPT_DECLINED',
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

      // // Notify the submitter
      // try {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: requisition.staff.email,
      //       subject: `Requisition ${requisition.requisitionID} Declined by Department`,
      //       html: `
      //         <p>Hello ${requisition.staff.name},</p>
      //         <p>Your requisition (${requisition.requisitionID}) has been declined by the department.</p>
      //         <p>Reason: ${reason}</p>
      //         <p>Please contact us if you have questions.</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailsQueued.submitter = true;
      // } catch (error) {
      //   console.error(`Failed to queue email for ${requisition.staff.email}:`, error.message);
      //   auditPayload.details.emailsQueued.submitter = false;
      // }

      await this.auditService.logAction(auditPayload, tx);

      // if (!auditPayload.details.emailsQueued.submitter) {
      //   throw new BadRequestException(`Requisition ${requisitionId} declined, but email failed to queue`);
      // }

      return { message: `Requisition ${requisitionId} declined by department and email queued` };
    });
  }
}