import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateITItemDto } from "admin/dto/create-it-item.dto";
import { AuditPayload } from "admin/interfaces/audit-payload.interface";
import { AuditService } from "audit/audit.service";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class AdminITItemsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

 // fetch available IT items
 async getAvailableITItems() {
  return this.prisma.iTItem.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      itemID: true,
      deviceType: true,
      itemClass: true,
      brand: true,
      model: true,
      specifications: true,
    },
    orderBy: { brand: 'asc' },
  });
}

// Soft delete an IT item
async softDeleteITItem(
itItemId: string,
adminId: string,
ipAddress?: string,
userAgent?: string,
) {
return this.prisma.$transaction(async (tx) => {
  const itItem = await tx.iTItem.findUnique({
    where: { id: itItemId },
    include: { stock: true },
  });

  if (!itItem) {
    throw new NotFoundException(`IT Item with ID ${itItemId} not found`);
  }

  if (itItem.deletedAt) {
    throw new BadRequestException(`IT Item with ID ${itItemId} is already deleted`);
  }

  await tx.iTItem.update({
    where: { id: itItemId },
    data: { deletedAt: new Date() },
  });

  // Soft delete associated Stock record (if it exists)
  if (itItem.stock) {
    await tx.stock.update({
      where: { id: itItem.stock.id },
      data: { deletedAt: new Date() },
    });
  }

  const oldState: Prisma.JsonObject = {
    itemID: itItem.itemID,
    deviceType: itItem.deviceType,
    itemClass: itItem.itemClass,
    brand: itItem.brand,
    model: itItem.model,
    defaultWarranty: itItem.defaultWarranty,
    supplierId: itItem.supplierId,
  };

  const auditPayload: AuditPayload = {
    actionType: 'IT_ITEM_DELETED',
    performedById: adminId,
    affectedUserId: null,
    entityType: 'ITItem',
    entityId: itItem.id,
    oldState,
    newState: null,
    ipAddress,
    userAgent,
    details: { softDelete: true },
  };

  await this.auditService.logAction(auditPayload, tx);

  return { message: `IT Item ${itItem.itemID} soft-deleted successfully` };
});
}
  
  async createITItem(adminId: string, dto: CreateITItemDto, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Validate supplier if provided
      if (dto.supplierId) {
        const supplier = await tx.supplier.findUnique({ where: { id: dto.supplierId } });
        if (!supplier) throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
      }

      // Generate itemID using a sequence
      const sequenceResult = await tx.$queryRaw<{ nextval: bigint }[]>( 
        Prisma.sql`SELECT nextval('it_item_seq')`
      );
      const sequenceNumber = sequenceResult[0].nextval;
      const itemID = `IT-${String(sequenceNumber).padStart(6, '0')}`;

      const itItem = await tx.iTItem.create({
        data: {
          itemID: itemID,
          deviceType: dto.deviceType,
          itemClass: dto.itemClass,
          brand: dto.brand,
          model: dto.model,
          defaultWarranty: dto.defaultWarranty,
          supplierId: dto.supplierId,
          validationRules: dto.validationRules,
          specifications: dto.specifications
        },
      });

      // Create initial Stock entry with zero quantity
      await tx.stock.create({
        data: {
          itItemId: itItem.id,
          quantityInStock: 0,
        },
      });

      const newState: Prisma.JsonObject = {
        itemID: itItem.itemID,
        deviceType: itItem.deviceType,
        itemClass: itItem.itemClass,
        brand: itItem.brand,
        model: itItem.model,
        defaultWarranty: itItem.defaultWarranty,
        supplierId: itItem.supplierId,
      };

      const auditPayload: AuditPayload = {
        actionType: 'IT_ITEM_CREATED',
        performedById: adminId,
        affectedUserId: adminId,
        entityType: 'ITItem',
        entityId: itItem.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { supplierId: dto.supplierId },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `ITItem ${itItem.itemID} created`, itItemId: itItem.id };
    });
  }
}

