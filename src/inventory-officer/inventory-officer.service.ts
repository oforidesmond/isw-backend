import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from 'audit/audit.service';
import { Queue } from 'bull';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateDeviceDetailsDto, UpdateInventoryDto } from './dto/update-inventory.dto';
import { AuditActionType, InventoryStatus, Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    itItemId?: string;
    emailsQueued: {
      storesOfficer: boolean;
    };
  };
}

@Injectable()
export class InventoryOfficerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

   //Get device fields
   async getDeviceFields() {
    return {
      LAPTOP: [
        { name: 'laptopBrand', label: 'Brand', disabled: true },
        { name: 'laptopModel', label: 'Model' },
        { name: 'laptopSerialNumber', label: 'Serial Number' },
        { name: 'laptopMacAddress', label: 'MAC Address' },
        { name: 'laptopProcessorType', label: 'Processor' },
        { name: 'laptopMemorySize', label: 'Memory Size' },
        { name: 'laptopStorageDriveType', label: 'Drive Type' },
        { name: 'laptopStorageDriveSize', label: 'Drive Size' },
        { name: 'laptopOperatingSystem', label: 'OS' },
        { name: 'laptopEndpointSecurity', label: 'Endpoint Security', type: 'switch' },
        { name: 'laptopSpiceworksMonitoring', label: 'Spiceworks Monitoring', type: 'switch' },
      ],
      DESKTOP: [
        { name: 'desktopBrand', label: 'Brand', disabled: true },
        { name: 'desktopModel', label: 'Model' },
        { name: 'desktopSerialNumber', label: 'Serial Number' },
        { name: 'desktopMonitorBrand', label: 'Monitor Brand' },
        { name: 'desktopMonitorModel', label: 'Monitor Model' },
        { name: 'desktopMonitorSerialNumber', label: 'Monitor Serial Number' },
        { name: 'desktopMacAddress', label: 'MAC Address' },
        { name: 'desktopProcessorType', label: 'Processor' },
        { name: 'desktopMemorySize', label: 'Memory Size' },
        { name: 'desktopStorageDriveType', label: 'Drive Type' },
        { name: 'desktopStorageDriveSize', label: 'Drive Size' },
        { name: 'desktopOperatingSystem', label: 'OS' },
        { name: 'desktopEndpointSecurity', label: 'Endpoint Security', type: 'switch' },
        { name: 'desktopSpiceworksMonitoring', label: 'Spiceworks Monitoring', type: 'switch' },
      ],
      PRINTER: [
        { name: 'printerBrand', label: 'Brand', disabled: true },
        { name: 'printerModel', label: 'Model' },
        { name: 'printerSerialNumber', label: 'Serial Number' },
        { name: 'printerMacAddress', label: 'MAC Address' },
        { name: 'printerTonerNumber', label: 'Toner Number' },
      ],
      UPS: [
        { name: 'upsBrand', label: 'Brand', disabled: true },
        { name: 'upsModel', label: 'Model' },
        { name: 'upsSerialNumber', label: 'Serial Number' },
      ],
      OTHER: [
        { name: 'otherBrand', label: 'Brand', disabled: true },
        { name: 'otherModel', label: 'Model' },
        { name: 'otherSerialNumber', label: 'Serial Number' },
        { name: 'otherMacAddress', label: 'MAC Address' },
        { name: 'deviceTypeOther', label: 'Device Type' },
      ],
    };
  }

  // Get All Inventory Items
  async getAllInventory() {
    return this.prisma.inventory.findMany({
      where: { deletedAt: null },
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
      orderBy: { createdAt: 'desc' },
    });
  }

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

  //Update Inventory Main Fields (eg., userId, departmentId)
  async updateInventory(
    inventoryId: string,
    officerId: string,
    dto: UpdateInventoryDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: { itItem: { select: { itemClass: true, brand: true, model: true } } },
      });
      if (!inventory) throw new NotFoundException(`Inventory ${inventoryId} not found`);
      if (inventory.deletedAt) throw new BadRequestException(`Inventory ${inventoryId} is deleted`);
      if (inventory.itItem.itemClass !== 'FIXED_ASSET') {
        throw new BadRequestException(`Inventory ${inventoryId} is not a fixed asset`);
      }

      const oldState: Prisma.JsonObject = {
        status: inventory.status,
        userId: inventory.userId,
        departmentId: inventory.departmentId,
        unitId: inventory.unitId,
        remarks: inventory.remarks,
        markedObsoleteById: inventory.markedObsoleteById,
        disposedById: inventory.disposedById,
        disposalDate: inventory.disposalDate ? inventory.disposalDate.toISOString() : null,
      };

      const updateData: any = {};
      const notifyFieldsChanged = {
        userId: dto.userId && dto.userId !== inventory.userId,
        departmentId: dto.departmentId && dto.departmentId !== inventory.departmentId,
        unitId: dto.unitId && dto.unitId !== inventory.unitId,
      };

      if (dto.userId) updateData.userId = dto.userId;
      if (dto.departmentId) updateData.departmentId = dto.departmentId;
      if (dto.unitId !== undefined) updateData.unitId = dto.unitId;
      if (dto.remarks) updateData.remarks = dto.remarks;
      if (dto.status) {
        updateData.status = dto.status;
        updateData.statusChangedAt = new Date();
      }
      if (dto.markedObsolete) {
        updateData.markedObsoleteById = officerId;
      }
      if (dto.disposed) {
        updateData.disposedById = officerId;
        updateData.disposalDate = new Date();
        updateData.status = InventoryStatus.DISPOSED;
      }

      const updatedInventory = await tx.inventory.update({
        where: { id: inventoryId },
        data: updateData,
      });

      const newState: Prisma.JsonObject = {
        status: updatedInventory.status,
        userId: updatedInventory.userId,
        departmentId: updatedInventory.departmentId,
        unitId: updatedInventory.unitId,
        remarks: updatedInventory.remarks,
        markedObsoleteById: updatedInventory.markedObsoleteById,
        disposedById: updatedInventory.disposedById,
        disposalDate: updatedInventory.disposalDate ? updatedInventory.disposalDate.toISOString() : null,
      };

      const auditPayload: ExtendedAuditPayload = {
        actionType: 'INVENTORY_UPDATED',
        performedById: officerId,
        affectedUserId: updatedInventory.userId,
        entityType: 'Inventory',
        entityId: inventoryId,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { itItemId: inventory.itItemId, emailsQueued: { storesOfficer: false } },
      };

      // Notify stores officer if userId, departmentId, or unitId changed
      if (notifyFieldsChanged.userId || notifyFieldsChanged.departmentId || notifyFieldsChanged.unitId) {
        const storesOfficer = await tx.user.findFirst({
          where: { roles: { some: { role: { name: 'stores_officer' } } }, isActive: true },
          select: { email: true, name: true },
        });

        const user = dto.userId
        ? await tx.user.findUnique({ where: { id: dto.userId }, select: { name: true } })
        : null;
      const department = dto.departmentId
        ? await tx.department.findUnique({ where: { id: dto.departmentId }, select: { name: true } })
        : null;
      const unit = dto.unitId
        ? await tx.unit.findUnique({ where: { id: dto.unitId }, select: { name: true } })
        : null;

        if (storesOfficer) {
          try {
            await this.emailQueue.add(
              'send-email',
              {
                to: storesOfficer.email,
                subject: `Inventory ${inventory.assetId} Assignment Updated`,
                html: `
                  <p>Hello ${storesOfficer.name},</p>
                  <p>Inventory asset ${inventory.assetId} (${inventory.itItem.brand} ${inventory.itItem.model}) has been updated:</p>
                  ${
                    notifyFieldsChanged.userId
                      ? `<p>- Assigned User changed to: ${user?.name || 'Unknown'}</p>`
                      : ''
                  }
                  ${
                    notifyFieldsChanged.departmentId
                      ? `<p>- Department changed to: ${department?.name || 'Unknown'}</p>`
                      : ''
                  }
                  ${
                    notifyFieldsChanged.unitId
                      ? `<p>- Unit changed to: ${unit?.name || (dto.unitId === null ? 'None' : 'Unknown')}</p>`
                      : ''
                  }
                  <p>Please review the changes in your ISW portal.</p>
                  <p>Thanks,<br>ISW Team</p>
                `,
              },
              { attempts: 3, backoff: 5000 },
            );
            auditPayload.details.emailsQueued.storesOfficer = true;
          } catch (error) {
            console.error(`Failed to queue email for ${storesOfficer.email}:`, error.message);
            auditPayload.details.emailsQueued.storesOfficer = false;
          }
        }
      }

      await this.auditService.logAction(auditPayload, tx);
      return { message: `Inventory ${inventoryId} updated` };
    });
  }

  //Update Inventory Device-Specific Details (eg., LaptopModel)
  async updateDeviceDetails(
    inventoryId: string,
    officerId: string,
    dto: UpdateDeviceDetailsDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Fetch inventory details
      const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: { itItem: { select: { deviceType: true, itemClass: true } } },
      });
      if (!inventory) throw new NotFoundException(`Inventory ${inventoryId} not found`);
      if (inventory.deletedAt) throw new BadRequestException(`Inventory ${inventoryId} is deleted`);
      if (inventory.itItem.itemClass !== 'FIXED_ASSET') {
        throw new BadRequestException(`Inventory ${inventoryId} is not a fixed asset`);
      }
      if (inventory.itItem.deviceType !== dto.deviceType) {
        throw new BadRequestException(`Device type ${dto.deviceType} does not match inventory`);
      }
  
      let actionType: AuditActionType;
      let entityType: string;
      let entityId: string;
      let newState: any;
  
      // Define required and allowed fields for each device type
      const requiredFields: { [key: string]: string[] } = {
        LAPTOP: ['laptopBrand', 'laptopModel', 'laptopSerialNumber'],
        DESKTOP: ['desktopBrand', 'desktopModel', 'desktopSerialNumber'],
        PRINTER: ['printerBrand', 'printerModel', 'printerSerialNumber'],
        UPS: ['upsBrand', 'upsModel', 'upsSerialNumber'],
        OTHER: ['otherBrand', 'otherModel', 'otherSerialNumber'],
      };
  
      const allowedFields: { [key: string]: string[] } = {
        LAPTOP: [
          'laptopBrand',
          'laptopModel',
          'laptopSerialNumber',
          'laptopMacAddress',
          'laptopProcessorType',
          'laptopMemorySize',
          'laptopStorageDriveType',
          'laptopStorageDriveSize',
          'laptopOperatingSystem',
          'laptopEndpointSecurity',
          'laptopSpiceworksMonitoring',
        ],
        DESKTOP: [
          'desktopBrand',
          'desktopModel',
          'desktopSerialNumber',
          'desktopMonitorBrand',
          'desktopMonitorModel',
          'desktopMonitorSerialNumber',
          'desktopMacAddress',
          'desktopProcessorType',
          'desktopMemorySize',
          'desktopStorageDriveType',
          'desktopStorageDriveSize',
          'desktopOperatingSystem',
          'desktopEndpointSecurity',
          'desktopSpiceworksMonitoring',
        ],
        PRINTER: ['printerBrand', 'printerModel', 'printerSerialNumber', 'printerMacAddress', 'printerTonerNumber'],
        UPS: ['upsBrand', 'upsModel', 'upsSerialNumber'],
        OTHER: ['otherBrand', 'otherModel', 'otherSerialNumber', 'otherMacAddress', 'deviceTypeOther'],
      };
  
      // Check for required fields
      const missingRequiredFields = requiredFields[dto.deviceType]?.filter(field => dto[field] === undefined || dto[field] === null);
      if (missingRequiredFields?.length > 0) {
        throw new BadRequestException(`Missing required fields for ${dto.deviceType}: ${missingRequiredFields.join(', ')}`);
      }
  
      // Check for invalid fields
      const providedFields = Object.keys(dto).filter(key => key !== 'deviceType' && dto[key] !== undefined);
      const invalidFields = providedFields.filter(field => !allowedFields[dto.deviceType]?.includes(field));
      if (invalidFields.length > 0) {
        throw new BadRequestException(`Invalid fields for ${dto.deviceType}: ${invalidFields.join(', ')}`);
      }

       // Helper function to build update and create data
       const buildUpdateData = (fields: string[], dto: UpdateDeviceDetailsDto) => {
        const updateData: any = {};
        const createData: any = { inventoryId };

        fields.forEach((field) => {
          const value = dto[field];
          if (value !== undefined && value !== null && value !== '') {
            if (['laptopEndpointSecurity', 'laptopSpiceworksMonitoring', 'desktopEndpointSecurity', 'desktopSpiceworksMonitoring'].includes(field)) {
              updateData[field] = value === 'true' || value === true ? true : value === 'false' || value === false ? false : null;
              createData[field] = value === 'true' || value === true ? true : value === 'false' || value === false ? false : null;
            } else {
              updateData[field] = value;
              createData[field] = value;
            }
          }
        });

        return { updateData, createData };
      };
  
      switch (dto.deviceType) {
        case 'LAPTOP':
          const { updateData: laptopUpdate, createData: laptopCreate } = buildUpdateData(
            allowedFields.LAPTOP,
            dto,
          );
          const laptop = await tx.laptopDetails.upsert({
            where: { inventoryId },
            update: laptopUpdate,
            create: {
              ...laptopCreate,
              laptopBrand: dto.laptopBrand || '',
              laptopModel: dto.laptopModel || '',
              laptopSerialNumber: dto.laptopSerialNumber || '',
              laptopMacAddress: laptopCreate.laptopMacAddress || '',
              laptopProcessorType: laptopCreate.laptopProcessorType || '',
              laptopMemorySize: laptopCreate.laptopMemorySize || '',
              laptopStorageDriveType: laptopCreate.laptopStorageDriveType || '',
              laptopStorageDriveSize: laptopCreate.laptopStorageDriveSize || '',
              laptopOperatingSystem: laptopCreate.laptopOperatingSystem || '',
              laptopEndpointSecurity: laptopCreate.laptopEndpointSecurity ?? null,
              laptopSpiceworksMonitoring: laptopCreate.laptopSpiceworksMonitoring ?? null,
            },
          });
          actionType = AuditActionType.LAPTOP_DETAILS_UPDATED;
          entityType = 'LaptopDetails';
          entityId = laptop.inventoryId; 
          newState = { ...laptopUpdate };
          break;

        case 'DESKTOP':
          const { updateData: desktopUpdate, createData: desktopCreate } = buildUpdateData(
            allowedFields.DESKTOP,
            dto,
          );
          const desktop = await tx.desktopDetails.upsert({
            where: { inventoryId },
            update: desktopUpdate,
            create: {
              ...desktopCreate,
              desktopBrand: dto.desktopBrand || '',
              desktopModel: dto.desktopModel || '',
              desktopSerialNumber: dto.desktopSerialNumber || '',
              desktopMonitorBrand: desktopCreate.desktopMonitorBrand || '',
              desktopMonitorModel: desktopCreate.desktopMonitorModel || '',
              desktopMonitorSerialNumber: desktopCreate.desktopMonitorSerialNumber || '',
              desktopMacAddress: desktopCreate.desktopMacAddress || '',
              desktopProcessorType: desktopCreate.desktopProcessorType || '',
              desktopMemorySize: desktopCreate.desktopMemorySize || '',
              desktopStorageDriveType: desktopCreate.desktopStorageDriveType || '',
              desktopStorageDriveSize: desktopCreate.desktopStorageDriveSize || '',
              desktopOperatingSystem: desktopCreate.desktopOperatingSystem || '',
              desktopEndpointSecurity: desktopCreate.desktopEndpointSecurity ?? null,
              desktopSpiceworksMonitoring: desktopCreate.desktopSpiceworksMonitoring ?? null,
            },
          });
          actionType = AuditActionType.DESKTOP_DETAILS_UPDATED;
          entityType = 'DesktopDetails';
          entityId = desktop.inventoryId;
          newState = { ...desktopUpdate };
          break;

        case 'PRINTER':
          const { updateData: printerUpdate, createData: printerCreate } = buildUpdateData(
            allowedFields.PRINTER,
            dto,
          );
          const printer = await tx.printerDetails.upsert({
            where: { inventoryId },
            update: printerUpdate,
            create: {
              ...printerCreate,
              printerBrand: dto.printerBrand || '',
              printerModel: dto.printerModel || '',
              printerSerialNumber: dto.printerSerialNumber || '',
              printerMacAddress: printerCreate.printerMacAddress || '',
              printerTonerNumber: printerCreate.printerTonerNumber || '',
            },
          });
          actionType = AuditActionType.PRINTER_DETAILS_UPDATED;
          entityType = 'PrinterDetails';
          entityId = printer.inventoryId;
          newState = { ...printerUpdate };
          break;

        case 'UPS':
          const { updateData: upsUpdate, createData: upsCreate } = buildUpdateData(
            allowedFields.UPS,
            dto,
          );
          const ups = await tx.uPSDetails.upsert({
            where: { inventoryId },
            update: upsUpdate,
            create: {
              ...upsCreate,
              upsBrand: dto.upsBrand || '',
              upsModel: dto.upsModel || '',
              upsSerialNumber: dto.upsSerialNumber || '',
            },
          });
          actionType = AuditActionType.UPS_DETAILS_UPDATED;
          entityType = 'UPSDetails';
          entityId = ups.inventoryId;
          newState = { ...upsUpdate };
          break;

        case 'OTHER':
          const { updateData: otherUpdate, createData: otherCreate } = buildUpdateData(
            allowedFields.OTHER,
            dto,
          );
          const other = await tx.otherDetails.upsert({
            where: { inventoryId },
            update: otherUpdate,
            create: {
              ...otherCreate,
              otherBrand: dto.otherBrand || '',
              otherModel: dto.otherModel || '',
              otherSerialNumber: dto.otherSerialNumber || '',
              otherMacAddress: otherCreate.otherMacAddress || '',
              deviceTypeOther: otherCreate.deviceTypeOther || '',
            },
          });
          actionType = AuditActionType.OTHER_DETAILS_UPDATED;
          entityType = 'OtherDetails';
          entityId = other.inventoryId;
          newState = { ...otherUpdate };
          break;

        default:
          throw new BadRequestException(`Invalid device type: ${dto.deviceType}`);
      }

      const auditPayload: AuditPayload = {
        actionType,
        performedById: officerId,
        affectedUserId: inventory.userId,
        entityType,
        entityId,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { inventoryId },
      };

      await this.auditService.logAction(auditPayload, tx);
      return { message: `Device details for inventory ${inventoryId} updated` };
    });
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
      unitId?: string;
      serialNumber?: string;
      warrantyPeriod?: string | number;
    },
  ) {
    if (reportType !== 'inventory') {
      throw new BadRequestException('Invalid report type. Must be: inventory');
    }
    if (typeof filters.warrantyPeriod === 'string') {
    filters.warrantyPeriod = parseInt(filters.warrantyPeriod, 10);
    }
    if (filters.startDate && isNaN(Date.parse(filters.startDate))) {
      throw new BadRequestException('Invalid startDate format');
    }
    if (filters.endDate && isNaN(Date.parse(filters.endDate))) {
      throw new BadRequestException('Invalid endDate format');
    }
    if (filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const where: any = { 
      deletedAt: null,
      itItem: { itemClass: 'FIXED_ASSET' },
    };
    if (filters.startDate) where.purchaseDate = { gte: new Date(filters.startDate) };
    if (filters.endDate) where.purchaseDate = { ...where.purchaseDate, lte: new Date(filters.endDate) };
    if (filters.deviceType) where.itItem = { ...where.itItem, deviceType: filters.deviceType };
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.unitId) where.unitId = filters.unitId;
    if (filters.warrantyPeriod) where.warrantyPeriod = filters.warrantyPeriod;
    if (filters.serialNumber) {
      where.OR = [
        { laptopDetails: { laptopSerialNumber: { contains: filters.serialNumber, mode: 'insensitive' } } },
        { desktopDetails: { desktopSerialNumber: { contains: filters.serialNumber, mode: 'insensitive' } } },
        { printerDetails: { printerSerialNumber: { contains: filters.serialNumber, mode: 'insensitive' } } },
        { upsDetails: { upsSerialNumber: { contains: filters.serialNumber, mode: 'insensitive' } } },
        { otherDetails: { otherSerialNumber: { contains: filters.serialNumber, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          itItem: { select: { brand: true, model: true, deviceType: true } },
          user: { select: { name: true, email: true } },
          department: { select: { name: true } },
          unit: { select: { name: true } },
          laptopDetails: true,
          desktopDetails: true,
          printerDetails: true,
          upsDetails: true,
          otherDetails: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    const formattedData = data.map((item) => ({
      id: item.id,
      assetId: item.assetId,
      brand: item.itItem.brand,
      model: item.itItem.model,
      deviceType: item.itItem.deviceType,
      userId: item.userId,
      userName: item.user?.name || 'Unassigned',
      userEmail: item.user?.email || 'N/A',
      departmentId: item.departmentId,
      departmentName: item.department?.name || 'None',
      unitId: item.unitId,
      unitName: item.unit?.name || 'None',
      status: item.status,
      purchaseDate: item.purchaseDate.toISOString(),
      warrantyPeriod: item.warrantyPeriod,
      serialNumber:
        item.laptopDetails?.laptopSerialNumber ||
        item.desktopDetails?.desktopSerialNumber ||
        item.printerDetails?.printerSerialNumber ||
        item.upsDetails?.upsSerialNumber ||
        item.otherDetails?.otherSerialNumber ||
        'N/A',
      details: {
        laptop: item.laptopDetails || null,
        desktop: item.desktopDetails || null,
        printer: item.printerDetails || null,
        ups: item.upsDetails || null,
        other: item.otherDetails || null,
      },
    }));

    return {
      reportType,
      filters,
      data: formattedData,
      meta: { totalRecords: total, generatedAt: new Date().toISOString() },
    };
  }

}