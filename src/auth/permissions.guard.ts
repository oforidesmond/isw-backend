import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<{ resource: string; actions: string[] }[]>('permissions', context.getHandler());
    if (!requiredPermissions) return true; // No restrictions

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    return requiredPermissions.every((requiredPermission) =>
      user.permissions.some(
        (userPermission) =>
          userPermission.resource === requiredPermission.resource &&
          requiredPermission.actions.every((action) => userPermission.actions.includes(action))
      )
    );
  }
}
