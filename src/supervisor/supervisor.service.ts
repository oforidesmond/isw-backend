import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InventoryReportDto, MaintenanceReportDto, OverdueTicketsReportDto, RequisitionApprovalDelaysDto, RequisitionReportDto, StockReportDto, WorkReportDto } from './dto/supervisor.dto';

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
          (ticket.dateResolved.getTime() - ticket.dateLogged.getTime()) / (1000 * 60 * 60);
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
          const timeDiff = (endTime.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
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
          const timeDiff = (r.issuedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
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

  async getStockInventoryLevels(dto: StockReportDto) {
    const where: Prisma.StockWhereInput = { deletedAt: null };

    if (dto.itItemId) where.itItemId = dto.itItemId;
    if (dto.minQuantity) {
      const minQuantity = parseInt(dto.minQuantity, 10);
      if (isNaN(minQuantity) || minQuantity < 0) {
        throw new BadRequestException('Invalid minimum quantity');
      }
      where.quantityInStock = { lte: minQuantity };
    }

    const stocks = await this.prisma.stock.findMany({
      where,
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
      },
      orderBy: { quantityInStock: 'asc' },
    });

    const summary = {
      totalItems: stocks.length,
      lowStockItems: stocks.filter((s) => s.quantityInStock <= 10).length,
      totalQuantity: stocks.reduce((acc, s) => acc + s.quantityInStock, 0),
    };

    const formattedStocks = stocks.map((s) => ({
      itemId: s.itItemId,
      brand: s.itItem.brand,
      model: s.itItem.model,
      deviceType: s.itItem.deviceType,
      quantityInStock: s.quantityInStock,
      lastUpdated: s.updatedAt.toISOString(),
    }));

    return { summary, stocks: formattedStocks };
  }

  async getStockReceivedReport(dto: StockReportDto) {
    const where: Prisma.StockReceivedWhereInput = { deletedAt: null };

    if (dto.startDate) where.dateReceived = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.dateReceived = { lte: new Date(dto.endDate) };
    if (dto.itItemId) where.itItemId = dto.itItemId;

    const stockReceived = await this.prisma.stockReceived.findMany({
      where,
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        supplier: { select: { name: true } },
        receivedBy: { select: { name: true } },
      },
      orderBy: { dateReceived: 'desc' },
    });

    const summary = {
      totalReceipts: stockReceived.length,
      totalQuantityReceived: stockReceived.reduce((acc, s) => acc + s.quantityReceived, 0),
      uniqueItems: [...new Set(stockReceived.map((s) => s.itItemId))].length,
    };

    const formattedStockReceived = stockReceived.map((s) => ({
      lpoReference: s.lpoReference,
      voucherNumber: s.voucherNumber,
      itemId: s.itItemId,
      brand: s.itItem.brand,
      model: s.itItem.model,
      deviceType: s.itItem.deviceType,
      quantityReceived: s.quantityReceived,
      supplierName: s.supplier.name,
      receivedByName: s.receivedBy.name,
      dateReceived: s.dateReceived.toISOString(),
      lpoDate: s.lpoDate.toISOString(),
      warrantyPeriod: s.warrantyPeriod,
      remarks: s.remarks,
    }));

    return { summary, stockReceived: formattedStockReceived };
  }

  async getStockIssuedReport(dto: StockReportDto) {
    const where: Prisma.StockIssuedWhereInput = { deletedAt: null };

    if (dto.startDate) where.issueDate = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.issueDate = { lte: new Date(dto.endDate) };
    if (dto.itItemId) where.itItemId = dto.itItemId;
    if (dto.issuedById) where.issuedById = dto.issuedById;
    if (dto.departmentId) {
      where.requisition = { departmentId: dto.departmentId };
    }

    const stockIssued = await this.prisma.stockIssued.findMany({
      where,
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        requisition: { include: { department: { select: { name: true } } } },
        issuedBy: { select: { name: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    const summary = {
      totalIssues: stockIssued.length,
      totalQuantityIssued: stockIssued.reduce((acc, s) => acc + s.quantityIssued, 0),
      uniqueItems: [...new Set(stockIssued.map((s) => s.itItemId))].length,
    };

    const formattedStockIssued = stockIssued.map((s) => ({
      requisitionId: s.requisition.requisitionID,
      itemId: s.itItemId,
      brand: s.itItem.brand,
      model: s.itItem.model,
      deviceType: s.itItem.deviceType,
      quantityIssued: s.quantityIssued,
      departmentName: s.requisition.department.name,
      issuedByName: s.issuedBy.name,
      issueDate: s.issueDate.toISOString(),
      requestDate: s.requestDate.toISOString(),
      disbursementNote: s.disbursementNote,
      remarks: s.remarks,
    }));

    return { summary, stockIssued: formattedStockIssued };
  }

  async getStockMovementTrends(dto: StockReportDto) {
    const receivedWhere: Prisma.StockReceivedWhereInput = { deletedAt: null };
    const issuedWhere: Prisma.StockIssuedWhereInput = { deletedAt: null };

    if (dto.startDate) {
      receivedWhere.dateReceived = { gte: new Date(dto.startDate) };
      issuedWhere.issueDate = { gte: new Date(dto.startDate) };
    }
    if (dto.endDate) {
      receivedWhere.dateReceived = { lte: new Date(dto.endDate) };
      issuedWhere.issueDate = { lte: new Date(dto.endDate) };
    }
    if (dto.itItemId) {
      receivedWhere.itItemId = dto.itItemId;
      issuedWhere.itItemId = dto.itItemId;
    }
    if (dto.departmentId) {
      issuedWhere.requisition = { departmentId: dto.departmentId };
    }

    const [stockReceived, stockIssued] = await Promise.all([
      this.prisma.stockReceived.findMany({
        where: receivedWhere,
        include: { itItem: { select: { brand: true, model: true } } },
      }),
      this.prisma.stockIssued.findMany({
        where: issuedWhere,
        include: { itItem: { select: { brand: true, model: true } } },
      }),
    ]);

      interface Movement {
        received: number;
        issued: number;
      }

      interface ItemMovement {
        brand: string;
        model: string;
        movements: Record<string, Movement>;
      }

    const movementsByItem = [...stockReceived, ...stockIssued].reduce(
      (acc: Record<string, ItemMovement>, record) => {
        const itemId = record.itItemId;
        const date = 'dateReceived' in record ? record.dateReceived : record.issueDate;
        const month = date.toISOString().slice(0, 7);
  
        if (!acc[itemId]) {
          acc[itemId] = {
            brand: record.itItem.brand,
            model: record.itItem.model,
            movements: {},
          };
        }
  
        if (!acc[itemId].movements[month]) {
          acc[itemId].movements[month] = { received: 0, issued: 0 };
        }
  
        if ('quantityReceived' in record) {
          acc[itemId].movements[month].received += record.quantityReceived;
        } else {
          acc[itemId].movements[month].issued += record.quantityIssued;
        }
  
        return acc;
      },
      {}
    );

    const formattedMovements = Object.entries(movementsByItem).map(([itemId, data]) => ({
      itemId,
      brand: data.brand,
      model: data.model,
      movements: Object.entries(data.movements).map(([month, movement]) => ({
        month,
        received: movement.received,
        issued: movement.issued,
        netChange: movement.received - movement.issued,
      })),
    }));

    const summary = {
      totalReceived: stockReceived.reduce((acc, s) => acc + s.quantityReceived, 0),
      totalIssued: stockIssued.reduce((acc, s) => acc + s.quantityIssued, 0),
      uniqueItems: [...new Set([...stockReceived, ...stockIssued].map((s) => s.itItemId))].length,
    };
  
    return { summary, movements: formattedMovements };
  }

  async getLowStockAlerts(dto: StockReportDto) {
    const minQuantity = parseInt(dto.minQuantity || '10', 10);
    if (isNaN(minQuantity) || minQuantity < 0) {
      throw new BadRequestException('Invalid minimum quantity');
    }

    const where: Prisma.StockWhereInput = {
      deletedAt: null,
      quantityInStock: { lte: minQuantity },
    };

    if (dto.itItemId) where.itItemId = dto.itItemId;

    const stocks = await this.prisma.stock.findMany({
      where,
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
      },
      orderBy: { quantityInStock: 'asc' },
    });

    const recentIssuances = await this.prisma.stockIssued.findMany({
      where: {
        itItemId: { in: stocks.map((s) => s.itItemId) },
        issueDate: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      include: { issuedBy: { select: { name: true } } },
      orderBy: { issueDate: 'desc' },
    });

    const formattedStocks = stocks.map((s) => ({
      itemId: s.itItemId,
      brand: s.itItem.brand,
      model: s.itItem.model,
      deviceType: s.itItem.deviceType,
      quantityInStock: s.quantityInStock,
      lastUpdated: s.updatedAt.toISOString(),
      recentIssuances: recentIssuances
        .filter((i) => i.itItemId === s.itItemId)
        .map((i) => ({
          quantityIssued: i.quantityIssued,
          issuedByName: i.issuedBy.name,
          issueDate: i.issueDate.toISOString(),
        })),
    }));

    return {
      threshold: minQuantity,
      totalLowStockItems: stocks.length,
      stocks: formattedStocks,
    };
  }

 async getInventoryAgeReport(dto: InventoryReportDto) {
    const where: Prisma.InventoryWhereInput = { deletedAt: null };

    if (dto.startPurchaseDate || dto.endPurchaseDate || dto.minAgeYears || dto.maxAgeYears) {
      where.purchaseDate = {};
      if (dto.startPurchaseDate) {
        where.purchaseDate.gte = new Date(dto.startPurchaseDate);
      }
      if (dto.endPurchaseDate) {
        where.purchaseDate.lte = new Date(dto.endPurchaseDate);
      }

      const currentDate = new Date();
      if (dto.minAgeYears) {
        const minAgeDate = new Date(currentDate);
        minAgeDate.setFullYear(currentDate.getFullYear() - parseInt(dto.minAgeYears, 10));
        where.purchaseDate.lte = minAgeDate;
      }
      if (dto.maxAgeYears) {
        const maxAgeDate = new Date(currentDate);
        maxAgeDate.setFullYear(currentDate.getFullYear() - parseInt(dto.maxAgeYears, 10));
        where.purchaseDate.gte = maxAgeDate;
      }
    }

    if (dto.warrantyPeriodMonths) {
      where.warrantyPeriod = parseInt(dto.warrantyPeriodMonths, 10);
    }

    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.unitId) where.unitId = dto.unitId;
    if (dto.itItemId) where.itItemId = dto.itItemId;
    if (dto.deviceType) where.itItem = { deviceType: { equals: dto.deviceType } };
    if (dto.status) where.status = dto.status;
    if (dto.lpoReference) where.lpoReference = dto.lpoReference;
    if (dto.supplierId) where.supplierId = dto.supplierId;

    const inventories = await this.prisma.inventory.findMany({
      where,
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        department: { select: { name: true } },
        unit: { select: { name: true } },
        user: { select: { name: true } },
        supplier: { select: { name: true } },
        desktopDetails: true,
        laptopDetails: true,
        printerDetails: true,
        upsDetails: true,
        otherDetails: true,
      },
      orderBy: { purchaseDate: 'asc' },
    });

    const currentDate = new Date();
    const assets = inventories.map((asset) => {
      const purchaseDate = asset.purchaseDate;
      const warrantyExpiry = new Date(purchaseDate);
      warrantyExpiry.setMonth(warrantyExpiry.getMonth() + asset.warrantyPeriod);

      let deviceDetails: Record<string, any> = {};
      if (asset.desktopDetails) {
        deviceDetails = {
          type: 'Desktop',
          serialNumber: asset.desktopDetails.desktopSerialNumber,
          processorType: asset.desktopDetails.desktopProcessorType,
          memorySize: asset.desktopDetails.desktopMemorySize,
          operatingSystem: asset.desktopDetails.desktopOperatingSystem,
        };
      } else if (asset.laptopDetails) {
        deviceDetails = {
          type: 'Laptop',
          serialNumber: asset.laptopDetails.laptopSerialNumber,
          processorType: asset.laptopDetails.laptopProcessorType,
          memorySize: asset.laptopDetails.laptopMemorySize,
          operatingSystem: asset.laptopDetails.laptopOperatingSystem,
        };
      } else if (asset.printerDetails) {
        deviceDetails = {
          type: 'Printer',
          serialNumber: asset.printerDetails.printerSerialNumber,
          tonerNumber: asset.printerDetails.printerTonerNumber,
        };
      } else if (asset.upsDetails) {
        deviceDetails = {
          type: 'UPS',
          serialNumber: asset.upsDetails.upsSerialNumber,
        };
      } else if (asset.otherDetails) {
        deviceDetails = {
          type: asset.otherDetails.deviceType,
          serialNumber: asset.otherDetails.otherSerialNumber,
        };
      }

      return {
        assetId: asset.assetId,
        itItemId: asset.itItemId,
        brand: asset.itItem.brand,
        model: asset.itItem.model,
        deviceType: asset.itItem.deviceType,
        purchaseDate: purchaseDate.toISOString(),
        ageYears: (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365),
        warrantyPeriodMonths: asset.warrantyPeriod,
        warrantyExpiry: warrantyExpiry.toISOString(),
        daysToWarrantyExpiry: (warrantyExpiry.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        departmentName: asset.department.name,
        unitName: asset.unit?.name || 'N/A',
        userName: asset.user.name,
        supplierName: asset.supplier?.name || 'N/A',
        lpoReference: asset.lpoReference || 'N/A',
        status: asset.status,
        remarks: asset.remarks,
        deviceDetails,
      };
    });

    const summary = {
      totalAssets: inventories.length,
      averageAgeYears: assets.reduce((acc, a) => acc + a.ageYears, 0) / (assets.length || 1),
      byAgeRange: {
        lessThan1Year: assets.filter((a) => a.ageYears < 1).length,
        between1And3Years: assets.filter((a) => a.ageYears >= 1 && a.ageYears < 3).length,
        between3And5Years: assets.filter((a) => a.ageYears >= 3 && a.ageYears < 5).length,
        moreThan5Years: assets.filter((a) => a.ageYears >= 5).length,
      },
      byStatus: {
        ACTIVE: assets.filter((a) => a.status === 'ACTIVE').length,
        INACTIVE: assets.filter((a) => a.status === 'INACTIVE').length,
        NON_FUNCTIONAL: assets.filter((a) => a.status === 'NON_FUNCTIONAL').length,
        OBSOLETE: assets.filter((a) => a.status === 'OBSOLETE').length,
        DISPOSED: assets.filter((a) => a.status === 'DISPOSED').length,
      },
      nearingWarrantyExpiry: assets.filter(
        (a) => a.daysToWarrantyExpiry >= 0 && a.daysToWarrantyExpiry <= 90
      ).length,
    };

    return { summary, assets };
  }

  async getInventoryDeviceDetailsReport(dto: InventoryReportDto) {
    const where: Prisma.InventoryWhereInput = { deletedAt: null };

    if (dto.deviceType) {
      where.itItem = { deviceType: { equals: dto.deviceType } };
    }
    if (dto.brand) {
      where.OR = [
        { itItem: { brand: { equals: dto.brand } } },
        { desktopDetails: { desktopBrand: { equals: dto.brand } } },
        { laptopDetails: { laptopBrand: { equals: dto.brand } } },
        { printerDetails: { printerBrand: { equals: dto.brand } } },
        { upsDetails: { upsBrand: { equals: dto.brand } } },
        { otherDetails: { otherBrand: { equals: dto.brand } } },
      ];
    }
    if (dto.model) {
      where.OR = where.OR || [];
      where.OR.push(
        { itItem: { model: { equals: dto.model } } },
        { desktopDetails: { desktopModel: { equals: dto.model } } },
        { laptopDetails: { laptopModel: { equals: dto.model } } },
        { printerDetails: { printerModel: { equals: dto.model } } },
        { upsDetails: { upsModel: { equals: dto.model } } },
        { otherDetails: { otherModel: { equals: dto.model } } }
      );
    }
    if (dto.serialNumber) {
      where.OR = [
        { desktopDetails: { desktopSerialNumber: { equals: dto.serialNumber } } },
        { laptopDetails: { laptopSerialNumber: { equals: dto.serialNumber } } },
        { printerDetails: { printerSerialNumber: { equals: dto.serialNumber } } },
        { upsDetails: { upsSerialNumber: { equals: dto.serialNumber } } },
        { otherDetails: { otherSerialNumber: { equals: dto.serialNumber } } },
      ];
    }
    if (dto.processorType) {
      where.OR = [
        { desktopDetails: { desktopProcessorType: { equals: dto.processorType } } },
        { laptopDetails: { laptopProcessorType: { equals: dto.processorType } } },
      ];
    }
    if (dto.tonerNumber) {
      where.printerDetails = { printerTonerNumber: { equals: dto.tonerNumber } };
    }
    if (dto.status) {
      where.status = dto.status;
    }
    if (dto.departmentId) {
      where.departmentId = dto.departmentId;
    }
    if (dto.unitId) {
      where.unitId = dto.unitId;
    }
    if (dto.itItemId) {
      where.itItemId = dto.itItemId;
    }
    if (dto.lpoReference) {
      where.lpoReference = dto.lpoReference;
    }
    if (dto.supplierId) {
      where.supplierId = dto.supplierId;
    }

    const inventories = await this.prisma.inventory.findMany({
      where,
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        department: { select: { name: true } },
        unit: { select: { name: true } },
        user: { select: { name: true } },
        supplier: { select: { name: true } },
        desktopDetails: true,
        laptopDetails: true,
        printerDetails: true,
        upsDetails: true,
        otherDetails: true,
      },
      orderBy: { itItem: { brand: 'asc' } },
    });

    const assets = inventories.map((asset) => {
      let deviceDetails: Record<string, any> = {};
      if (asset.desktopDetails) {
        deviceDetails = {
          type: 'Desktop',
          brand: asset.desktopDetails.desktopBrand,
          model: asset.desktopDetails.desktopModel,
          serialNumber: asset.desktopDetails.desktopSerialNumber,
          processorType: asset.desktopDetails.desktopProcessorType,
          memorySize: asset.desktopDetails.desktopMemorySize,
          storageDriveType: asset.desktopDetails.desktopStorageDriveType,
          storageDriveSize: asset.desktopDetails.desktopStorageDriveSize,
          operatingSystem: asset.desktopDetails.desktopOperatingSystem,
          endpointSecurity: asset.desktopDetails.desktopEndpointSecurity,
          spiceworksMonitoring: asset.desktopDetails.desktopSpiceworksMonitoring,
        };
      } else if (asset.laptopDetails) {
        deviceDetails = {
          type: 'Laptop',
          brand: asset.laptopDetails.laptopBrand,
          model: asset.laptopDetails.laptopModel,
          serialNumber: asset.laptopDetails.laptopSerialNumber,
          processorType: asset.laptopDetails.laptopProcessorType,
          memorySize: asset.laptopDetails.laptopMemorySize,
          storageDriveType: asset.laptopDetails.laptopStorageDriveType,
          storageDriveSize: asset.laptopDetails.laptopStorageDriveSize,
          operatingSystem: asset.laptopDetails.laptopOperatingSystem,
          endpointSecurity: asset.laptopDetails.laptopEndpointSecurity,
          spiceworksMonitoring: asset.laptopDetails.laptopSpiceworksMonitoring,
        };
      } else if (asset.printerDetails) {
        deviceDetails = {
          type: 'Printer',
          brand: asset.printerDetails.printerBrand,
          model: asset.printerDetails.printerModel,
          serialNumber: asset.printerDetails.printerSerialNumber,
          tonerNumber: asset.printerDetails.printerTonerNumber,
        };
      } else if (asset.upsDetails) {
        deviceDetails = {
          type: 'UPS',
          brand: asset.upsDetails.upsBrand,
          model: asset.upsDetails.upsModel,
          serialNumber: asset.upsDetails.upsSerialNumber,
        };
      } else if (asset.otherDetails) {
        deviceDetails = {
          type: asset.otherDetails.deviceType,
          brand: asset.otherDetails.otherBrand,
          model: asset.otherDetails.otherModel,
          serialNumber: asset.otherDetails.otherSerialNumber,
        };
      }

      return {
        assetId: asset.assetId,
        itItemId: asset.itItemId,
        brand: asset.itItem.brand,
        model: asset.itItem.model,
        deviceType: asset.itItem.deviceType,
        departmentName: asset.department.name,
        unitName: asset.unit?.name || 'N/A',
        userName: asset.user.name,
        supplierName: asset.supplier?.name || 'N/A',
        lpoReference: asset.lpoReference || 'N/A',
        purchaseDate: asset.purchaseDate.toISOString(),
        warrantyPeriodMonths: asset.warrantyPeriod,
        status: asset.status,
        remarks: asset.remarks,
        deviceDetails,
      };
    });

    const summary = {
      totalAssets: inventories.length,
      byDeviceType: inventories.reduce((acc, a) => {
        const type = a.itItem.deviceType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byBrand: inventories.reduce((acc, a) => {
        const brand = a.itItem.brand || 'Unknown';
        acc[brand] = (acc[brand] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: {
        ACTIVE: inventories.filter((a) => a.status === 'ACTIVE').length,
        INACTIVE: inventories.filter((a) => a.status === 'INACTIVE').length,
        NON_FUNCTIONAL: inventories.filter((a) => a.status === 'NON_FUNCTIONAL').length,
        OBSOLETE: inventories.filter((a) => a.status === 'OBSOLETE').length,
        DISPOSED: inventories.filter((a) => a.status === 'DISPOSED').length,
      },
      byDepartment: inventories.reduce((acc, a) => {
        const dept = a.department.name || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return { summary, assets };
  }
}

