// import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from 'audit/audit.service';
// import { Queue } from 'bull';
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
    // @InjectQueue('email-queue') private readonly emailQueue: Queue,
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
      department: { select: { name: true } },
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

  // Update Inventory Main Fields (eg., userId, departmentId)
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

      // // Notify stores officer if userId, departmentId, or unitId changed
      // if (notifyFieldsChanged.userId || notifyFieldsChanged.departmentId || notifyFieldsChanged.unitId) {
      //   const storesOfficer = await tx.user.findFirst({
      //     where: { roles: { some: { role: { name: 'stores_officer' } } }, isActive: true },
      //     select: { email: true, name: true },
      //   });

      //   const user = dto.userId
      //     ? await tx.user.findUnique({ where: { id: dto.userId }, select: { name: true } })
      //     : null;
      //   const department = dto.departmentId
      //     ? await tx.department.findUnique({ where: { id: dto.departmentId }, select: { name: true } })
      //     : null;
      //   const unit = dto.unitId
      //     ? await tx.unit.findUnique({ where: { id: dto.unitId }, select: { name: true } })
      //     : null;

      //   if (storesOfficer) {
      //     try {
      //       await this.emailQueue.add(
      //         'send-email',
      //         {
      //           to: storesOfficer.email,
      //           subject: `Inventory ${inventory.assetId} Assignment Updated`,
      //           html: `
      //             <p>Hello ${storesOfficer.name},</p>
      //             <p>Inventory asset ${inventory.assetId} (${inventory.itItem.brand} ${inventory.itItem.model}) has been updated:</p>
      //             ${
      //               notifyFieldsChanged.userId
      //                 ? `<p>- Assigned User changed to: ${user?.name || 'Unknown'}</p>`
      //                 : ''
      //             }
      //             ${
      //               notifyFieldsChanged.departmentId
      //                 ? `<p>- Department changed to: ${department?.name || 'Unknown'}</p>`
      //                 : ''
      //             }
      //             ${
      //               notifyFieldsChanged.unitId
      //                 ? `<p>- Unit changed to: ${unit?.name || (dto.unitId === null ? 'None' : 'Unknown')}</p>`
      //                 : ''
      //             }
      //             <p>Please review the changes in your ISW portal.</p>
      //             <p>Thanks,<br>ISW Team</p>
      //           `,
      //         },
      //         { attempts: 3, backoff: 5000 },
      //       );
      //       auditPayload.details.emailsQueued.storesOfficer = true;
      //     } catch (error) {
      //       console.error(`Failed to queue email for ${storesOfficer.email}:`, error.message);
      //       auditPayload.details.emailsQueued.storesOfficer = false;
      //     }
      //   }
      // }

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

    switch (dto.deviceType) {
      case 'LAPTOP':
        const laptop = await tx.laptopDetails.upsert({
          where: { inventoryId },
          update: {
            laptopBrand: dto.laptopBrand,
            laptopModel: dto.laptopModel,
            laptopSerialNumber: dto.laptopSerialNumber,
            laptopMacAddress: dto.laptopMacAddress,
            laptopProcessorType: dto.laptopProcessorType,
            laptopMemorySize: dto.laptopMemorySize,
            laptopStorageDriveType: dto.laptopStorageDriveType,
            laptopStorageDriveSize: dto.laptopStorageDriveSize,
            laptopOperatingSystem: dto.laptopOperatingSystem,
            laptopEndpointSecurity: dto.laptopEndpointSecurity,
            laptopSpiceworksMonitoring: dto.laptopSpiceworksMonitoring,
          },
          create: {
            inventoryId,
            laptopBrand: dto.laptopBrand,
            laptopModel: dto.laptopModel,
            laptopSerialNumber: dto.laptopSerialNumber,
            laptopMacAddress: dto.laptopMacAddress,
            laptopProcessorType: dto.laptopProcessorType,
            laptopMemorySize: dto.laptopMemorySize,
            laptopStorageDriveType: dto.laptopStorageDriveType,
            laptopStorageDriveSize: dto. laptopStorageDriveSize,
            laptopOperatingSystem: dto.laptopOperatingSystem,
            laptopEndpointSecurity: dto.laptopEndpointSecurity,
            laptopSpiceworksMonitoring: dto.laptopSpiceworksMonitoring,
          },
        });
        actionType = AuditActionType.LAPTOP_DETAILS_UPDATED;
        entityType = 'LaptopDetails';
        entityId = laptop.id;
        newState = {
          laptopBrand: dto.laptopBrand,
          laptopModel: dto.laptopModel,
          laptopSerialNumber: dto.laptopSerialNumber,
          laptopMacAddress: dto.laptopMacAddress,
          laptopProcessorType: dto.laptopProcessorType,
          laptopMemorySize: dto.laptopMemorySize,
          laptopStorageDriveType: dto.laptopStorageDriveType,
          laptopStorageDriveSize: dto.laptopStorageDriveSize,
          laptopOperatingSystem: dto.laptopOperatingSystem,
          laptopEndpointSecurity: dto.laptopEndpointSecurity,
          laptopSpiceworksMonitoring: dto.laptopSpiceworksMonitoring,
        };
        break;

      case 'DESKTOP':
        const desktop = await tx.desktopDetails.upsert({
          where: { inventoryId },
          update: {
            desktopBrand: dto.desktopBrand,
            desktopModel: dto.desktopModel,
            desktopSerialNumber: dto.desktopSerialNumber,
            desktopMonitorBrand: dto.desktopMonitorBrand,
            desktopMonitorModel: dto.desktopMonitorModel,
            desktopMonitorSerialNumber: dto.desktopMonitorSerialNumber,
            desktopMacAddress: dto.desktopMacAddress,
            desktopProcessorType: dto.desktopProcessorType,
            desktopMemorySize: dto.desktopMemorySize,
            desktopStorageDriveType: dto.desktopStorageDriveType,
            desktopStorageDriveSize: dto.desktopStorageDriveSize,
            desktopOperatingSystem: dto.desktopOperatingSystem,
            desktopEndpointSecurity: dto.desktopEndpointSecurity,
            desktopSpiceworksMonitoring: dto.desktopSpiceworksMonitoring,
          },
          create: {
            inventoryId,
            desktopBrand: dto.desktopBrand,
            desktopModel: dto.desktopModel,
            desktopSerialNumber: dto.desktopSerialNumber,
            desktopMonitorBrand: dto.desktopMonitorBrand,
            desktopMonitorModel: dto.desktopMonitorModel,
            desktopMonitorSerialNumber: dto.desktopMonitorSerialNumber,
            desktopMacAddress: dto.desktopMacAddress,
            desktopProcessorType: dto.desktopProcessorType,
            desktopMemorySize: dto.desktopMemorySize,
            desktopStorageDriveType: dto.desktopStorageDriveType,
            desktopStorageDriveSize: dto.desktopStorageDriveSize,
            desktopOperatingSystem: dto.desktopOperatingSystem,
            desktopEndpointSecurity: dto.desktopEndpointSecurity,
            desktopSpiceworksMonitoring: dto.desktopSpiceworksMonitoring,
          },
        });
        actionType = AuditActionType.DESKTOP_DETAILS_UPDATED;
        entityType = 'DesktopDetails';
        entityId = desktop.id;
        newState = {
          desktopBrand: dto.desktopBrand,
          desktopModel: dto.desktopModel,
          desktopSerialNumber: dto.desktopSerialNumber,
          desktopMonitorBrand: dto.desktopMonitorBrand,
          desktopMonitorModel: dto.desktopMonitorModel,
          desktopMonitorSerialNumber: dto.desktopMonitorSerialNumber,
          desktopMacAddress: dto.desktopMacAddress,
          desktopProcessorType: dto.desktopProcessorType,
          desktopMemorySize: dto.desktopMemorySize,
          desktopStorageDriveType: dto.desktopStorageDriveType,
          desktopStorageDriveSize: dto.desktopStorageDriveSize,
          desktopOperatingSystem: dto.desktopOperatingSystem,
          desktopEndpointSecurity: dto.desktopEndpointSecurity,
          desktopSpiceworksMonitoring: dto.desktopSpiceworksMonitoring,
        };
        break;

      case 'PRINTER':
        const printer = await tx.printerDetails.upsert({
          where: { inventoryId },
          update: {
            printerBrand: dto.printerBrand,
            printerModel: dto.printerModel,
            printerSerialNumber: dto.printerSerialNumber,
            printerMacAddress: dto.printerMacAddress,
            printerTonerNumber: dto.printerTonerNumber,
          },
          create: {
            inventoryId,
            printerBrand: dto.printerBrand,
            printerModel: dto.printerModel,
            printerSerialNumber: dto.printerSerialNumber,
            printerMacAddress: dto.printerMacAddress,
            printerTonerNumber: dto.printerTonerNumber,
          },
        });
        actionType = AuditActionType.PRINTER_DETAILS_UPDATED;
        entityType = 'PrinterDetails';
        entityId = printer.id;
        newState = {
          printerBrand: dto.printerBrand,
          printerModel: dto.printerModel,
          printerSerialNumber: dto.printerSerialNumber,
          printerMacAddress: dto.printerMacAddress,
          printerTonerNumber: dto.printerTonerNumber,
        };
        break;

      case 'UPS':
        const ups = await tx.uPSDetails.upsert({
          where: { inventoryId },
          update: {
            upsBrand: dto.upsBrand,
            upsModel: dto.upsModel,
            upsSerialNumber: dto.upsSerialNumber,
          },
          create: {
            inventoryId,
            upsBrand: dto.upsBrand,
            upsModel: dto.upsModel,
            upsSerialNumber: dto.upsSerialNumber,
          },
        });
        actionType = AuditActionType.UPS_DETAILS_UPDATED;
        entityType = 'UPSDetails';
        entityId = ups.id;
        newState = {
          upsBrand: dto.upsBrand,
          upsModel: dto.upsModel,
          upsSerialNumber: dto.upsSerialNumber,
        };
        break;

      case 'OTHER':
        const other = await tx.otherDetails.upsert({
          where: { inventoryId },
          update: {
            otherBrand: dto.otherBrand,
            otherModel: dto.otherModel,
            otherSerialNumber: dto.otherSerialNumber,
            otherMacAddress: dto.otherMacAddress,
            deviceType: dto.deviceTypeOther,
          },
          create: {
            inventoryId,
            otherBrand: dto.otherBrand,
            otherModel: dto.otherModel,
            otherSerialNumber: dto.otherSerialNumber,
            otherMacAddress: dto.otherMacAddress,
            deviceType: dto.deviceTypeOther,
          },
        });
        actionType = AuditActionType.OTHER_DETAILS_UPDATED;
        entityType = 'OtherDetails';
        entityId = other.id;
        newState = {
          otherBrand: dto.otherBrand,
          otherModel: dto.otherModel,
          otherSerialNumber: dto.otherSerialNumber,
          otherMacAddress: dto.otherMacAddress,
          deviceTypeOther: dto.deviceTypeOther,
        };
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
      oldState: null, // Consider fetching old state if needed
      newState: JSON.parse(JSON.stringify(dto)),
      ipAddress,
      userAgent,
      details: { inventoryId },
    };

    await this.auditService.logAction(auditPayload, tx);
    return { message: `Device details for inventory ${inventoryId} updated` };
  });
}
}