import { PrismaClient, IssueType, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Define test maintenance tickets
  const maintenanceTickets = [
    {
      ticketId: 'TKT-001',
      assetId: 'AST-001', // Sam's desktop from StockIssued
      technicianReceivedByEmail: 'hank.technician@example.com', // Hank
      userEmail: 'sam.supervisor@example.com', // Sam reported it
      issueType: IssueType.HARDWARE,
      departmentName: 'IT',
      unitName: 'Inventory',
      description: 'Desktop won’t boot—possible power supply failure',
      priority: Priority.HIGH,
      actionTaken: 'Replaced power supply',
      technicianReturnedByEmail: 'hank.technician@example.com', // Hank returned it
      dateLogged: new Date('2025-02-26'),
      dateResolved: new Date('2025-02-28'),
      remarks: 'Returned in working condition',
    },
    {
      ticketId: 'TKT-002',
      assetId: 'AST-002', // Hank's laptop from StockIssued
      technicianReceivedByEmail: 'hank.technician@example.com', // Hank
      userEmail: 'hank.technician@example.com', // Hank reported his own issue
      issueType: IssueType.SOFTWARE,
      departmentName: 'IT',
      unitName: 'Hardware',
      description: 'Laptop crashes during diagnostics—software conflict',
      priority: Priority.MEDIUM,
      actionTaken: null, // In progress
      technicianReturnedByEmail: null, // Not returned yet
      dateLogged: new Date('2025-02-27'),
      dateResolved: null, // Still open
      remarks: 'Awaiting software update',
    },
    {
      ticketId: 'TKT-003',
      assetId: 'AST-001', // Sam's desktop again
      technicianReceivedByEmail: 'hank.technician@example.com', // Hank
      userEmail: 'sam.supervisor@example.com', // Sam
      issueType: IssueType.HARDWARE,
      departmentName: 'IT',
      unitName: 'Inventory',
      description: 'Routine maintenance check requested',
      priority: Priority.LOW,
      actionTaken: null, // Not started
      technicianReturnedByEmail: null, // Not returned
      dateLogged: new Date('2025-03-01'),
      dateResolved: null, // Still open
      remarks: 'Scheduled for next week',
    },
  ];

  for (const ticket of maintenanceTickets) {
    // Find related records
    const inventory = await prisma.inventory.findUnique({ where: { assetId: ticket.assetId } });
    const technicianReceived = await prisma.user.findUnique({ where: { email: ticket.technicianReceivedByEmail } });
    const user = await prisma.user.findUnique({ where: { email: ticket.userEmail } });
    const department = await prisma.department.findUnique({ where: { name: ticket.departmentName } });
    const unit = ticket.unitName ? await prisma.unit.findUnique({ where: { name: ticket.unitName } }) : null;
    const technicianReturned = ticket.technicianReturnedByEmail
      ? await prisma.user.findUnique({ where: { email: ticket.technicianReturnedByEmail } })
      : null;

    // Validation
    if (!inventory || !technicianReceived || !user || !department) {
      console.error(`Missing data for MaintenanceTicket ${ticket.ticketId}`);
      continue;
    }

    // Create or update maintenance ticket
    await prisma.maintenanceTicket.upsert({
      where: { ticketId: ticket.ticketId },
      update: {},
      create: {
        ticketId: ticket.ticketId,
        inventory: { connect: { id: inventory.id } },
        technicianReceived: { connect: { id: technicianReceived.id } },
        user: { connect: { id: user.id } },
        issueType: ticket.issueType,
        department: { connect: { id: department.id } },
        unit: unit ? { connect: { id: unit.id } } : undefined,
        description: ticket.description,
        priority: ticket.priority,
        actionTaken: ticket.actionTaken,
        technicianReturned: technicianReturned ? { connect: { id: technicianReturned.id } } : undefined,
        dateLogged: ticket.dateLogged,
        dateResolved: ticket.dateResolved,
        remarks: ticket.remarks,
      },
    });

    console.log(`MaintenanceTicket ${ticket.ticketId} seeded successfully.`);
  }

  console.log('MaintenanceTickets seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });