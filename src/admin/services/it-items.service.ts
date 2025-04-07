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
          validationRules: dto.validationRules ? JSON.stringify(dto.validationRules) : undefined,
          specifications: dto.specifications ? JSON.stringify(dto.specifications) : undefined,
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

