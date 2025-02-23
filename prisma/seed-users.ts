import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Define test departments (if not already seeded)
  const departments = [
    { name: 'it' },
    { name: 'finance' },
    { name: 'legal' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    });
  }

  // Define test units (if not already seeded)
  const units = [
    { name: 'network', departmentName: 'it' },
    { name: 'hardware', departmentName: 'it' },
    { name: 'inventory', departmentName: 'it' },
    { name: 'ip', departmentName: 'legal' },
    { name: 'tax', departmentName: 'finance' },

  ];

  for (const unit of units) {
    const department = await prisma.department.findUnique({
      where: { name: unit.departmentName },
    });

    if (!department) {
      console.error(`Department "${unit.departmentName}" not found for unit "${unit.name}"`);
      continue;
    }

 await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: {
        name: unit.name,
        department: { connect: { id: department.id } }, // Connect to existing department
      },
    });
  }

  // Define test users with roles, departments, units, and room numbers
  const testUsers = [
    {
      staffId: '001',
      name: 'Alice Admin',
      email: 'alice.admin@example.com',
      roleName: 'admin',
      departmentName: 'it',
      unitName: 'network',
      roomNo: '110',
    },
    {
      staffId: '002',
      name: 'Sam Supervisor',
      email: 'sam.supervisor@example.com',
      roleName: 'supervisor',
      departmentName: 'finance',
      unitName: 'tax',
      roomNo: '202',
    },
    {
      staffId: '003',
      name: 'Hank Technician',
      email: 'hank.technician@example.com',
      roleName: 'hardware_technician',
      departmentName: 'it',
      unitName: 'hardware',
      roomNo: '122',
    },
    {
      staffId: '004',
      name: 'Ivy Officer',
      email: 'ivy.officer@example.com',
      roleName: 'inventory_officer',
      departmentName: 'it',
      unitName: 'inventory',
      roomNo: '203',
    },
    {
      staffId: '005',
      name: 'Steve staff',
      email: 'steve.stores@example.com',
      roleName: 'user',
      departmentName: 'finance',
      unitName: 'tax',
      roomNo: '504',
    },
    {
      staffId: '006',
      name: 'Uma User',
      email: 'uma.user@example.com',
      roleName: 'user',
      departmentName: 'legal',
      unitName: 'ip',
      roomNo: '402',
    },
    {
      staffId: '007',
      name: 'Dan DeptApprover',
      email: 'dan.dept@example.com',
      roleName: 'dept_approver',
      departmentName: 'finance',
      unitName: 'tax',
      roomNo: '510',
    },
    {
      staffId: '008',
      name: 'Tina ITDApprover',
      email: 'tina.itd@example.com',
      roleName: 'itd_approver',
      departmentName: 'it',
      unitName: 'hardware',
      roomNo: '204',
    },
  ];

  for (const userData of testUsers) {
    // Generate random password
    const randomPassword = crypto.randomBytes(5).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Find department and unit
    const department = await prisma.department.findUnique({ where: { name: userData.departmentName } });
    const unit = await prisma.unit.findUnique({ where: { name: userData.unitName } });

    // Find role
    const role = await prisma.role.findUnique({ where: { name: userData.roleName } });

    if (!role) {
      console.error(`Role "${userData.roleName}" not found for ${userData.email}`);
      continue;
    }
    if (!department) {
      console.error(`Department "${userData.departmentName}" not found for ${userData.email}`);
      continue;
    }
    if (!unit) {
      console.error(`Unit "${userData.unitName}" not found for ${userData.email}`);
      continue;
    }

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        staffId: userData.staffId,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        mustResetPassword: true,
        roomNo: userData.roomNo,
        department: { connect: { id: department.id } },
        unit: { connect: { id: unit.id } },
      },
    });

    // Assign role to user (avoid duplicates)
    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: role.id },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    console.log(`User ${userData.email} created with password: ${randomPassword}`);
  }

  console.log('Test users seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });