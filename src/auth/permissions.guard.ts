import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<{ resource: string; actions: string[] }[]>('permissions', context.getHandler());
    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest<{ user: { id: string; permissions?: { resource: string; actions: string[] }[] } }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const userPermissions = await this.getUserPermissions(user.id);
    request.user.permissions = userPermissions;

    return requiredPermissions.every((requiredPermission) =>
      userPermissions.some(
        (perm) =>
          perm.resource === requiredPermission.resource &&
          requiredPermission.actions.every((action) => perm.actions.includes(action)),
      ),
    );
  }

  private async getUserPermissions(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const permissions = new Set<{ resource: string; actions: string[] }>();
    for (const userRole of roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add({
          resource: rolePermission.permission.resource,
          actions: rolePermission.permission.actions,
        });
      }
    }
    return Array.from(permissions);
  }
}