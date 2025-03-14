import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { AuditService } from 'audit/audit.service';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';

@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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