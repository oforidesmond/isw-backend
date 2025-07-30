import { PrismaClient, InventoryStatus, DeviceType, ItemClass } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Seed Suppliers
  const suppliers = [
    { supplierID: 'SUP-001', name: 'TechCorp', contactDetails: 'techcorp@example.com', lpoReference: 'GCB/PD/FA/2/001', lpoDate: new Date('2023-01-15'), voucherNumber: '0005453', remarks: 'Primary hardware supplier' },
    { supplierID: 'SUP-002', name: 'GearSupply', contactDetails: 'gearsupply@example.com', lpoReference: 'GCB/PD/FA/2/002', lpoDate: new Date('2023-02-10'), voucherNumber: '0005454', remarks: 'Laptop supplier' },
  ];

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { supplierID: supplier.supplierID },
      update: {},
      create: supplier,
    });
  }

  // Seed ITItems
  const itItems = [
    { itemID: 'IT-001', deviceType: DeviceType.DESKTOP, itemClass: ItemClass.FIXED_ASSET, brand: 'Dell', model: 'OptiPlex 7080', defaultWarranty: 36, supplierId: suppliers[0].supplierID },
    { itemID: 'IT-002', deviceType: DeviceType.LAPTOP, itemClass: ItemClass.FIXED_ASSET, brand: 'HP', model: 'EliteBook 840 G8', defaultWarranty: 24, supplierId: suppliers[1].supplierID },
    { itemID: 'IT-003', deviceType: DeviceType.PRINTER, itemClass: ItemClass.FIXED_ASSET, brand: 'Brother', model: 'HL-L2350DW', defaultWarranty: 12, supplierId: suppliers[0].supplierID },
  ];

  for (const item of itItems) {
    const supplier = await prisma.supplier.findUnique({ where: { supplierID: item.supplierId } });
    if (!supplier) continue;

    await prisma.iTItem.upsert({
      where: { itemID: item.itemID },
      update: {},
      create: {
        itemID: item.itemID,
        deviceType: item.deviceType,
        itemClass: item.itemClass,
        brand: item.brand,
        model: item.model,
        defaultWarranty: item.defaultWarranty,
        supplier: { connect: { id: supplier.id } },
      },
    });
  }

  // Seed StockReceived
  const stockReceived = [
    { lpoReference: 'GCB/PD/FA/2/001', voucherNumber: '0005453', lpoDate: new Date('2023-01-20'), itItemId: 'IT-001', quantityReceived: 5, supplierId: 'SUP-001', warrantyPeriod: 36, receivedByEmail: 'steve.stores@example.com', dateReceived: new Date('2023-01-25'), remarks: 'Batch of desktops' },
    { 
      lpoReference: 'GCB/PD/FA/2/001',
      voucherNumber: '0005453',
      lpoDate: new Date('2023-01-20'), 
      itItemId: 'IT-003',
      quantityReceived: 3, 
      supplierId: 'SUP-001', 
      warrantyPeriod: 12, 
      receivedByEmail: 'steve.stores@example.com', 
      dateReceived: new Date('2023-01-25'), 
      remarks: 'Batch of printers'
    },
    { lpoReference: 'GCB/PD/FA/2/002', voucherNumber: '0005454', lpoDate: new Date('2023-02-15'), itItemId: 'IT-002', quantityReceived: 3, supplierId: 'SUP-002', warrantyPeriod: 24, receivedByEmail: 'steve.stores@example.com', dateReceived: new Date('2023-02-20'), remarks: 'Batch of laptops' },
  ];

  for (const stock of stockReceived) {
    const itItem = await prisma.iTItem.findUnique({ where: { itemID: stock.itItemId } });
    const supplier = await prisma.supplier.findUnique({ where: { supplierID: stock.supplierId } });
    const receivedBy = await prisma.user.findUnique({ where: { email: stock.receivedByEmail } });
  
    if (!itItem || !supplier || !receivedBy) {
      console.error(`Missing data for StockReceived: LPO ${stock.lpoReference}, Item ${stock.itItemId}`);
      continue;
    }
  
    await prisma.stockReceived.upsert({
      where: { 
        lpoReference_voucherNumber_itItemId: { 
          lpoReference: stock.lpoReference, 
          voucherNumber: stock.voucherNumber, 
          itItemId: itItem.id 
        } 
      },
      update: {},
      create: {
        lpoReference: stock.lpoReference,
        voucherNumber: stock.voucherNumber,
        lpoDate: stock.lpoDate,
        itItem: { connect: { id: itItem.id } },
        quantityReceived: stock.quantityReceived,
        supplier: { connect: { id: supplier.id } },
        warrantyPeriod: stock.warrantyPeriod,
        receivedBy: { connect: { id: receivedBy.id } },
        dateReceived: stock.dateReceived,
        remarks: stock.remarks,
      },
    });
  }

  // Seed Stock and StockBatch
  const stockItems = [
    { itItemId: 'IT-001', quantityInStock: 5 },
    { itItemId: 'IT-002', quantityInStock: 3 },
    { itItemId: 'IT-003', quantityInStock: 3 },
  ];

  for (const stock of stockItems) {
    const itItem = await prisma.iTItem.findUnique({ where: { itemID: stock.itItemId } });
    if (!itItem) continue;

    const stockReceived = await prisma.stockReceived.findFirst({ where: { itItemId: itItem.id } });
    if (!stockReceived) continue;

    const stockRecord = await prisma.stock.upsert({
      where: { itItemId: stock.itItemId },
      update: {},
      create: {
        itItem: { connect: { id: itItem.id } },
        quantityInStock: stock.quantityInStock,
      },
    });

    await prisma.stockBatch.upsert({
      where: { stockReceivedId: stockReceived.id },
      update: {},
      create: {
        stockReceived: { connect: { id: stockReceived.id } },
        quantity: stock.quantityInStock,
        warrantyPeriod: stockReceived.warrantyPeriod,
      },
    });
  }

//   // Seed Inventory with Device Details
//   const inventoryItems = [
//     {
//       assetId: 'AST-001',
//       itItemId: 'IT-001',
//       stockReceivedLpo: 'GCB/PD/FA/2/001',
//       userEmail: 'sam.supervisor@example.com',
//       departmentName: 'finance',
//       unitName: 'tax',
//       lpoReference: 'GCB/PD/FA/2/001',
//       supplierId: 'SUP-001',
//       warrantyPeriod: 36,
//       purchaseDate: new Date('2023-01-20'),
//       status: InventoryStatus.ACTIVE,
//       remarks: 'Assigned to supervisor',
//       desktopDetails: {
//         desktopBrand: 'Dell',
//         desktopModel: 'OptiPlex 7080',
//         desktopSerialNumber: 'DSK-001',
//         desktopMonitorBrand: 'Dell',
//         desktopMonitorModel: 'U2419H',
//         desktopMonitorSerialNumber: 'MON-001',
//         desktopMacAddress: '00:14:22:01:23:45',
//         desktopProcessorType: 'Intel i7',
//         desktopMemorySize: '16GB',
//         desktopStorageDriveType: 'SSD',
//         desktopStorageDriveSize: '512GB',
//         desktopOperatingSystem: 'Windows 11',
//         desktopEndpointSecurity: true,
//         desktopSpiceworksMonitoring: true,
//       },
//     },
//     {
//       assetId: 'AST-002',
//       itItemId: 'IT-002',
//       stockReceivedLpo: 'GCB/PD/FA/2/002',
//       userEmail: 'hank.technician@example.com',
//       departmentName: 'it',
//       unitName: 'hardware',
//       lpoReference: 'GCB/PD/FA/2/002',
//       supplierId: 'SUP-002',
//       warrantyPeriod: 24,
//       purchaseDate: new Date('2023-02-15'),
//       status: InventoryStatus.ACTIVE,
//       remarks: 'Technician laptop',
//       laptopDetails: {
//         laptopBrand: 'HP',
//         laptopModel: 'EliteBook 840 G8',
//         laptopSerialNumber: 'LAP-001',
//         laptopMacAddress: '00:16:17:01:23:46',
//         laptopProcessorType: 'Intel i5',
//         laptopMemorySize: '8GB',
//         laptopStorageDriveType: 'SSD',
//         laptopStorageDriveSize: '256GB',
//         laptopOperatingSystem: 'Windows 10',
//         laptopEndpointSecurity: true,
//         laptopSpiceworksMonitoring: true,
//       },
//     },
//   ];

//   for (const item of inventoryItems) {
//     const itItem = await prisma.iTItem.findUnique({ where: { itemID: item.itItemId } });
//     const stockReceived = await prisma.stockReceived.findFirst({ where: { lpoReference: item.stockReceivedLpo } });
//     const user = await prisma.user.findUnique({ where: { email: item.userEmail } });
//     const department = await prisma.department.findUnique({ where: { name: item.departmentName } });
//     const unit = await prisma.unit.findUnique({ where: { name: item.unitName } });
//     const supplier = await prisma.supplier.findUnique({ where: { supplierID: item.supplierId } });

//     if (!itItem || !stockReceived || !user || !department || !supplier) {
//       console.error(`Missing data for inventory item ${item.assetId}`);
//       continue;
//     }

//     const inventory = await prisma.inventory.upsert({
//       where: { assetId: item.assetId },
//       update: {},
//       create: {
//         assetId: item.assetId,
//         itItem: { connect: { id: itItem.id } },
//         stockReceived: { connect: { id: stockReceived.id } },
//         user: { connect: { id: user.id } },
//         department: { connect: { id: department.id } },
//         unit: unit ? { connect: { id: unit.id } } : undefined,
//         lpoReference: item.lpoReference,
//         supplier: { connect: { id: supplier.id } },
//         warrantyPeriod: item.warrantyPeriod,
//         purchaseDate: item.purchaseDate,
//         status: item.status,
//         remarks: item.remarks,
//       },
//     });

//     if (item.desktopDetails) {
//       await prisma.desktopDetails.upsert({
//         where: { inventoryId: inventory.id },
//         update: {},
//         create: {
//           inventory: { connect: { id: inventory.id } },
//           ...item.desktopDetails,
//         },
//       });
//     } else if (item.laptopDetails) {
//       await prisma.laptopDetails.upsert({
//         where: { inventoryId: inventory.id },
//         update: {},
//         create: {
//           inventory: { connect: { id: inventory.id } },
//           ...item.laptopDetails,
//         },
//       });
//     }
//   }

  console.log('ISeed data for StoresOfficerService testing added.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });