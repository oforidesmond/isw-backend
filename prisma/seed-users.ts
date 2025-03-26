import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed roles
  const roles = [
    'admin',
    'supervisor',
    'user',
    'stores_officer',
    'inventory_officer',
    'hardware_technician',
    'itd_approver',
    'dept_approver',
  ];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  // 2. Seed permissions
  const permissions = [
    { resource: 'admin', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'hardware', actions: ['read', 'create', 'update'] },
    { resource: 'inventory', actions: ['read', 'create', 'update'] },
    { resource: 'stores', actions: ['read', 'create', 'update'] },
    { resource: 'user', actions: ['read', 'create'] },
    { resource: 'dept_approver', actions: ['approve', 'decline'] },
    { resource: 'itd_approver', actions: ['approve', 'decline'] },
    { resource: 'supervisor', actions: ['read'] },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { resource: perm.resource },
      update: {},
      create: { resource: perm.resource, actions: perm.actions },
    });
  }

  // 3. Assign permissions to roles
  const rolePermissions = {
    admin: ['admin'],
    supervisor: ['supervisor'],
    hardware_technician: ['hardware'],
    inventory_officer: ['inventory'],
    itd_approver: ['itd_approver'],
    dept_approver: ['dept_approver'],
    stores_officer: ['stores'],
    user: ['user'],
  };

  for (const [roleName, permissionResources] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });

    for (const resource of permissionResources) {
      const permission = await prisma.permission.findUnique({ where: { resource } });

      if (role && permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }

  // 4. Seed departments
  const departments = [
    { name: 'it', deptApproverStaffId: '008' },
    { name: 'finance', deptApproverStaffId: '007' },
    { name: 'legal', deptApproverStaffId: null },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    });
  }

  // 5. Seed units
  const units = [
    { name: 'network', departmentName: 'it' },
    { name: 'hardware', departmentName: 'it' },
    { name: 'inventory', departmentName: 'it' },
    { name: 'ip', departmentName: 'legal' },
    { name: 'tax', departmentName: 'finance' },
  ];

  for (const unit of units) {
    const department = await prisma.department.findUnique({ where: { name: unit.departmentName } });
    if (!department) {
      console.error(`Department "${unit.departmentName}" not found for unit "${unit.name}"`);
      continue;
    }

    await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: {
        name: unit.name,
        department: { connect: { id: department.id } },
      },
    });
  }

  // 6. Seed users
  const testUsers = [
    {
      staffId: '001',
      name: 'Alice Admin',
      email: 'oforidesmond@rocketmail.com',
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
      name: 'Steve Staff',
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
      email: 'ads21b00206y@ait.edu.gh',
      roleName: 'itd_approver',
      departmentName: 'it',
      unitName: 'hardware',
      roomNo: '204',
    },
  ];

  for (const userData of testUsers) {
    const randomPassword = crypto.randomBytes(5).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const department = await prisma.department.findUnique({ where: { name: userData.departmentName } });
    const unit = await prisma.unit.findUnique({ where: { name: userData.unitName } });
    const role = await prisma.role.findUnique({ where: { name: userData.roleName } });

    if (!role || !department || !unit) {
      console.error(`Missing data for ${userData.staffId}`);
      continue;
    }

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

    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: role.id },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id } as Prisma.UserRoleUncheckedCreateInput,
      });
    }

    console.log(`User ${userData.email} created with password: ${randomPassword}`);
  }

  // 7. Update departments with approvers
  for (const dept of departments) {
    const approver = dept.deptApproverStaffId
      ? await prisma.user.findUnique({ where: { staffId: dept.deptApproverStaffId } })
      : null;

    await prisma.department.update({
      where: { name: dept.name },
      data: {
        deptApproverId: approver?.id || null,
      },
    });
  }

  console.log('Roles, permissions, departments, units, and users seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });