import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { AuditService } from 'audit/audit.service';
import { Queue } from 'bull';
import { PrismaService } from 'prisma/prisma.service';
import { CreateStockReceivedDto, StockLevelsFilterDto } from './dto/create-stock-received.dto';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    itItemId?: string;
    quantity: number;
    itemClass: string;
    inventoryId?: string;
    emailsQueued: {
      submitter: boolean;
      storesOfficer: boolean;
      acknowledgmentPrompt: boolean;
    };
  };
}

@Injectable()
export class StoresOfficerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

   async getStockLevels(filters: StockLevelsFilterDto) {
    const { brand, model, deviceType, minQuantity, maxQuantity} = filters;
    // if (page < 1 || limit < 1) {
    //   throw new BadRequestException('Page and limit must be positive integers');
    // }
    // const skip = (page - 1) * limit;

    // Build the where clause for filtering
     const where: Prisma.StockWhereInput = {
      deletedAt: { equals: null }, 
     itItem: {
        is: {
          deletedAt: { equals: null },
          ...(brand && { brand: { contains: brand, mode: "insensitive" } }),
          ...(model && { model: { contains: model, mode: "insensitive" } }),
          ...(deviceType && { deviceType: { equals: deviceType } }),
        },
      },
      ...(minQuantity !== undefined && { quantityInStock: { gte: minQuantity } }),
      ...(maxQuantity !== undefined && { quantityInStock: { lte: maxQuantity } }),
    };

    const [stockLevels, total, totalStockQuantity] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        include: {
          itItem: {
            select: {
              id: true,
              itemID: true,
              brand: true,
              model: true,
              deviceType: true,
              itemClass: true,
            },
          },
        },
        // skip,
        // take: limit,
        orderBy: { itItem: { brand: "asc" } },
      }),
      this.prisma.stock.count({ where }),
      this.prisma.stock.aggregate({
        where,
        _sum: {
          quantityInStock: true,
        },
      }),
    ]);

    // Format response
    const formattedData = stockLevels.map((stock) => ({
      itItemId: stock.itItemId,
      itemID: stock.itItem.itemID,
      brand: stock.itItem.brand,
      model: stock.itItem.model,
      deviceType: stock.itItem.deviceType,
      itemClass: stock.itItem.itemClass,
      quantityInStock: stock.quantityInStock,
    }));

    return {
      data: formattedData,
      meta: {
        total,
        totalStockQuantity: totalStockQuantity._sum.quantityInStock || 0,
        // page,
        // limit,
        totalPages: Math.ceil(total),
      },
    };
  }

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

  async getAllStockReceived() {
    // const skip = (page - 1) * limit;

    const [stockReceived, total] = await Promise.all([
      this.prisma.stockReceived.findMany({
        // skip,
        // take: limit,
        orderBy: { dateReceived: 'desc' },
        include: {
          itItem: { select: { brand: true, model: true } },
          supplier: { select: { name: true } },
          receivedBy: { select: { name: true } },
        },
      }),
      this.prisma.stockReceived.count(),
    ]);

    return {
      data: stockReceived,
      // meta: {
      //   total,
      //   page,
      //   limit,
      //   totalPages: Math.ceil(total / limit),
      // },
    };
  }

  async issueRequisition(
    requisitionId: string,
    storesOfficerId: string,
    data: {
      itItemId: string;
      quantity: number;
      stockBatchId: string;
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

    const itItem = await tx.iTItem.findUnique({ 
      where: { id: data.itItemId },
      select: { id: true, itemClass: true, deviceType: true, defaultWarranty: true, specifications: true, brand: true, model: true } 
    });
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

      const deviceDetails = itItem.specifications as Record<string, any> | null;
      if (deviceDetails && Object.keys(deviceDetails).length > 0) {
        switch (itItem.deviceType) {
          case 'LAPTOP':
            await tx.laptopDetails.create({ data: { inventoryId, ...deviceDetails } });
            break;
          case 'DESKTOP':
            await tx.desktopDetails.create({ data: { inventoryId, ...deviceDetails } });
            break;
          case 'PRINTER':
            await tx.printerDetails.create({ data: { inventoryId, ...deviceDetails } });
            break;
          case 'UPS':
            await tx.uPSDetails.create({ data: { inventoryId, ...deviceDetails } });
            break;
          case 'OTHER':
            await tx.otherDetails.create({ data: { inventoryId, ...deviceDetails } });
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
        emailsQueued: { submitter: false, storesOfficer: false, acknowledgmentPrompt: false },
      },
    };

    // Notify submitter
    try {
      await this.emailQueue.add(
        'send-email',
        {
          to: requisition.staff.email,
          subject: `Requisition ${requisition.requisitionID} Processed - Acknowledge Receipt`,
          html: `
            <p>Hello ${requisition.staff.name},</p>
            <p>Your requisition (${requisition.requisitionID}) has been processed and issued.</p>
            <p>Item: ${itItem.brand} ${itItem.model} (Qty: ${data.quantity})</p>
            <p>Please acknowledge receipt of the item(s) in your ISW dashboard to continue making new requisitions.</p>

            <p>Thanks,<br>ISW Team</p>
          `,
        },
        { attempts: 3, backoff: 5000 },
      );
      auditPayload.details.emailsQueued.submitter = true;
      auditPayload.details.emailsQueued.acknowledgmentPrompt = true;

    } catch (error) {
      console.error(`Failed to queue email for ${requisition.staff.email}:`, error.message);
      auditPayload.details.emailsQueued.submitter = false;
      auditPayload.details.emailsQueued.acknowledgmentPrompt = false;
    }

    // Notify stores officer
    try {
      await this.emailQueue.add(
        'send-email',
        {
          to: storesOfficer.email,
          subject: `Requisition ${requisition.requisitionID} Issued`,
          html: `
            <p>Hello ${storesOfficer.name},</p>
            <p>You have successfully issued requisition (${requisition.requisitionID}).</p>
            <p>Item: ${itItem.brand} ${itItem.model} (Qty: ${data.quantity})</p>
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

    await this.auditService.logAction(auditPayload, tx);

    if (!auditPayload.details.emailsQueued.submitter || !auditPayload.details.emailsQueued.storesOfficer) {
      throw new BadRequestException(`Requisition ${requisitionId} processed, but one or more emails failed to queue`);
    }

    return { message: `Requisition ${requisitionId} processed and emails queued`, inventoryId, stockIssuedId: stockIssued.id };
  });
};

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
        specifications: true,
        stock: { select: { quantityInStock: true } },
      },
      orderBy: { brand: 'asc' },
    });
  }

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

 async generateReport(
  reportType: string,
  filters: {
    startDate?: string;
    endDate?: string;
    itemClass?: string;
    deviceType?: string;
    status?: string;
    reqStatus?: string;
    itItemId?: string;
    brand?: string;
    model?: string;
    supplierId?: string;
    lpoReference?: string;
    voucherNumber?: string;
    departmentId?: string;
    minQuantity?: number;
    maxQuantity?: number;
  },
) {
  const validReportTypes = ['stock_received', 'stock_issued', 'requisitions', 'inventory', 'stock_levels'];
  if (!validReportTypes.includes(reportType)) {
    throw new BadRequestException(`Invalid report type. Must be one of: ${validReportTypes.join(', ')}`);
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

  if (filters.minQuantity !== undefined && (isNaN(filters.minQuantity) || filters.minQuantity < 0)) {
    throw new BadRequestException('minQuantity must be a non-negative number');
  }
  if (filters.maxQuantity !== undefined && (isNaN(filters.maxQuantity) || filters.maxQuantity < 0)) {
    throw new BadRequestException('maxQuantity must be a non-negative number');
  }
  if (
    filters.minQuantity !== undefined &&
    filters.maxQuantity !== undefined &&
    filters.minQuantity > filters.maxQuantity
  ) {
    throw new BadRequestException('minQuantity must not exceed maxQuantity');
  }

  const where: any = { deletedAt: null };
  if (filters.itItemId) where.itItemId = filters.itItemId;
  if (filters.itemClass) where.itItem = { ...where.itItem, itemClass: filters.itemClass };
  if (filters.deviceType) where.itItem = { ...where.itItem, deviceType: filters.deviceType };
  if (filters.brand) where.itItem = { ...where.itItem, brand: { contains: filters.brand, mode: 'insensitive' } };
  if (filters.model) where.itItem = { ...where.itItem, model: { contains: filters.model, mode: 'insensitive' } };
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.lpoReference) where.lpoReference = { contains: filters.lpoReference, mode: 'insensitive' };
  if (filters.voucherNumber) where.voucherNumber = { contains: filters.voucherNumber, mode: 'insensitive' };
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.minQuantity !== undefined) where.quantityInStock = { gte: filters.minQuantity };
  if (filters.maxQuantity !== undefined)
    where.quantityInStock = { ...where.quantityInStock, lte: filters.maxQuantity };

  let data: any;
  let total: number;

  switch (reportType) {
    case 'stock_received':
      [data, total] = await Promise.all([
        this.prisma.stockReceived.findMany({
          where: {
            ...where,
            ...(filters.startDate && { dateReceived: { gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { dateReceived: { lte: new Date(filters.endDate) } }),
            ...(filters.lpoReference && { lpoReference: { contains: filters.lpoReference, mode: 'insensitive' } }),
            ...(filters.voucherNumber && {
              voucherNumber: { contains: filters.voucherNumber, mode: 'insensitive' },
            }),
            ...(filters.supplierId && { supplierId: filters.supplierId }),
          },
          include: {
            itItem: { select: { brand: true, model: true, itemClass: true, deviceType: true } },
            supplier: { select: { name: true, supplierID: true } },
            receivedBy: { select: { name: true } },
          },
          orderBy: { dateReceived: 'desc' },
        }),
        this.prisma.stockReceived.count({ where }),
      ]);
      break;

    case 'stock_issued':
      [data, total] = await Promise.all([
        this.prisma.stockIssued.findMany({
          where: {
            ...where,
            ...(filters.startDate && { issueDate: { gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { issueDate: { lte: new Date(filters.endDate) } }),
            ...(filters.departmentId && { requisition: { departmentId: filters.departmentId } }),
          },
          include: {
            itItem: { select: { brand: true, model: true, itemClass: true, deviceType: true } },
            issuedBy: { select: { name: true } },
            requisition: {
              select: {
                staff: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
            stockBatch: {
              select: {
                stockReceived: {
                  select: {
                    lpoReference: true,
                    voucherNumber: true,
                    supplier: { select: { name: true, supplierID: true } },
                  },
                },
              },
            },
          },
          orderBy: { issueDate: 'desc' },
        }),
        this.prisma.stockIssued.count({ where }),
      ]);
      break;

    case 'requisitions':
      [data, total] = await Promise.all([
        this.prisma.requisition.findMany({
          where: {
            ...where,
            ...(filters.startDate && { createdAt: { gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { createdAt: { lte: new Date(filters.endDate) } }),
            ...(filters.reqStatus && { status: filters.reqStatus }),
            ...(filters.departmentId && { departmentId: filters.departmentId }),
          },
          include: {
            itItem: { select: { brand: true, model: true, itemClass: true, deviceType: true } },
            staff: { select: { name: true, email: true } },
            issuedBy: { select: { name: true } },
            department: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.requisition.count({ where }),
      ]);
      break;

    case 'inventory':
      [data, total] = await Promise.all([
        this.prisma.inventory.findMany({
          where: {
            ...where,
            ...(filters.startDate && { createdAt: { gte: new Date(filters.startDate) } }),
            ...(filters.endDate && { createdAt: { lte: new Date(filters.endDate) } }),
            ...(filters.status && { status: filters.status }),
            ...(filters.departmentId && { departmentId: filters.departmentId }),
            ...(filters.supplierId && { supplierId: filters.supplierId }),
          },
          include: {
            itItem: { select: { brand: true, model: true, itemClass: true, deviceType: true } },
            user: { select: { name: true } },
            department: { select: { name: true } },
            supplier: { select: { name: true, supplierID: true } },
            stockReceived: {
              select: { lpoReference: true, voucherNumber: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.inventory.count({ where }),
      ]);
      break;

    case 'stock_levels':
      [data, total] = await Promise.all([
        this.prisma.stock.findMany({
          where: {
            ...where,
            ...(filters.supplierId && { itItem: { ...where.itItem, supplierId: filters.supplierId } }),
          },
          include: {
            itItem: {
              select: {
                brand: true,
                model: true,
                itemClass: true,
                deviceType: true,
                itemID: true,
                supplier: { select: { name: true, supplierID: true } },
              },
            },
          },
          orderBy: { itItem: { brand: 'asc' } },
        }),
        this.prisma.stock.count({ where }),
      ]);
      break;

    default:
      throw new BadRequestException('Unsupported report type');
  }

  if (reportType === 'stock_levels') {
    data = data.map((stock) => ({
      itItemId: stock.itItemId,
      itemID: stock.itItem.itemID,
      brand: stock.itItem.brand,
      model: stock.itItem.model,
      deviceType: stock.itItem.deviceType,
      itemClass: stock.itItem.itemClass,
      quantityInStock: stock.quantityInStock,
      supplier: stock.itItem.supplier ? { name: stock.itItem.supplier.name, supplierID: stock.itItem.supplier.supplierID } : null,
    }));
  }

  if (reportType === 'stock_issued') {
    data = data.map((item) => ({
      ...item,
      supplier: item.stockBatch?.stockReceived?.supplier
        ? { name: item.stockBatch.stockReceived.supplier.name, supplierID: item.stockBatch.stockReceived.supplier.supplierID }
        : null,
      lpoReference: item.stockBatch?.stockReceived?.lpoReference || null,
      voucherNumber: item.stockBatch?.stockReceived?.voucherNumber || null,
      department: item.requisition?.department ? { name: item.requisition.department.name } : null,
    }));
  }

  if (reportType === 'inventory') {
    data = data.map((item) => ({
      ...item,
      supplier: item.supplier ? { name: item.supplier.name, supplierID: item.supplier.supplierID } : null,
      lpoReference: item.stockReceived?.lpoReference || null,
      voucherNumber: item.stockReceived?.voucherNumber || null,
    }));
  }

  return {
    reportType,
    filters,
    data,
    meta: { totalRecords: total, generatedAt: new Date().toISOString() },
    };
  }
}