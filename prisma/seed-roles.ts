// import { PrismaClient } from '@prisma/client';
// import * as bcrypt from 'bcrypt';

// const prisma = new PrismaClient();

// async function main() {
//   // Create an Admin role
//   const adminRole = await prisma.role.create({
//     data: {
//       name: 'Admin',
//     },
//   });

//   // Create Permissions
//   const maintenancePermission = await prisma.permission.create({
//     data: {
//       resource: 'maintenance',
//       actions: ['read', 'create', 'update', 'delete'],
//     },
//   });

//   // Link Role to Permissions
//   await prisma.rolePermission.create({
//     data: {
//       roleId: adminRole.id,
//       permissionId: maintenancePermission.id,
//     },
//   });

//   // Create an Admin user
//   const passwordHash = await bcrypt.hash('password123', 10);
//   const adminUser = await prisma.user.create({
//     data: {
//       staffId: '1152334',
//       name: 'Admin User',
//       email: 'admin@example.com',
//       password: passwordHash,
//     },
//   });

//   // Assign the Admin role to the user
//   await prisma.userRole.create({
//     data: {
//       userId: adminUser.id,
//       roleId: adminRole.id,
//     },
//   });

//   console.log('Seed data inserted!');
// }

// main()
//   .catch((e) => console.error(e))
//   .finally(async () => await prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Define roles
  const roles = ['admin', 'supervisor', 'user', 'stores_officer', 'inventory_officer', 'hardware_technician','itd_approver','dept_approver'];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  // Define permissions
  const permissions = [
    { resource: 'admin', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'hardware', actions: ['read', 'create', 'update'] },
    { resource: 'inventory', actions: ['read', 'create', 'update'] },
    { resource: 'stores', actions: ['read', 'create','update'] },
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

  // Assign permissions to roles
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

  console.log('Roles and permissions seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
