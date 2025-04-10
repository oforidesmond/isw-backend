import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from 'audit/audit.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { Prisma, RequisitionStatus } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
// import { MailerService } from '@nestjs-modules/mailer';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    departmentId: string;
    emailSent: {
      submitter: boolean;
      deptApprover: boolean;
      itdApprover: boolean;
    };
  };
}

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,     
    private auditService: AuditService,
    // private mailerService: MailerService, 
    // @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async getProfile(userId: string, ipAddress?: string, userAgent?: string ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        staffId: true,
        name: true,
        email: true,
        department: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        roomNo: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) throw new ForbiddenException('User not found');
    return {
      ...user,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  async createRequisition(userId: string, dto: CreateRequisitionDto, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { unitId: true, roomNo: true, email: true, name: true, departmentId: true },
      });
      if (!user) throw new NotFoundException(`User ${userId} not found`);
  
      // Generate requisitionID using a sequence
      const year = new Date().getFullYear();
      const sequenceResult = await tx.$queryRaw<{ nextval: bigint }[]>(
        Prisma.sql`SELECT nextval('requisition_seq')`,
      );
      const sequenceNumber = sequenceResult[0].nextval;
      const requisitionID = `REQ-${year}-${String(sequenceNumber).padStart(6, '0')}`;
  
      // Check and assign deptApprover
      const department = await tx.department.findUnique({
        where: { id: dto.departmentId },
        select: { deptApproverId: true, name: true },
      });
      if (!department) throw new BadRequestException(`Department ${dto.departmentId} not found`);
  
      let deptApproverId: string | null = null;
      let deptApprover: { email: string; name: string } | null = null;
      let status: RequisitionStatus;
  
      // Skip dept approval if requester's department is IT
      const itDepartment = await tx.department.findFirst({
        where: { name: { equals: 'it', mode: 'insensitive' } }, // Case-insensitive check
        select: { id: true },
      });
      const isITRequest = dto.departmentId === itDepartment?.id;
  
      if (!isITRequest) {
        status = RequisitionStatus.PENDING_DEPT_APPROVAL;
        deptApproverId = department.deptApproverId;
        if (!deptApproverId) {
          const approver = await tx.user.findFirst({
            where: {
              departmentId: dto.departmentId,
              roles: { some: { role: { name: 'dept_approver' } } },
              isActive: true,
            },
            select: { id: true, email: true, name: true },
          });
          if (!approver) throw new NotFoundException(`No dept approver for ${dto.departmentId}`);
          deptApproverId = approver.id;
          deptApprover = approver; // Store for email use
        } else {
          deptApprover = await tx.user.findUnique({
            where: { id: deptApproverId },
            select: { email: true, name: true },
          });
          if (!deptApprover) throw new NotFoundException(`Department approver ${deptApproverId} not found`);
        }
      } else {
        status = RequisitionStatus.PENDING_ITD_APPROVAL;
      }
  
      const itdApprover = await tx.user.findFirst({
        where: {
          departmentId: itDepartment?.id,
          roles: { some: { role: { name: 'itd_approver' } } },
          isActive: true,
        },
        select: { id: true, email: true, name: true },
      });
      if (!itdApprover) throw new NotFoundException('No ITD approver found');
      const itdApproverId = itdApprover.id;
  
      const requisition = await tx.requisition.create({
        data: {
          requisitionID,
          staffId: userId,
          itItemId: dto.itItemId,
          itemDescription: dto.itemDescription,
          quantity: dto.quantity,
          urgency: dto.urgency,
          purpose: dto.purpose,
          unitId: dto.unitId || user.unitId,
          departmentId: dto.departmentId,
          roomNo: dto.roomNo || user.roomNo,
          status,
          deptApproverId,
          itdApproverId,
        },
      });
  
      const newState: Prisma.JsonObject = {
        requisitionID: requisition.requisitionID,
        itemDescription: requisition.itemDescription,
        quantity: requisition.quantity,
        urgency: requisition.urgency,
        purpose: requisition.purpose,
        status: requisition.status,
      };
  
      const auditPayload: ExtendedAuditPayload = {
        actionType: 'REQUISITION_SUBMITTED',
        performedById: userId,
        affectedUserId: userId,
        entityType: 'Requisition',
        entityId: requisition.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: {
          departmentId: dto.departmentId,
          emailSent: {
            submitter: false,
            deptApprover: false,
            itdApprover: false,
          },
        },
      };
  
      // // Email submitter
      // await this.emailQueue.add(
      //   'send-email',
      //   {
      //     to: user.email,
      //     subject: `Requisition ${requisitionID} Submitted`,
      //     html: `
      //       <p>Hello ${user.name},</p>
      //       <p>Your requisition (${requisitionID}) has been successfully submitted.</p>
      //       <p>It is now ${status === RequisitionStatus.PENDING_DEPT_APPROVAL ? 'pending department approval' : 'pending ITD approval'}.</p>
      //       <p>Thanks,<br>ISW Team</p>
      //     `,
      //   },
      //   { attempts: 3, backoff: 5000 },
      // );
      // auditPayload.details.emailSent.submitter = true;
  
      // // Email department approver (only if not IT request)
      // if (!isITRequest && deptApproverId && deptApprover) {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: deptApprover.email,
      //       subject: `New Requisition ${requisitionID} Awaiting Approval`,
      //       html: `
      //         <p>Hello ${deptApprover.name},</p>
      //         <p>A new requisition (${requisitionID}) has been submitted and awaits your approval.</p>
      //         <p>Please review it at your earliest convenience.</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailSent.deptApprover = true;
      // }
  
      // // Email ITD approver (only if IT request, i.e., direct ITD approval)
      // if (isITRequest) {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: itdApprover.email,
      //       subject: `New Requisition ${requisitionID} Awaiting ITD Approval`,
      //       html: `
      //         <p>Hello ${itdApprover.name},</p>
      //         <p>A new requisition (${requisitionID}) has been submitted and awaits your approval.</p>
      //         <p>Status: ${requisition.status}</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailSent.itdApprover = true;
      // }
  
      await this.auditService.logAction(auditPayload, tx);
  
      return requisition;
    });
  }

  async getUserRequisitions(userId: string, ipAddress?: string, userAgent?: string) {
    const requisitions = await this.prisma.requisition.findMany({
      where: { staffId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        requisitionID: true,
        itemDescription: true,
        quantity: true,
        urgency: true,
        purpose: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        declineReason: true,
        deptApproverId: true, 
      },
    });

    return requisitions;
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
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}