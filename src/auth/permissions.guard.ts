import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<{ resource: string; action: string }>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No specific permission required
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new ForbiddenException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token); // Decode JWT

    const userPermissions = decoded.permissions; // Extract permissions from the token

    const hasPermission = userPermissions.some(
      (perm) =>
        perm.resource === requiredPermission.resource &&
        perm.actions.includes(requiredPermission.action),
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}