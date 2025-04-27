import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "audit/audit.service";
import { PrismaService } from "prisma/prisma.service";
import { CreateMaintenanceTicketDto, SearchDevicesDto } from "./dto/hardware-technician.dto";
import { Prisma } from "@prisma/client";
import { AuditPayload } from "admin/interfaces/audit-payload.interface";
// import { InjectQueue } from "@nestjs/bull";
// import { Queue } from "bull";

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
    const query = dto.query.trim().toLowerCase();

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
        department: { select: { name: true } },
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
        department: { select: { name: true } },
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
}