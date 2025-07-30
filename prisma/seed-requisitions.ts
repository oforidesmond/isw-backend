import { PrismaClient, RequisitionStatus, Urgency } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const staff = {
    sam: await prisma.user.findUnique({ where: { email: 'sam.supervisor@example.com' } }),
    hank: await prisma.user.findUnique({ where: { email: 'hank.technician@example.com' } }),
    ivy: await prisma.user.findUnique({ where: { email: 'ivy.officer@example.com' } }),
  };
  const approvers = {
    dan: await prisma.user.findUnique({ where: { email: 'dan.dept@example.com' } }),
    tina: await prisma.user.findUnique({ where: { email: 'tina.itd@example.com' } }),
  };
  const departments = {
    finance: await prisma.department.findUnique({ where: { name: 'finance' } }),
    legal: await prisma.department.findUnique({ where: { name: 'legal' } }),
    it: await prisma.department.findUnique({ where: { name: 'it' } }),
  };
  const units = {
    inventory: await prisma.unit.findUnique({ where: { name: 'inventory' } }),
    hardware: await prisma.unit.findUnique({ where: { name: 'hardware' } }),
    tax: await prisma.unit.findUnique({ where: { name: 'tax' } }),
  };

 for (const [key, user] of Object.entries(staff)) {
  if (!user) console.error(`Staff user ${key} not found`);
}
for (const [key, user] of Object.entries(approvers)) {
  if (!user) console.error(`Approver ${key} not found`);
}
for (const [key, dept] of Object.entries(departments)) {
  if (!dept) console.error(`Department ${key} not found`);
}
for (const [key, unit] of Object.entries(units)) {
  if (!unit) console.error(`Unit ${key} not found`);
}
  const requisitions = [
    {
      requisitionID: 'REQ-2025-001',
      staffId: staff.sam?.id,
      itemDescription: 'Hp deskjet 3000 desktop with a magic keyboard',
      quantity: 1,
      urgency: Urgency.MEDIUM,
      purpose: 'Upgrade supervisor workstation',
      departmentId: departments.finance?.id,
      unitId: units.tax?.id,
      roomNo: '202',
      deptApproverId: approvers.dan?.id,
      itdApproverId: approvers.tina?.id,
      status: RequisitionStatus.APPROVED,
      approvalSignatures: { dept: 'Dan DeptApprover', itd: 'Tina ITDApprover' },
    },
    {
      requisitionID: 'REQ-2025-002',
      staffId: staff.hank?.id,
      itemDescription: 'Replacement IPads for technicians',
      quantity: 4,
      urgency: Urgency.HIGH,
      purpose: 'Current work tablets are faulty so need new ones for work',
      departmentId: departments.it?.id,
      unitId: units.hardware?.id,
      roomNo: '122',
      deptApproverId: approvers.dan?.id,
      itdApproverId: approvers.tina?.id,
      status: RequisitionStatus.SUBMITTED,
    },
    {
      requisitionID: 'REQ-2025-003',
      staffId: staff.ivy?.id,
      itemDescription: 'Printers for inventory office',
      quantity: 2,
      urgency: Urgency.LOW,
      purpose: 'Additional printers for stock records',
      departmentId: departments.it?.id,
      unitId: units.inventory?.id,
      roomNo: '203',
      deptApproverId: approvers.dan?.id,
      itdApproverId: approvers.tina?.id,
      status: RequisitionStatus.DECLINED,
      declineReason: 'Budget constraints',
    },
  ];

  for (const req of requisitions) {

    await prisma.requisition.upsert({
      where: { requisitionID: req.requisitionID },
      update: {},
      create: {
        requisitionID: req.requisitionID,
        staff: { connect: { id: req.staffId } },
        itemDescription: req.itemDescription,
        quantity: req.quantity,
        urgency: req.urgency,
        purpose: req.purpose,
        department: { connect: { id: req.departmentId } },
        unit:  req.unitId ? { connect: { id: req.unitId  } } : undefined,
        roomNo: req.roomNo,
        deptApprover: req.deptApproverId ? { connect: { id: req.deptApproverId } } : undefined,
        itdApprover: req.itdApproverId ? { connect: { id: req.itdApproverId } } : undefined,
        status: req.status,
        declineReason: req.declineReason,
        approvalSignatures: req.approvalSignatures ? JSON.stringify(req.approvalSignatures) : undefined,
        createdAt: new Date(),
      },
    });

    console.log(`Requisition ${req.requisitionID} seeded successfully.`);
  }

  console.log('Requisitions seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });