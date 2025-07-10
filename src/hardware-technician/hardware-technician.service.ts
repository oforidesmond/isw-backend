import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "audit/audit.service";
import { PrismaService } from "prisma/prisma.service";
import { CreateMaintenanceTicketDto, FilterTicketsDto, SearchDevicesDto, UpdateMaintenanceTicketDto } from "./dto/hardware-technician.dto";
import { Prisma } from "@prisma/client";
import { AuditPayload } from "admin/interfaces/audit-payload.interface";
// import { InjectQueue } from "@nestjs/bull";
// import { Queue } from "bull";

export interface ExtendedAuditPayload extends AuditPayload {
  details: {
    itItemId?: string;
    emailsQueued: {
      user: boolean;
    };
  };
}

@Injectable()
export class HardwareTechnicianService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    // @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  //All users
  async getUsers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        unitId: true,
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Get all technicians
  async getHardwareTechnicians() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        roles: {
          some: {
            role: {
              name: 'hardware_technician',
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        staffId: true, 
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
  
  // Fetch all fixed assets for hardware technician
  async getAllFixedAssets() {
    return this.prisma.inventory.findMany({
      where: {
        itItem: {
          itemClass: 'FIXED_ASSET',
        },
        deletedAt: null,
      },
      select: {
        id: true,
        itItem: {
          select: {
            brand: true,
            model: true,
            deviceType: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roomNo: true
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        purchaseDate: true,
        warrantyPeriod: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createMaintenanceTicket(
    technicianId: string,
    dto: CreateMaintenanceTicketDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id: dto.assetId },
        include: { itItem: { select: { itemClass: true, brand: true, model: true } } },
      });
      if (!inventory) throw new NotFoundException(`Inventory ${dto.assetId} not found`);
      if (inventory.deletedAt) throw new BadRequestException(`Inventory ${dto.assetId} is deleted`);
      if (inventory.itItem.itemClass !== 'FIXED_ASSET') {
        throw new BadRequestException(`Inventory ${dto.assetId} is not a fixed asset`);
      }

      const user = await tx.user.findUnique({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

      const department = await tx.department.findUnique({ where: { id: dto.departmentId } });
      if (!department) throw new NotFoundException(`Department ${dto.departmentId} not found`);

      if (dto.unitId) {
        const unit = await tx.unit.findUnique({ where: { id: dto.unitId } });
        if (!unit) throw new NotFoundException(`Unit ${dto.unitId} not found`);
      }

      const year = new Date().getFullYear();
      const count = await tx.maintenanceTicket.count({ where: { ticketId: { startsWith: `TKT-${year}` } } });
      const ticketId = `TKT-${year}-${String(count + 1).padStart(6, '0')}`;

      const ticket = await tx.maintenanceTicket.create({
        data: {
          ticketId,
          assetId: dto.assetId,
          technicianReceivedById: technicianId,
          userId: dto.userId,
          issueType: dto.issueType,
          departmentId: dto.departmentId,
          unitId: dto.unitId,
          description: dto.description,
          priority: dto.priority,
          remarks: dto.remarks,
        },
      });

      const newState: Prisma.JsonObject = {
        ticketId: ticket.ticketId,
        assetId: ticket.assetId,
        userId: ticket.userId,
        issueType: ticket.issueType,
        departmentId: ticket.departmentId,
        unitId: ticket.unitId,
        description: ticket.description,
        priority: ticket.priority,
        remarks: ticket.remarks,
      };

      const auditPayload: AuditPayload = {
        actionType: 'MAINTENANCE_TICKET_CREATED',
        performedById: technicianId,
        affectedUserId: dto.userId,
        entityType: 'MaintenanceTicket',
        entityId: ticket.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { itItemId: inventory.itItemId },
      };

      // try {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: user.email,
      //       subject: `Maintenance Ticket ${ticket.ticketId} Created`,
      //       html: `
      //         <p>Hello ${user.name},</p>
      //         <p>A maintenance ticket (${ticket.ticketId}) has been created for your device (${inventory.itItem.brand} ${inventory.itItem.model}).</p>
      //         <p>Issue: ${dto.issueType}</p>
      //         <p>Description: ${dto.description}</p>
      //         <p>Priority: ${dto.priority}</p>
      //         <p>Please check the ISW portal for updates.</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details = { ...auditPayload.details, emailsQueued: { user: true } };
      // } catch (error) {
      //   console.error(`Failed to queue email for ${user.email}:`, error.message);
      //   auditPayload.details = { ...auditPayload.details, emailsQueued: { user: false } };
      // }

      await this.auditService.logAction(auditPayload, tx);
      return { message: `Maintenance ticket ${ticket.ticketId} created`, ticketId: ticket.id };
    });
  }

  async searchDevices(dto: SearchDevicesDto) {
    if (!dto.q) {
      throw new BadRequestException('Search query is required');
    }

    const query = dto.q.trim().toLowerCase();

    // Search by assetId (Inventory.id)
    const byAssetId = await this.prisma.inventory.findMany({
      where: {
        id: { contains: query, mode: 'insensitive' },
        deletedAt: null,
        itItem: { itemClass: 'FIXED_ASSET' },
      },
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        user: { select: { name: true } },
        department: { select: { name: true } },
        unit: { select: { name: true } },
        laptopDetails: true,
        desktopDetails: true,
        printerDetails: true,
        upsDetails: true,
        otherDetails: true,
      },
    });

    // Search by user name
    const byUserName = await this.prisma.inventory.findMany({
      where: {
        user: { name: { contains: query, mode: 'insensitive' } },
        deletedAt: null,
        itItem: { itemClass: 'FIXED_ASSET' },
      },
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        user: { select: { name: true } },
        department: { select: { name: true, location: true } },
        unit: { select: { name: true } },
        laptopDetails: true,
        desktopDetails: true,
        printerDetails: true,
        upsDetails: true,
        otherDetails: true,
      },
    });

    // Search by serial number across device details
    const bySerialNumber = await this.prisma.inventory.findMany({
      where: {
        OR: [
          { laptopDetails: { laptopSerialNumber: { contains: query, mode: 'insensitive' } } },
          { desktopDetails: { desktopSerialNumber: { contains: query, mode: 'insensitive' } } },
          { printerDetails: { printerSerialNumber: { contains: query, mode: 'insensitive' } } },
          { upsDetails: { upsSerialNumber: { contains: query, mode: 'insensitive' } } },
          { otherDetails: { otherSerialNumber: { contains: query, mode: 'insensitive' } } },
        ],
        deletedAt: null,
        itItem: { itemClass: 'FIXED_ASSET' },
      },
      include: {
        itItem: { select: { brand: true, model: true, deviceType: true } },
        user: { select: { name: true } },
        department: { select: { name: true, location: true } },
        unit: { select: { name: true } },
        laptopDetails: true,
        desktopDetails: true,
        printerDetails: true,
        upsDetails: true,
        otherDetails: true,
      },
    });

    // Combine and deduplicate results
    const combined = [...byAssetId, ...byUserName, ...bySerialNumber];
    const uniqueDevices = Array.from(new Map(combined.map((item) => [item.id, item])).values());

    return uniqueDevices.map((device) => ({
      inventoryId: device.id,
      assetId: device.assetId,
      brand: device.itItem.brand,
      model: device.itItem.model,
      deviceType: device.itItem.deviceType,
      userId: device.userId,
      userName: device.user?.name || 'Unassigned',
      departmentId: device.departmentId,
      departmentName: device.department?.name || 'None',
      unitId: device.unitId,
      unitName: device.unit?.name || 'None',
      serialNumber:
        device.laptopDetails?.laptopSerialNumber ||
        device.desktopDetails?.desktopSerialNumber ||
        device.printerDetails?.printerSerialNumber ||
        device.upsDetails?.upsSerialNumber ||
        device.otherDetails?.otherSerialNumber ||
        'N/A',
    }));
  }

  async updateMaintenanceTicket(
    ticketId: string,
    technicianId: string,
    dto: UpdateMaintenanceTicketDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.maintenanceTicket.findUnique({
        where: { id: ticketId },
        include: {
          inventory: { include: { itItem: { select: { brand: true, model: true } } } },
          user: { select: { name: true, email: true } },
        },
      });
      if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);
      if (ticket.deletedAt) throw new BadRequestException(`Ticket ${ticketId} is deleted`);

      if (dto.technicianReturnedById) {
        const returnedBy = await tx.user.findUnique({ where: { id: dto.technicianReturnedById } });
        if (!returnedBy) throw new NotFoundException(`Technician ${dto.technicianReturnedById} not found`);
      }

      const oldState: Prisma.JsonObject = {
        actionTaken: ticket.actionTaken,
        technicianReturnedById: ticket.technicianReturnedById,
        dateResolved: ticket.dateResolved?.toISOString(),
        remarks: ticket.remarks,
        auditedById: ticket.auditedById,
        auditDate: ticket.auditDate?.toISOString(),
      };

      const updateData: Prisma.MaintenanceTicketUpdateInput = {
        auditedBy: { connect: { id: technicianId } },
        auditDate: new Date(), 
      };
      if (dto.actionTaken !== undefined) updateData.actionTaken = dto.actionTaken;
      if (dto.technicianReturnedById !== undefined) {
        updateData.technicianReturned = dto.technicianReturnedById
          ? { connect: { id: dto.technicianReturnedById } }
          : { disconnect: true };
      }
      if (dto.dateResolved !== undefined) updateData.dateResolved = dto.dateResolved ? new Date(dto.dateResolved) : null;
      if (dto.remarks !== undefined) updateData.remarks = dto.remarks;

      const updatedTicket = await tx.maintenanceTicket.update({
        where: { id: ticketId },
        data: updateData,
      });

      const newState: Prisma.JsonObject = {
        actionTaken: updatedTicket.actionTaken,
        technicianReturnedById: updatedTicket.technicianReturnedById,
        dateResolved: updatedTicket.dateResolved?.toISOString(),
        remarks: updatedTicket.remarks,
        auditedById: updatedTicket.auditedById,
        auditDate: updatedTicket.auditDate?.toISOString(),
      };

      const auditPayload: ExtendedAuditPayload = {
        actionType: 'MAINTENANCE_TICKET_UPDATED',
        performedById: technicianId,
        affectedUserId: ticket.userId,
        entityType: 'MaintenanceTicket',
        entityId: ticket.id,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { itItemId: ticket.inventory.itItemId, emailsQueued: { user: false } },
      };

      // if (dto.dateResolved) {
      //   try {
      //     await this.emailQueue.add(
      //       'send-email',
      //       {
      //         to: ticket.user.email,
      //         subject: `Maintenance Ticket ${ticket.ticketId} Resolved`,
      //         html: `
      //           <p>Hello ${ticket.user.name},</p>
      //           <p>Your maintenance ticket (${ticket.ticketId}) for device (${ticket.inventory.itItem.brand} ${ticket.inventory.itItem.model}) has been resolved.</p>
      //           <p>Action Taken: ${dto.actionTaken || ticket.actionTaken || 'N/A'}</p>
      //           <p>Resolved On: ${new Date(dto.dateResolved).toLocaleDateString()}</p>
      //           ${dto.remarks ? `<p>Remarks: ${dto.remarks}</p>` : ''}
      //           <p>Please check the ISW portal for details.</p>
      //           <p>Thanks,<br>ISW Team</p>
      //         `,
      //       },
      //       { attempts: 3, backoff: 5000 },
      //     );
      //     auditPayload.details.emailsQueued.user = true;
      //   } catch (error) {
      //     console.error(`Failed to queue email for ${ticket.user.email}:`, error.message);
      //     auditPayload.details.emailsQueued.user = false;
      //   }
      // }
      await this.auditService.logAction(auditPayload, tx);
      return { message: `Maintenance ticket ${updatedTicket.ticketId} updated` };
    });
  }

  async getTickets(technicianId: string, dto: FilterTicketsDto) {
    const where: Prisma.MaintenanceTicketWhereInput = {
      deletedAt: null,
      // technicianReceivedById: technicianId,
    };

      if (dto.technicianReceivedById) {
    where.technicianReceivedById = dto.technicianReceivedById;
  }
    if (dto.priority) where.priority = dto.priority;
    if (dto.issueType) where.issueType = dto.issueType;
    if (dto.technicianReceivedById) where.technicianReceivedById = dto.technicianReceivedById;
    if (dto.userId) where.userId = dto.userId;
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.dateLoggedFrom || dto.dateLoggedTo) {
      where.dateLogged = {};
      if (dto.dateLoggedFrom) where.dateLogged.gte = new Date(dto.dateLoggedFrom);
      if (dto.dateLoggedTo) where.dateLogged.lte = new Date(dto.dateLoggedTo);
    }
    if (dto.dateResolvedFrom || dto.dateResolvedTo) {
      where.dateResolved = {};
      if (dto.dateResolvedFrom) where.dateResolved.gte = new Date(dto.dateResolvedFrom);
      if (dto.dateResolvedTo) where.dateResolved.lte = new Date(dto.dateResolvedTo);
    }
    if (dto.status) {
      // Map custom status to fields (infer from dateResolved)
      if (dto.status === 'OPEN') where.dateResolved = null;
      if (dto.status === 'RESOLVED') where.dateResolved = { not: null };
    }

    const tickets = await this.prisma.maintenanceTicket.findMany({
      where,
      include: {
        inventory: { include: { itItem: { select: { brand: true, model: true } } } },
        user: { select: { name: true } },
        department: { select: { name: true, location: true } },
        unit: { select: { name: true } },
        technicianReceived: { select: { name: true } },
        technicianReturned: { select: { name: true } },
      },
      orderBy: { dateLogged: 'desc' },
    });

    return tickets.map((ticket) => ({
      id: ticket.id,
      ticketId: ticket.ticketId,
      assetId: ticket.assetId,
      brand: ticket.inventory.itItem.brand,
      model: ticket.inventory.itItem.model,
      userId: ticket.userId,
      userName: ticket.user.name,
      issueType: ticket.issueType,
      departmentId: ticket.departmentId,
      departmentName: ticket.department.name,
      departmentLocation: ticket.department.location,
      unitId: ticket.unitId,
      unitName: ticket.unit?.name || 'None',
      description: ticket.description,
      priority: ticket.priority,
      actionTaken: ticket.actionTaken,
      technicianReceivedById: ticket.technicianReceivedById,
      technicianReceivedName: ticket.technicianReceived.name,
      technicianReturnedById: ticket.technicianReturnedById,
      technicianReturnedName: ticket.technicianReturned?.name || 'N/A',
      dateLogged: ticket.dateLogged.toISOString(),
      dateResolved: ticket.dateResolved?.toISOString(),
      remarks: ticket.remarks,
    }));
  }

  async generateReport(
  reportType: string,
  filters: {
    startDate?: string;
    endDate?: string;
    deviceType?: string;
    status?: string;
    userId?: string;
    departmentId?: string;
    priority?: string;
    issueType?: string;
    brand?: string;
    model?: string;
    technicianReceivedById?: string;
    technicianReturnedById?: string;
  },
  technicianId: string,
) {
  if (reportType !== 'maintenance_tickets') {
    throw new BadRequestException('Invalid report type. Must be: maintenance_tickets');
  }

  // Validate dates
  if (filters.startDate && isNaN(Date.parse(filters.startDate))) {
    throw new BadRequestException('Invalid startDate format');
  }
  if (filters.endDate && isNaN(Date.parse(filters.endDate))) {
    throw new BadRequestException('Invalid endDate format');
  }
  if (filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate)) {
    throw new BadRequestException('startDate must be before endDate');
  }

  // Build where clause
  const where: any = {
    deletedAt: null,
    // Optionally restrict to tickets received by the current technician
    // technicianReceivedById: technicianId,
  };
  if (filters.startDate) where.dateLogged = { gte: new Date(filters.startDate) };
  if (filters.endDate) where.dateLogged = { ...where.dateLogged, lte: new Date(filters.endDate) };
  if (filters.deviceType) where.inventory = { itItem: { deviceType: filters.deviceType } };
  if (filters.brand) where.inventory = { ...where.inventory, itItem: { ...where.inventory?.itItem, brand: { contains: filters.brand, mode: 'insensitive' } } };
  if (filters.model) where.inventory = { ...where.inventory, itItem: { ...where.inventory?.itItem, model: { contains: filters.model, mode: 'insensitive' } } };
  if (filters.userId) where.userId = filters.userId;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.issueType) where.issueType = filters.issueType;
  if (filters.technicianReceivedById) where.technicianReceivedById = filters.technicianReceivedById;
  if (filters.technicianReturnedById) where.technicianReturnedById = filters.technicianReturnedById;
  if (filters.status) {
    if (filters.status === 'OPEN') where.dateResolved = null;
    if (filters.status === 'RESOLVED') where.dateResolved = { not: null };
  }

  const [data, total] = await Promise.all([
    this.prisma.maintenanceTicket.findMany({
      where,
      include: {
        inventory: {
          include: {
            itItem: { select: { brand: true, model: true, deviceType: true } },
            supplier: { select: { name: true, supplierID: true } },
            stockReceived: { select: { lpoReference: true, voucherNumber: true } },
          },
        },
        user: { select: { name: true } },
        department: { select: { name: true, location: true } },
        unit: { select: { name: true } },
        technicianReceived: { select: { name: true } },
        technicianReturned: { select: { name: true } },
      },
      orderBy: { dateLogged: 'desc' },
    }),
    this.prisma.maintenanceTicket.count({ where }),
  ]);

  const formattedData = data.map((ticket) => ({
    id: ticket.id,
    ticketId: ticket.ticketId,
    assetId: ticket.assetId,
    brand: ticket.inventory.itItem.brand,
    model: ticket.inventory.itItem.model,
    deviceType: ticket.inventory.itItem.deviceType,
    userId: ticket.userId,
    userName: ticket.user.name,
    issueType: ticket.issueType,
    departmentId: ticket.departmentId,
    departmentName: ticket.department.name,
    departmentLocation: ticket.department.location,
    unitId: ticket.unitId,
    unitName: ticket.unit?.name || 'None',
    description: ticket.description,
    priority: ticket.priority,
    actionTaken: ticket.actionTaken,
    technicianReceivedById: ticket.technicianReceivedById,
    technicianReceivedName: ticket.technicianReceived.name,
    technicianReturnedById: ticket.technicianReturnedById,
    technicianReturnedName: ticket.technicianReturned?.name || 'N/A',
    dateLogged: ticket.dateLogged.toISOString(),
    dateResolved: ticket.dateResolved?.toISOString(),
    remarks: ticket.remarks,
    supplier: ticket.inventory.supplier ? { name: ticket.inventory.supplier.name, supplierID: ticket.inventory.supplier.supplierID } : null,
    lpoReference: ticket.inventory.stockReceived?.lpoReference || null,
    voucherNumber: ticket.inventory.stockReceived?.voucherNumber || null,
  }));

  return {
    reportType,
    filters,
    data: formattedData,
    meta: { totalRecords: total, generatedAt: new Date().toISOString() },
   };
  }
}