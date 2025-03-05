import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from 'audit/audit.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,     
    private auditService: AuditService,
  ) {}

  async getProfile(userId: string, ipAddress?: string, userAgent?: string ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, staffId: true, name: true, email: true },
    });

    if (!user) throw new ForbiddenException('User not found');
    return user;
  }

  async createRequisition(userId: string, dto: CreateRequisitionDto, ipAddress?: string, userAgent?: string) {
    // Generate unique requisitionID (e.g., "REQ-2025-001")
    const year = new Date().getFullYear();
    const count = await this.prisma.requisition.count({ where: { requisitionID: { startsWith: `REQ-${year}` } } });
    const requisitionID = `REQ-${year}-${String(count + 1).padStart(3, '0')}`;

    // Perform creation and logging in a transaction
    return this.prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.create({
        data: {
          requisitionID,
          staffId: userId,
          itItemId: dto.itItemId,
          itemDescription: dto.itemDescription,
          quantity: dto.quantity,
          urgency: dto.urgency,
          purpose: dto.purpose,
          unitId: dto.unitId,
          departmentId: dto.departmentId,
          roomNo: dto.roomNo,
          status: 'PENDING_DEPT_APPROVAL',
        },
      });

      // Log REQUISITION_SUBMITTED
      const newState: Prisma.JsonObject = {
        requisitionID: requisition.requisitionID,
        itemDescription: requisition.itemDescription,
        quantity: requisition.quantity,
        urgency: requisition.urgency,
        purpose: requisition.purpose,
        status: requisition.status,
      };

      await this.auditService.logAction(
        'REQUISITION_SUBMITTED',
        userId,
        userId,
        'Requisition',
        requisition.id,
        null,
        newState,
        ipAddress,
        userAgent,
        { departmentId: dto.departmentId },
        tx, // Pass transaction context
      );

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
