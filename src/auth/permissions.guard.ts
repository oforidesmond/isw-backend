import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService,
    private prisma: PrismaService,) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const requiredPermissions = this.reflector.get<{ resource: string; actions: string[] }[]>('permissions', context.getHandler());
      if (!requiredPermissions) return true; // No restrictions, allow access
  
      const request = context.switchToHttp().getRequest<Request>();
      const user = request.user;
  
      if (!user) {
        throw new ForbiddenException('Not authenticated');
      }
  
      // Fetch user's permissions from the database
      const userPermissions = await this.getUserPermissions(user.id);
  
      // Attach fetched permissions to the request for further use
      request.user.permissions = userPermissions;
  
      // Validate if the user has the required permissions
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