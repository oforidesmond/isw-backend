import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create an Admin role
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
    },
  });

  // Create Permissions
  const maintenancePermission = await prisma.permission.create({
    data: {
      resource: 'maintenance',
      actions: ['read', 'create', 'update', 'delete'],
    },
  });

  // Link Role to Permissions
  await prisma.rolePermission.create({
    data: {
      roleId: adminRole.id,
      permissionId: maintenancePermission.id,
    },
  });

  // Create an Admin user
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: passwordHash,
    },
  });

  // Assign the Admin role to the user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('Seed data inserted!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
