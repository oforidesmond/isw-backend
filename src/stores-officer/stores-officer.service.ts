// import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { AuditService } from 'audit/audit.service';
// import { Queue } from 'bull';
import { PrismaService } from 'prisma/prisma.service';
import { CreateStockReceivedDto } from './dto/create-stock-received.dto';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    itItemId?: string;
    quantity: number;
    itemClass: string;
    inventoryId?: string;
    emailsQueued: {
      submitter: boolean;
      storesOfficer: boolean;
    };
  };
}

@Injectable()
export class StoresOfficerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    // @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async getApprovedRequisitions() {
    return this.prisma.requisition.findMany({
      where: {
        status: 'ITD_APPROVED',
        deletedAt: null,
      },
      include: {
        staff: { select: { id: true, name: true, email: true } },
        itItem: { select: { id: true, brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async issueRequisition(
    requisitionId: string,
    storesOfficerId: string,
    data: {
      itItemId: string;
      quantity: number;
      stockBatchId: string;
      deviceDetails?: Record<string, any>;
      disbursementNote?: string;
      remarks?: string; 
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id: requisitionId },
        include: {
          staff: { select: { email: true, name: true } },
          issuedBy: { select: { email: true, name: true } },
        },
      });
      if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
      if (requisition.deletedAt) throw new BadRequestException(`Requisition ${requisitionId} is deleted`);
      if (requisition.status !== 'ITD_APPROVED') throw new BadRequestException(`Requisition ${requisitionId} not fully approved`);

      const itItem = await tx.iTItem.findUnique({ where: { id: data.itItemId } });
      if (!itItem) throw new BadRequestException(`ITItem ${data.itItemId} not found`);

      const stock = await tx.stock.findUnique({ where: { itItemId: data.itItemId } });
      if (!stock || stock.quantityInStock < data.quantity) {
        throw new BadRequestException(`Insufficient stock for item ${data.itItemId}`);
      }

      const stockBatch = await tx.stockBatch.findUnique({ where: { id: data.stockBatchId } });
      if (!stockBatch || stockBatch.quantity < data.quantity || stockBatch.deletedAt) {
        throw new BadRequestException(`Invalid, insufficient, or deleted stock batch ${data.stockBatchId}`);
      }

      const storesOfficer = await tx.user.findUnique({ where: { id: storesOfficerId }, select: { email: true, name: true } });
      if (!storesOfficer) throw new NotFoundException(`Stores officer ${storesOfficerId} not found`);

      const oldState: Prisma.JsonObject = { status: requisition.status };

      const updatedRequisition = await tx.requisition.update({
        where: { id: requisitionId },
        data: {
          status: 'PROCESSED',
          issuedById: storesOfficerId,
          issuedAt: new Date(),
          itItemId: data.itItemId,
        },
      });

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantityInStock: { decrement: data.quantity } },
      });
      await tx.stockBatch.update({
        where: { id: data.stockBatchId },
        data: { quantity: { decrement: data.quantity } },
      });

      const stockIssued = await tx.stockIssued.create({
        data: {
          requisitionId: requisitionId,
          stockBatchId: data.stockBatchId,
          itItemId: data.itItemId,
          quantityIssued: data.quantity,
          requestDate: requisition.createdAt,
          issuedById: storesOfficerId,
          issueDate: new Date(),
          disbursementNote: data.disbursementNote,
          remarks: data.remarks,
        },
      });

      let inventoryId: string | undefined;
      if (itItem.itemClass === 'FIXED_ASSET') {
        const stockReceived = await tx.stockReceived.findUnique({ where: { id: stockBatch.stockReceivedId } });
        const inventory = await tx.inventory.create({
          data: {
            assetId: `ASSET-${Date.now()}-${requisition.requisitionID}`,
            itItemId: data.itItemId,
            stockReceivedId: stockReceived?.id || 'unknown',
            userId: requisition.staffId,
            departmentId: requisition.departmentId,
            unitId: requisition.unitId,
            warrantyPeriod: itItem.defaultWarranty || 0,
            purchaseDate: stockReceived?.createdAt || new Date(),
            status: 'ACTIVE',
            statusChangedAt: new Date(),
          },
        });
        inventoryId = inventory.id;

        if (data.deviceDetails) {
          switch (itItem.deviceType) {
            case 'LAPTOP':
              await tx.laptopDetails.create({ data: { inventoryId, ...data.deviceDetails } });
              break;
            case 'DESKTOP':
              await tx.desktopDetails.create({ data: { inventoryId, ...data.deviceDetails } });
              break;
            case 'PRINTER':
              await tx.printerDetails.create({ data: { inventoryId, ...data.deviceDetails } });
              break;
            case 'UPS':
              await tx.uPSDetails.create({ data: { inventoryId, ...data.deviceDetails } });
              break;
            case 'OTHER':
              await tx.otherDetails.create({ data: { inventoryId, ...data.deviceDetails } });
              break;
          }
        }
      }

      const newState: Prisma.JsonObject = {
        status: updatedRequisition.status,
        issuedById: updatedRequisition.issuedById,
        issuedAt: updatedRequisition.issuedAt.toISOString(),
        itItemId: updatedRequisition.itItemId,
      };

      const auditPayload: ExtendedAuditPayload = {
        actionType: 'REQUISITION_PROCESSED',
        performedById: storesOfficerId,
        affectedUserId: requisition.staffId,
        entityType: 'Requisition',
        entityId: requisitionId,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: {
          itItemId: data.itItemId,
          quantity: data.quantity,
          itemClass: itItem.itemClass,
          inventoryId,
          emailsQueued: { submitter: false, storesOfficer: false },
        },
      };

      // // Notify submitter
      // try {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: requisition.staff.email,
      //       subject: `Requisition ${requisition.requisitionID} Processed`,
      //       html: `
      //         <p>Hello ${requisition.staff.name},</p>
      //         <p>Your requisition (${requisition.requisitionID}) has been processed and issued.</p>
      //         <p>Item: ${itItem.brand} ${itItem.model} (Qty: ${data.quantity})</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailsQueued.submitter = true;
      // } catch (error) {
      //   console.error(`Failed to queue email for ${requisition.staff.email}:`, error.message);
      //   auditPayload.details.emailsQueued.submitter = false;
      // }

      // // Notify stores officer
      // try {
      //   await this.emailQueue.add(
      //     'send-email',
      //     {
      //       to: storesOfficer.email,
      //       subject: `Requisition ${requisition.requisitionID} Issued`,
      //       html: `
      //         <p>Hello ${storesOfficer.name},</p>
      //         <p>You have successfully issued requisition (${requisition.requisitionID}).</p>
      //         <p>Item: ${itItem.brand} ${itItem.model} (Qty: ${data.quantity})</p>
      //         <p>Thanks,<br>ISW Team</p>
      //       `,
      //     },
      //     { attempts: 3, backoff: 5000 },
      //   );
      //   auditPayload.details.emailsQueued.storesOfficer = true;
      // } catch (error) {
      //   console.error(`Failed to queue email for ${storesOfficer.email}:`, error.message);
      //   auditPayload.details.emailsQueued.storesOfficer = false;
      // }

      await this.auditService.logAction(auditPayload, tx);

      // if (!auditPayload.details.emailsQueued.submitter || !auditPayload.details.emailsQueued.storesOfficer) {
      //   throw new BadRequestException(`Requisition ${requisitionId} processed, but one or more emails failed to queue`);
      // }

      return { message: `Requisition ${requisitionId} processed and emails queued`, inventoryId };
    });
  }

   // fetch available stock batches
   async getAvailableStockBatches(itItemId?: string) {
    return this.prisma.stockBatch.findMany({
      where: {
        deletedAt: null,
        quantity: { gt: 0 },
        ...(itItemId && {
          stockReceived: {
            itItemId: itItemId, 
          },
        }),
      },
      include: {
        stockReceived: {
          select: {
            itItem: { select: { id: true, brand: true, model: true } },
            lpoReference: true,
            dateReceived: true,
          },
        },
      },
      orderBy: { stockReceived: { dateReceived: 'desc' } },
    });
  }

  // fetch available IT items
  async getAvailableITItems() {
    return this.prisma.iTItem.findMany({
      where: {
        deletedAt: null,
        stock: { quantityInStock: { gt: 0 } },
      },
      select: {
        id: true,
        itemID: true,
        deviceType: true,
        itemClass: true,
        brand: true,
        model: true,
        stock: { select: { quantityInStock: true } },
      },
      orderBy: { brand: 'asc' },
    });
  }

  // Create Stock Received
  async createStockReceived(
    storesOfficerId: string,
    dto: CreateStockReceivedDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const itItem = await tx.iTItem.findUnique({ where: { id: dto.itItemId } });
      if (!itItem) throw new NotFoundException(`ITItem ${dto.itItemId} not found`);

      const supplier = await tx.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw new NotFoundException(`Supplier ${dto.supplierId} not found`);

      const stockReceived = await tx.stockReceived.create({
        data: {
          lpoReference: dto.lpoReference,
          voucherNumber: dto.voucherNumber,
          lpoDate: new Date(dto.lpoDate),
          itItemId: dto.itItemId,
          quantityReceived: dto.quantityReceived,
          supplierId: dto.supplierId,
          warrantyPeriod: dto.warrantyPeriod,
          receivedById: storesOfficerId,
          dateReceived: new Date(dto.dateReceived),
          remarks: dto.remarks,
        },
      });

      const stockBatch = await tx.stockBatch.create({
        data: {
          stockReceivedId: stockReceived.id,
          quantity: dto.quantityReceived,
          warrantyPeriod: dto.warrantyPeriod,
          expiryDate: dto.warrantyPeriod ? new Date(Date.now() + dto.warrantyPeriod * 30 * 24 * 60 * 60 * 1000) : undefined,
        },
      });

      const stock = await tx.stock.upsert({
        where: { itItemId: dto.itItemId },
        update: { quantityInStock: { increment: dto.quantityReceived } },
        create: { itItemId: dto.itItemId, quantityInStock: dto.quantityReceived },
      });

      const newState: Prisma.JsonObject = {
        lpoReference: stockReceived.lpoReference,
        voucherNumber: stockReceived.voucherNumber,
        itItemId: stockReceived.itItemId,
        quantityReceived: stockReceived.quantityReceived,
      };

      const auditPayload: AuditPayload = {
        actionType: 'STOCK_RECEIVED',
        performedById: storesOfficerId,
        affectedUserId: storesOfficerId,
        entityType: 'StockReceived',
        entityId: stockReceived.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { stockBatchId: stockBatch.id },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `Stock received for ${itItem.brand} ${itItem.model}`, stockReceivedId: stockReceived.id };
    });
  }

  //Get Suppliers
  async getSuppliers() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        supplierID: true,
        name: true,
        contactDetails: true,
        lpoReference: true,
        lpoDate: true,
        voucherNumber: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}