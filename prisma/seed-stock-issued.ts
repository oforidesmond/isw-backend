import { PrismaClient, ItemClass, InventoryStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const stockIssued = [
    {
      requisitionID: 'REQ-2025-001',
      itItemId: 'IT-001',
      quantityIssued: 1,
      requestDate: new Date('2025-02-23'),
      issuedByStaffId: '005', // Steve
      issueDate: new Date('2025-02-25'),
      disbursementNote: 'Issued to supervisor workstation',
      remarks: 'Desktop delivered to Room 202',
    },
    {
      requisitionID: 'REQ-2025-002',
      itItemId: 'IT-002',
      quantityIssued: 1,
      requestDate: new Date('2025-02-24'),
      issuedByStaffId: '005', // Steve
      issueDate: new Date('2025-02-26'),
      disbursementNote: 'Issued to technician for replacement',
      remarks: 'Laptop delivered to Tech Lab',
    },
    {
      requisitionID: 'REQ-2025-003',
      itItemId: 'IT-004',
      quantityIssued: 2,
      requestDate: new Date('2025-02-25'),
      issuedByStaffId: '005', // Steve
      issueDate: new Date('2025-02-27'),
      disbursementNote: 'Issued toner as alternative to printer',
      remarks: 'Consumable for warehouse printers',
    },
  ];

  await prisma.iTItem.upsert({
    where: { itemID: 'IT-004' },
    update: {},
    create: {
      itemID: 'IT-004',
      deviceType: "OTHER",
      itemClass: ItemClass.CONSUMABLE,
      brand: 'Brother',
      model: 'TN-760',
      defaultWarranty: 0,
      supplierId: (await prisma.supplier.findUnique({ where: { supplierID: 'SUP-001' } })).id,
    },
  });

  for (const stock of stockIssued) {
    const requisition = await prisma.requisition.findUnique({ where: { requisitionID: stock.requisitionID } });
    const itItem = await prisma.iTItem.findUnique({ where: { itemID: stock.itItemId } });
    const issuedBy = await prisma.user.findUnique({ where: { staffId: stock.issuedByStaffId } });
    const stockReceived = await prisma.stockReceived.findFirst({ where: { itItemId: itItem.id } });

    if (!requisition || !itItem || !issuedBy || !stockReceived) {
      console.error(`Missing data for StockIssued from requisition ${stock.requisitionID}`);
      continue;
    }

    const stockBatch = await prisma.stockBatch.findUnique({ where: { stockReceivedId: stockReceived.id } });
    if (!stockBatch) {
      console.error(`No StockBatch found for ${stock.itItemId} in requisition ${stock.requisitionID}`);
      continue;
    }

    const issued = await prisma.stockIssued.upsert({
      where: { requisitionId_itItemId: { requisitionId: stock.requisitionID, itItemId: itItem.id } },
      update: {
        quantityIssued: stock.quantityIssued,
        issueDate: stock.issueDate,
        disbursementNote: stock.disbursementNote,
        remarks: stock.remarks,
      },
      create: {
        requisition: { connect: { id: requisition.id } },
        stockBatch: { connect: { id: stockBatch.id } },
        itItem: { connect: { id: itItem.id } },
        quantityIssued: stock.quantityIssued,
        requestDate: stock.requestDate,
        issuedBy: { connect: { id: issuedBy.id } },
        issueDate: stock.issueDate,
        disbursementNote: stock.disbursementNote,
        remarks: stock.remarks,
      },
    });

    if (itItem.itemClass === ItemClass.FIXED_ASSET) {
      const user = await prisma.user.findUnique({ where: { id: requisition.staffId } });
      const department = await prisma.department.findUnique({ where: { id: requisition.departmentId } });
      const unit = requisition.unitId ? await prisma.unit.findUnique({ where: { id: requisition.unitId } }) : null;

      if (!user || !department) {
        console.error(`Missing user or department for Inventory from ${stock.requisitionID}`);
        continue;
      }

      await prisma.inventory.upsert({
        where: { assetId: `AST-${crypto.randomBytes(4).toString('hex').toUpperCase()}` },
        update: {},
        create: {
          assetId: `AST-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          itItem: { connect: { id: itItem.id } },
          stockReceived: { connect: { id: stockReceived.id } },
          user: { connect: { id: user.id } },
          department: { connect: { id: department.id } },
          unit: unit ? { connect: { id: unit.id } } : undefined,
          lpoReference: stockReceived.lpoReference,
          supplier: { connect: { id: stockReceived.supplierId } },
          warrantyPeriod: stockReceived.warrantyPeriod,
          purchaseDate: stockReceived.lpoDate,
          status: InventoryStatus.ACTIVE, // Changed from ACTIVE to IN_USE
          remarks: stock.remarks,
        },
      });
    }

    console.log(`StockIssued for requisition ${stock.requisitionID}, item ${stock.itItemId} seeded.`);
  }

  console.log('StockIssued data seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });