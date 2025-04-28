import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditPayload } from "admin/interfaces/audit-payload.interface";
import { AuditService } from "audit/audit.service";
import { PrismaService } from "prisma/prisma.service";
import { CreateSupplierDto } from "stores-officer/dto/create-stock-received.dto";

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createSupplier(adminId: string, dto: CreateSupplierDto, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {

      // Generate Supplier Id
      const sequenceResult = await tx.$queryRaw<{ nextval: bigint }[]>( 
        Prisma.sql`SELECT nextval('add_supplier_seq')`
      );
      const sequenceNumber = sequenceResult[0].nextval;
      const supplierId = `SUP-${String(sequenceNumber).padStart(6, '0')}`;

      let LpoDate: Date | null = null;

      if (dto.lpoDate) { 
        const parsedDate = new Date(dto.lpoDate);
        if (!isNaN(parsedDate.getTime())) {
          LpoDate = parsedDate;
        } else {
           console.warn(`Invalid date format received for lpoDate: ${dto.lpoDate}`);
           LpoDate = null;
        }
      }
      const supplier = await tx.supplier.create({
        data: {
          supplierID: supplierId,
          name: dto.name,
          contactDetails: dto.contactDetails,
          lpoReference: dto.lpoReference ?? null,
          lpoDate:LpoDate,
          voucherNumber: dto.voucherNumber ?? null,
          remarks: dto.remarks ?? null,
        },
      });

      const newState: Prisma.JsonObject = {
        supplierID: supplier.supplierID,
        name: supplier.name,
        lpoReference: supplier.lpoReference,
        lpoDate: supplier.lpoDate ? supplier.lpoDate.toISOString() : null,
        voucherNumber: supplier.voucherNumber,
      };

      const auditPayload: AuditPayload = {
        actionType: 'SUPPLIER_CREATED',
        performedById: adminId,
        affectedUserId: adminId,
        entityType: 'Supplier',
        entityId: supplier.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: {},
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `Supplier ${supplier.supplierID} created`, supplierId: supplier.id };
    });
  }

  //Get all suppliers
  async getSuppliers() {
    return this.prisma.supplier.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        supplierID: true,
        name: true,
        contactDetails: true,
        lpoReference: true,
        lpoDate: true,
        voucherNumber: true,
        remarks: true
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Soft delete a supplier
  async softDeleteSupplier(
    supplierId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find the supplier
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
      }

      if (supplier.deletedAt) {
        throw new BadRequestException(`Supplier with ID ${supplierId} is already deleted`);
      }

      // delete the supplier
      await tx.supplier.update({
        where: { id: supplierId },
        data: { deletedAt: new Date() },
      });

      // Prepare audit log
      const oldState: Prisma.JsonObject = {
        supplierID: supplier.supplierID,
        name: supplier.name,
        lpoReference: supplier.lpoReference,
        lpoDate: supplier.lpoDate ? supplier.lpoDate.toISOString() : null,
        voucherNumber: supplier.voucherNumber,
      };

      const auditPayload: AuditPayload = {
        actionType: 'SUPPLIER_DELETED',
        performedById: adminId,
        affectedUserId: null,
        entityType: 'Supplier',
        entityId: supplier.id,
        oldState,
        newState: null,
        ipAddress,
        userAgent,
        details: { softDelete: true },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `Supplier ${supplier.supplierID} soft-deleted successfully` };
    });
  }

}