import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { MaintenanceReportDto, OverdueTicketsReportDto, RequisitionApprovalDelaysDto, RequisitionReportDto, WorkReportDto } from './dto/supervisor.dto';

@Injectable()
export class SupervisorService {
  constructor(private prisma: PrismaService) {}

  async getMaintenanceReport(dto: MaintenanceReportDto) {
    const where: Prisma.MaintenanceTicketWhereInput = {
      deletedAt: null,
    };

    if (dto.startDate || dto.endDate) {
      where.dateLogged = {};
      if (dto.startDate) where.dateLogged.gte = new Date(dto.startDate);
      if (dto.endDate) where.dateLogged.lte = new Date(dto.endDate);
    }

    if (dto.issueType) where.issueType = dto.issueType;
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.technicianId) where.technicianReceivedById = dto.technicianId;
    if (dto.priority) where.priority = dto.priority;
    if (dto.status) {
      where.dateResolved = dto.status === 'OPEN' ? null : { not: null };
    }
    if (dto.assetId) where.assetId = dto.assetId;

    const tickets = await this.prisma.maintenanceTicket.findMany({
      where,
      include: {
        inventory: { include: { itItem: { select: { brand: true, model: true } } } },
        user: { select: { name: true } },
        department: { select: { name: true } },
        technicianReceived: { select: { name: true } },
        technicianReturned: { select: { name: true } },
      },
      orderBy: { dateLogged: 'desc' },
    });

    const summary = {
      totalTickets: tickets.length,
      resolved: tickets.filter((t) => t.dateResolved).length,
      unresolved: tickets.filter((t) => !t.dateResolved).length,
      byIssueType: {
        HARDWARE: tickets.filter((t) => t.issueType === 'HARDWARE').length,
        SOFTWARE: tickets.filter((t) => t.issueType === 'SOFTWARE').length,
      },
      byPriority: {
        HIGH: tickets.filter((t) => t.priority === 'HIGH').length,
        MEDIUM: tickets.filter((t) => t.priority === 'MEDIUM').length,
        LOW: tickets.filter((t) => t.priority === 'LOW').length,
      },
    };

    return {
      summary,
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        assetId: ticket.assetId,
        brand: ticket.inventory.itItem.brand,
        model: ticket.inventory.itItem.model,
        userName: ticket.user.name,
        issueType: ticket.issueType,
        departmentName: ticket.department.name,
        priority: ticket.priority,
        technicianReceivedName: ticket.technicianReceived.name,
        technicianReturnedName: ticket.technicianReturned?.name || 'N/A',
        dateLogged: ticket.dateLogged.toISOString(),
        dateResolved: ticket.dateResolved?.toISOString(),
        actionTaken: ticket.actionTaken,
        remarks: ticket.remarks,
      })),
    };
  }

  async getWorkReport(dto: WorkReportDto) {
    const where: Prisma.MaintenanceTicketWhereInput = {
      deletedAt: null,
    };

    if (dto.startDate || dto.endDate) {
      where.dateLogged = {};
      if (dto.startDate) where.dateLogged.gte = new Date(dto.startDate);
      if (dto.endDate) where.dateLogged.lte = new Date(dto.endDate);
    }
    if (dto.technicianId) where.technicianReceivedById = dto.technicianId;

    const tickets = await this.prisma.maintenanceTicket.findMany({
      where,
      include: {
        technicianReceived: { select: { id: true, name: true } },
      },
    });

    const groupedByTechnician = tickets.reduce((acc, ticket) => {
      const techId = ticket.technicianReceivedById;
      if (!acc[techId]) {
        acc[techId] = {
          technicianId: techId,
          technicianName: ticket.technicianReceived.name,
          totalTickets: 0,
          resolved: 0,
          unresolved: 0,
          avgResolutionTime: 0,
        };
      }
      acc[techId].totalTickets += 1;
      if (ticket.dateResolved) {
        acc[techId].resolved += 1;
        const resolutionTime =
          (ticket.dateResolved.getTime() - ticket.dateLogged.getTime()) / (1000 * 60 * 60); // Hours
        acc[techId].avgResolutionTime =
          (acc[techId].avgResolutionTime * (acc[techId].resolved - 1) + resolutionTime) /
          acc[techId].resolved;
      } else {
        acc[techId].unresolved += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedByTechnician);
  }

  async getOverdueTicketsReport(dto: OverdueTicketsReportDto) {
    const thresholdDays = parseInt(dto.thresholdDays || '30', 10);
    if (isNaN(thresholdDays) || thresholdDays < 1) {
      throw new BadRequestException('Invalid threshold days');
    }

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const where: Prisma.MaintenanceTicketWhereInput = {
      deletedAt: null,
      dateResolved: null,
      dateLogged: { lte: thresholdDate },
    };

    if (dto.departmentId) where.departmentId = dto.departmentId;

    const tickets = await this.prisma.maintenanceTicket.findMany({
      where,
      include: {
        inventory: { include: { itItem: { select: { brand: true, model: true } } } },
        user: { select: { name: true } },
        department: { select: { name: true } },
        technicianReceived: { select: { name: true } },
      },
      orderBy: { dateLogged: 'asc' },
    });

    return tickets.map((ticket) => ({
      ticketId: ticket.ticketId,
      assetId: ticket.assetId,
      brand: ticket.inventory.itItem.brand,
      model: ticket.inventory.itItem.model,
      userName: ticket.user.name,
      issueType: ticket.issueType,
      departmentName: ticket.department.name,
      priority: ticket.priority,
      technicianReceivedName: ticket.technicianReceived.name,
      dateLogged: ticket.dateLogged.toISOString(),
      daysOpen: Math.floor(
        (new Date().getTime() - ticket.dateLogged.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  async getRequisitionStatusSummary(dto: RequisitionReportDto) {
    const where: Prisma.RequisitionWhereInput = { deletedAt: null };

    if (dto.startDate) where.createdAt = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.createdAt = { lte: new Date(dto.endDate) };
    if (dto.status) where.status = dto.status;
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.urgency) where.urgency = dto.urgency;
    if (dto.staffId) where.staffId = dto.staffId;
    if (dto.itItemId) where.itItemId = dto.itItemId;

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        staff: { select: { name: true } },
        department: { select: { name: true } },
        itItem: { select: { brand: true, model: true } },
        deptApprover: { select: { name: true } },
        itdApprover: { select: { name: true } },
        issuedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: requisitions.length,
      byStatus: {
        PENDING_DEPT_APPROVAL: requisitions.filter((r) => r.status === 'PENDING_DEPT_APPROVAL').length,
        PENDING_ITD_APPROVAL: requisitions.filter((r) => r.status === 'PENDING_ITD_APPROVAL').length,
        DEPT_APPROVED: requisitions.filter((r) => r.status === 'DEPT_APPROVED').length,
        ITD_APPROVED: requisitions.filter((r) => r.status === 'ITD_APPROVED').length,
        DEPT_DECLINED: requisitions.filter((r) => r.status === 'DEPT_DECLINED').length,
        ITD_DECLINED: requisitions.filter((r) => r.status === 'ITD_DECLINED').length,
        PROCESSED: requisitions.filter((r) => r.status === 'PROCESSED').length,
      },
      byUrgency: {
        HIGH: requisitions.filter((r) => r.urgency === 'HIGH').length,
        MEDIUM: requisitions.filter((r) => r.urgency === 'MEDIUM').length,
        LOW: requisitions.filter((r) => r.urgency === 'LOW').length,
      },
      averageProcessingTimeHours: requisitions
        .filter((r) => r.issuedAt || r.status === 'DEPT_DECLINED' || r.status === 'ITD_DECLINED')
        .reduce((acc, r) => {
          const endTime = r.issuedAt || r.updatedAt;
          const timeDiff = (endTime.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60); // Hours
          return acc + timeDiff;
        }, 0) / (requisitions.filter((r) => r.issuedAt || r.status === 'DEPT_DECLINED' || r.status === 'ITD_DECLINED').length || 1),
    };

    const formattedRequisitions = requisitions.map((r) => ({
      requisitionId: r.requisitionID,
      staffName: r.staff.name,
      itemDescription: r.itemDescription,
      quantity: r.quantity,
      urgency: r.urgency,
      departmentName: r.department.name,
      itItem: r.itItem ? `${r.itItem.brand} ${r.itItem.model}` : null,
      status: r.status,
      deptApproverName: r.deptApprover?.name || 'N/A',
      itdApproverName: r.itdApprover?.name || 'N/A',
      issuedByName: r.issuedBy?.name || 'N/A',
      createdAt: r.createdAt.toISOString(),
      issuedAt: r.issuedAt?.toISOString(),
      purpose: r.purpose,
    }));

    return { summary, requisitions: formattedRequisitions };
}

async getRequisitionApprovalDelays(dto: RequisitionApprovalDelaysDto) {
    const thresholdDays = parseInt(dto.thresholdDays || '5', 10);
    if (isNaN(thresholdDays) || thresholdDays < 1) {
      throw new BadRequestException('Invalid threshold days');
    }

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const where: Prisma.RequisitionWhereInput = {
      deletedAt: null,
      status: { in: ['PENDING_DEPT_APPROVAL', 'PENDING_ITD_APPROVAL'] },
      createdAt: { lte: thresholdDate },
    };

    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.approverId) {
      where.OR = [
        { deptApproverId: dto.approverId },
        { itdApproverId: dto.approverId },
      ];
    }

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        staff: { select: { name: true } },
        department: { select: { name: true } },
        itItem: { select: { brand: true, model: true } },
        deptApprover: { select: { name: true } },
        itdApprover: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedRequisitions = requisitions.map((r) => ({
      requisitionId: r.requisitionID,
      staffName: r.staff.name,
      itemDescription: r.itemDescription,
      quantity: r.quantity,
      urgency: r.urgency,
      departmentName: r.department.name,
      itItem: r.itItem ? `${r.itItem.brand} ${r.itItem.model}` : null,
      status: r.status,
      deptApproverName: r.deptApprover?.name || 'N/A',
      itdApproverName: r.itdApprover?.name || 'N/A',
      createdAt: r.createdAt.toISOString(),
      daysPending: Math.floor(
        (new Date().getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return {
      thresholdDays,
      totalDelayed: requisitions.length,
      requisitions: formattedRequisitions,
    };
}

async getRequisitionFulfillmentReport(dto: RequisitionReportDto) {
    const where: Prisma.RequisitionWhereInput = {
      deletedAt: null,
      status: { in: ['DEPT_APPROVED', 'ITD_APPROVED', 'PROCESSED'] },
    };

    if (dto.startDate) where.createdAt = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.createdAt = { lte: new Date(dto.endDate) };
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.itItemId) where.itItemId = dto.itItemId;

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        staff: { select: { name: true } },
        department: { select: { name: true } },
        itItem: { select: { brand: true, model: true } },
        issuedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: requisitions.length,
      processed: requisitions.filter((r) => r.status === 'PROCESSED').length,
      pendingProcessing: requisitions.filter((r) => r.status === 'DEPT_APPROVED' || r.status === 'ITD_APPROVED').length,
      averageFulfillmentTimeHours: requisitions
        .filter((r) => r.status === 'PROCESSED' && r.issuedAt)
        .reduce((acc, r) => {
          const timeDiff = (r.issuedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60); // Hours
          return acc + timeDiff;
        }, 0) / (requisitions.filter((r) => r.status === 'PROCESSED' && r.issuedAt).length || 1),
    };

    const formattedRequisitions = requisitions.map((r) => ({
      requisitionId: r.requisitionID,
      staffName: r.staff.name,
      itemDescription: r.itemDescription,
      quantity: r.quantity,
      departmentName: r.department.name,
      itItem: r.itItem ? `${r.itItem.brand} ${r.itItem.model}` : null,
      status: r.status,
      issuedByName: r.issuedBy?.name || 'N/A',
      createdAt: r.createdAt.toISOString(),
      issuedAt: r.issuedAt?.toISOString(),
      fulfillmentTimeHours: r.issuedAt
        ? (r.issuedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60)
        : null,
    }));

    return { summary, requisitions: formattedRequisitions };
}

async getHighUrgencyRequisitions(dto: RequisitionReportDto) {
    const where: Prisma.RequisitionWhereInput = {
      deletedAt: null,
      urgency: 'HIGH',
    };

    if (dto.startDate) where.createdAt = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.createdAt = { lte: new Date(dto.endDate) };
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.status) where.status = dto.status;

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        staff: { select: { name: true } },
        department: { select: { name: true } },
        itItem: { select: { brand: true, model: true } },
        deptApprover: { select: { name: true } },
        itdApprover: { select: { name: true } },
        issuedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: requisitions.length,
      byStatus: {
        PENDING_DEPT_APPROVAL: requisitions.filter((r) => r.status === 'PENDING_DEPT_APPROVAL').length,
        PENDING_ITD_APPROVAL: requisitions.filter((r) => r.status === 'PENDING_ITD_APPROVAL').length,
        DEPT_APPROVED: requisitions.filter((r) => r.status === 'DEPT_APPROVED').length,
        ITD_APPROVED: requisitions.filter((r) => r.status === 'ITD_APPROVED').length,
        DEPT_DECLINED: requisitions.filter((r) => r.status === 'DEPT_DECLINED').length,
        ITD_DECLINED: requisitions.filter((r) => r.status === 'ITD_DECLINED').length,
        PROCESSED: requisitions.filter((r) => r.status === 'PROCESSED').length,
      },
    };

    const formattedRequisitions = requisitions.map((r) => ({
      requisitionId: r.requisitionID,
      staffName: r.staff.name,
      itemDescription: r.itemDescription,
      quantity: r.quantity,
      departmentName: r.department.name,
      itItem: r.itItem ? `${r.itItem.brand} ${r.itItem.model}` : null,
      status: r.status,
      deptApproverName: r.deptApprover?.name || 'N/A',
      itdApproverName: r.itdApprover?.name || 'N/A',
      issuedByName: r.issuedBy?.name || 'N/A',
      createdAt: r.createdAt.toISOString(),
      issuedAt: r.issuedAt?.toISOString(),
      daysSinceCreated: Math.floor(
        (new Date().getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return { summary, requisitions: formattedRequisitions };
}

async getDeclinedRequisitionsAnalysis(dto: RequisitionReportDto) {
    const where: Prisma.RequisitionWhereInput = {
      deletedAt: null,
      status: { in: ['DEPT_DECLINED', 'ITD_DECLINED'] },
    };

    if (dto.startDate) where.createdAt = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.createdAt = { lte: new Date(dto.endDate) };
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.staffId) where.staffId = dto.staffId;

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        staff: { select: { name: true } },
        department: { select: { name: true } },
        itItem: { select: { brand: true, model: true } },
        deptApprover: { select: { name: true } },
        itdApprover: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const declineReasons = requisitions.reduce((acc, r) => {
      const reason = r.declineReason || 'No reason provided';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const formattedRequisitions = requisitions.map((r) => ({
      requisitionId: r.requisitionID,
      staffName: r.staff.name,
      itemDescription: r.itemDescription,
      quantity: r.quantity,
      departmentName: r.department.name,
      itItem: r.itItem ? `${r.itItem.brand} ${r.itItem.model}` : null,
      declineReason: r.declineReason,
      deptApproverName: r.deptApprover?.name || 'N/A',
      itdApproverName: r.itdApprover?.name || 'N/A',
      createdAt: r.createdAt.toISOString(),
      declinedAt: r.updatedAt.toISOString(),
    }));

    return {
      summary: {
        totalDeclined: requisitions.length,
        declineReasons,
      },
      requisitions: formattedRequisitions,
    };
  }
}