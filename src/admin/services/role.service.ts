import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { AuditService } from 'audit/audit.service';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { CreateRoleDto } from 'admin/dto/create-role.dto';

@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  //Get all ROles with their permissions
  async getAllRoles() {
    return this.prisma.role.findMany({
      where: { deletedAt: null }, // Only active roles
      select: {
        id: true,
        name: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                resource: true,
                actions: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

   // Get all permissions
   async getAllPermissions(includeRoles: boolean = false) {
    return this.prisma.permission.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        resource: true,
        actions: true,
        ...(includeRoles && {
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            where: { role: { deletedAt: null } }, 
          },
        })
      },
      orderBy: {
        resource: 'asc',
      },
    });
  }

  //Create Role
  async createRole(data: CreateRoleDto, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Check if role name already exists
      const existingRole = await tx.role.findUnique({ where: { name: data.name } });
      if (existingRole && !existingRole.deletedAt) {
        throw new BadRequestException(`Role with name "${data.name}" already exists`);
      }
  
      // Create the role
      const newRole = await tx.role.create({
        data: { name: data.name },
      });
  
      // Assign permissions if provided
      if (data.permissions && data.permissions.length > 0) {
        // Verify all permissions exist and are active
        const permissions = await tx.permission.findMany({
          where: { id: { in: data.permissions }, deletedAt: null },
        });
        if (permissions.length !== data.permissions.length) {
          throw new BadRequestException('One or more permission IDs are invalid or deleted');
        }
  
        const permissionData = data.permissions.map(permissionId => ({
          roleId: newRole.id,
          permissionId,
        }));
        await tx.rolePermission.createMany({ data: permissionData });
      }
  
      // Fetch the role with permissions for audit
      const createdRole = await tx.role.findUnique({
        where: { id: newRole.id },
        include: { permissions: true },
      });
  
      // Log the action
      const newState: Prisma.JsonObject = {
        name: createdRole.name,
        permissions: createdRole.permissions.map(p => p.permissionId),
      };
  
      const auditPayload: AuditPayload = {
        actionType: 'ROLE_CREATED',
        performedById: adminId,
        affectedUserId: null, // No user affected
        entityType: 'Role',
        entityId: newRole.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { permissionsAssigned: data.permissions?.length > 0 },
      };
  
      await this.auditService.logAction(auditPayload, tx);
  
      return { message: `Role ${data.name} created successfully`, roleId: newRole.id };
    });
  }
  
  //Update the permissions of a Role
  async updateRolePermissions(roleId: string, permissionIds: string[], adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });
      if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);
      if (role.deletedAt) throw new BadRequestException(`Role with ID ${roleId} is deleted`);

      const oldState: Prisma.JsonObject = {
        name: role.name,
        permissions: role.permissions.map(p => p.permissionId),
      };

      // Delete existing permissions
      await tx.rolePermission.deleteMany({ where: { roleId } });

      // Add new permissions
      if (permissionIds.length > 0) {
        const permissionData = permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        }));
        await tx.rolePermission.createMany({ data: permissionData });
      }

      const updatedRole = await tx.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });

      const newState: Prisma.JsonObject = {
        name: updatedRole.name,
        permissions: updatedRole.permissions.map(p => p.permissionId),
      };

      const auditPayload: AuditPayload = {
        actionType: 'ROLE_MODIFIED',
        performedById: adminId,
        affectedUserId: null,
        entityType: 'Role',
        entityId: roleId,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { permissionsUpdated: true },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `Permissions for role ${role.name} updated successfully` };
    });
  }
}