import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // If no roles are required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new ForbiddenException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token); // Decode JWT

    const userRoles = decoded.roles; // Extract roles from the token

    const hasRole = userRoles.some(role => requiredRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
