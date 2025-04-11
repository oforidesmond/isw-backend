import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { MaintenanceReportDto, OverdueTicketsReportDto, WorkReportDto } from './dto/supervisor.dto';

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
}