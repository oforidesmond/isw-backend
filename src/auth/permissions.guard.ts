import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<{ resource: string; actions: string[] }[]>('permissions', context.getHandler());
    if (!requiredPermissions) return true; 

    const request = context.switchToHttp().getRequest<{
      user: {
        id: string;
        staffId: string;
        roles: string[];
        permissions: { resource: string; actions: string[] }[];
        mustResetPassword: boolean;
      };
    }>();
    const user = request.user;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Not authenticated or no permissions found');
    }

    return requiredPermissions.every((requiredPermission) =>
      user.permissions.some(
        (perm) =>
          perm.resource === requiredPermission.resource &&
          requiredPermission.actions.every((action) => perm.actions.includes(action)),
      ),
    );
  }
}